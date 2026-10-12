import { validSession } from "./direct-social.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const gql = value => JSON.stringify(String(value ?? ""));
const videoKey = key => /\.(?:mp4|webm|m4v|mov)$/i.test(String(key || ""));
const origin = env => String(env.BTMEDYA_PUBLIC_ORIGIN || "https://btmedya.com.tr").replace(/\/$/, "");

const PLATFORM_ALIASES = Object.freeze({
  instagram: "instagram", "instagram-post": "instagram", "instagram-reel": "instagram", "instagram-story": "instagram",
  facebook: "facebook", "facebook-post": "facebook", "facebook-reel": "facebook", "facebook-story": "facebook",
  tiktok: "tiktok", youtube: "youtube", "youtube-short": "youtube"
});

function serviceName(value) {
  return String(value || "").toLowerCase().replace(/[_\s]+/g, "-").replace(/^twitter$/, "x");
}

export async function bufferGraphQL(env, query) {
  if (!String(env.BUFFER_API_KEY || "").trim()) throw new Error("BUFFER_API_KEY yapılandırılmamış");
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + String(env.BUFFER_API_KEY)
    },
    body: JSON.stringify({ query })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Buffer API HTTP " + response.status);
  if (Array.isArray(payload.errors) && payload.errors.length) {
    throw new Error(clean(payload.errors.map(error => error?.message || "GraphQL hatası").join("; "), 1200));
  }
  if (!payload.data) throw new Error("Buffer API beklenen veri yanıtını vermedi");
  return payload.data;
}

export async function bufferSnapshot(env) {
  // Request only fields documented in Buffer's current public schema.
  const accountData = await bufferGraphQL(env, `query BTMEDYAAccount {
    account { id organizations { id name } }
  }`);
  const account = accountData.account;
  if (!account) throw new Error("Buffer hesabı okunamadı");
  const organizations = Array.isArray(account.organizations) ? account.organizations : [];
  const expanded = await Promise.all(organizations.map(async organization => {
    const data = await bufferGraphQL(env, `query BTMEDYAChannels {
      channels(input: { organizationId: ${gql(organization.id)} }) {
        id name service
      }
    }`);
    const channels = Array.isArray(data.channels) ? data.channels : [];
    return {
      id: String(organization.id),
      name: String(organization.name || "Buffer çalışma alanı"),
      channelCount: channels.length,
      channels: channels.map(channel => ({
        id: String(channel.id),
        name: String(channel.name || channel.service || "Sosyal kanal"),
        service: serviceName(channel.service),
        avatar: "",
        paused: false
      }))
    };
  }));
  return {
    account: { id: String(account.id || ""), name: "Buffer hesabı" },
    organizations: expanded
  };
}

async function ensureBufferTable(env) {
  if (!env.DB) throw new Error("D1 veritabanı yapılandırılmamış");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_buffer_deliveries (
    id TEXT PRIMARY KEY,
    local_post_id TEXT NOT NULL DEFAULT '',
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL DEFAULT '',
    service TEXT NOT NULL DEFAULT '',
    buffer_post_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    scheduled_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitting',
    last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(local_post_id, channel_id)
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_social_buffer_status_time ON social_buffer_deliveries(status, scheduled_at)").run().catch(() => {});
}

function mediaUrl(env, key) {
  const value = clean(key, 1000);
  if (!value) return "";
  const root = origin(env);
  const pathParts = value.split("/").map(part => encodeURIComponent(part)).join("/");
  if (value.startsWith("static/")) return root + "/assets/" + value.slice(7).split("/").map(encodeURIComponent).join("/");
  if (value.startsWith("otomasyon/")) return root + "/gorsel/" + pathParts;
  return root + "/pub/" + encodeURIComponent(value);
}

function mutationFor({ title, body, channelId, service, scheduledAt, assetUrl, isVideo }) {
  let asset = "";
  if (assetUrl) {
    const type = isVideo ? "video" : "image";
    const thumbnail = isVideo && (service === "instagram" || service === "tiktok")
      ? " metadata: { thumbnailOffset: 2000 }"
      : "";
    asset = `assets: [{ ${type}: { url: ${gql(assetUrl)}${thumbnail} } }]`;
  }
  let metadata = "";
  if (service === "youtube") {
    metadata = `metadata: { youtube: { title: ${gql(title.slice(0, 100))} categoryId: "25" } }`;
  } else if (service === "instagram" && isVideo) {
    metadata = "metadata: { instagram: { type: reel } }";
  } else if (service === "tiktok" && isVideo) {
    metadata = "metadata: { tiktok: { isAiGenerated: false } }";
  }
  return `mutation BTMEDYASchedulePost {
    createPost(input: {
      text: ${gql(body || title)}
      channelId: ${gql(channelId)}
      schedulingType: automatic
      mode: customScheduled
      dueAt: ${gql(scheduledAt)}
      ${asset}
      ${metadata}
    }) {
      ... on PostActionSuccess { post { id text dueAt } }
      ... on MutationError { message }
    }
  }`;
}

function networkForService(service) {
  const name = serviceName(service);
  if (name.startsWith("instagram")) return "instagram";
  if (name.startsWith("facebook")) return "facebook";
  if (name.startsWith("youtube")) return "youtube";
  if (name.startsWith("tiktok")) return "tiktok";
  return name;
}

export async function queueBufferSocialPost(env, {
  title = "", body = "", platforms = [], channel_ids = [], media_key = "",
  scheduled_at = "", local_post_id = "", format = ""
} = {}) {
  await ensureBufferTable(env);
  if (!String(env.BUFFER_API_KEY || "").trim()) return { ok: false, error: "Buffer API anahtarı eksik (BUFFER_API_KEY)" };

  const cleanTitle = clean(title, 240);
  const cleanBody = clean(body || title, 63206);
  if (!cleanTitle && !cleanBody) return { ok: false, error: "Gönderi başlığı veya metni gerekli" };

  const when = new Date(scheduled_at || Date.now() + 10 * 60 * 1000);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 30000) {
    return { ok: false, error: "Yayın zamanı en az 30 saniye ileride olmalı" };
  }
  const scheduledAt = when.toISOString();
  const key = clean(media_key, 1000);
  const isVideo = videoKey(key);
  const assetUrl = mediaUrl(env, key);
  const requestedNetworks = [...new Set((Array.isArray(platforms) ? platforms : [])
    .map(p => String(p || "").toLowerCase().trim()).filter(p => PLATFORM_ALIASES[p]).map(p => PLATFORM_ALIASES[p]))];
  const requestedIds = [...new Set((Array.isArray(channel_ids) ? channel_ids : []).map(id => clean(id, 200)).filter(Boolean))];
  if (!requestedNetworks.length && !requestedIds.length) return { ok: false, error: "En az bir Buffer kanalı veya sosyal platform seçilmeli" };

  let snapshot;
  try { snapshot = await bufferSnapshot(env); }
  catch (error) { return { ok: false, error: clean(error?.message || error, 1200) }; }
  const allChannels = snapshot.organizations.flatMap(org => org.channels.map(channel => ({ ...channel, organization_id: org.id })));
  const selected = requestedIds.length
    ? allChannels.filter(channel => requestedIds.includes(channel.id))
    : allChannels.filter(channel => requestedNetworks.includes(networkForService(channel.service)));
  if (requestedIds.length && selected.length !== requestedIds.length) {
    return { ok: false, error: "Seçilen Buffer kanallarından biri bu API anahtarına ait çalışma alanında bulunamadı" };
  }
  if (!selected.length) {
    return { ok: false, error: "Seçilen ağlar için Buffer'da bağlı kanal bulunamadı", available: allChannels.map(c => ({ id: c.id, name: c.name, service: c.service })) };
  }
  const channelNetworks = new Set(selected.map(c => networkForService(c.service)));
  const missingNetworks = requestedNetworks.filter(network => !channelNetworks.has(network));
  if (!requestedIds.length && missingNetworks.length) {
    return { ok: false, error: "Buffer'da bağlı olmayan ağ: " + missingNetworks.join(", "), available: allChannels.map(c => ({ id: c.id, name: c.name, service: c.service })) };
  }

  for (const channel of selected) {
    if (channel.paused) return { ok: false, error: `Buffer kuyruğu duraklatılmış: ${channel.name}` };
    if ((channel.service === "instagram" || channel.service === "tiktok" || channel.service === "youtube") && !assetUrl) {
      return { ok: false, error: `${channel.name} için görsel/video gerekli` };
    }
    if (channel.service === "youtube" && !isVideo) return { ok: false, error: "YouTube için MP4/WebM/MOV video gerekli" };
  }

  const now = new Date().toISOString();
  const localId = clean(local_post_id, 120) || crypto.randomUUID();
  const results = [];
  for (const channel of selected) {
    const prior = await env.DB.prepare("SELECT id,buffer_post_id,status FROM social_buffer_deliveries WHERE local_post_id=? AND channel_id=? LIMIT 1")
      .bind(localId, channel.id).first().catch(() => null);
    if (prior && ["submitting", "scheduled", "sent"].includes(String(prior.status))) {
      results.push({ channel_id: channel.id, channel: channel.name, service: channel.service, status: "duplicate-skipped", buffer_post_id: prior.buffer_post_id || "" });
      continue;
    }
    const deliveryId = crypto.randomUUID();
    if (prior?.id) {
      await env.DB.prepare("UPDATE social_buffer_deliveries SET title=?,scheduled_at=?,status='submitting',last_error='',updated_at=? WHERE id=?")
        .bind(cleanTitle, scheduledAt, now, prior.id).run();
    } else {
      await env.DB.prepare("INSERT INTO social_buffer_deliveries(id,local_post_id,channel_id,channel_name,service,title,scheduled_at,status,last_error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .bind(deliveryId, localId, channel.id, channel.name, channel.service, cleanTitle, scheduledAt, "submitting", "", now, now).run();
    }
    const record = prior?.id ? prior.id : deliveryId;
    try {
      const query = mutationFor({
        title: cleanTitle, body: cleanBody, channelId: channel.id, service: networkForService(channel.service),
        scheduledAt, assetUrl, isVideo
      });
      const data = await bufferGraphQL(env, query);
      const result = data.createPost;
      if (!result?.post?.id) throw new Error(clean(result?.message || "Buffer gönderi kimliği vermedi", 1200));
      const updated = new Date().toISOString();
      await env.DB.prepare("UPDATE social_buffer_deliveries SET buffer_post_id=?,status='scheduled',last_error='',updated_at=? WHERE id=?")
        .bind(String(result.post.id), updated, record).run();
      results.push({ channel_id: channel.id, channel: channel.name, service: channel.service, status: "scheduled", buffer_post_id: String(result.post.id), due_at: result.post.dueAt || scheduledAt });
    } catch (error) {
      const message = clean(error?.message || error, 1200);
      await env.DB.prepare("UPDATE social_buffer_deliveries SET status='error',last_error=?,updated_at=? WHERE id=?")
        .bind(message, new Date().toISOString(), record).run().catch(() => {});
      results.push({ channel_id: channel.id, channel: channel.name, service: channel.service, status: "error", error: message });
    }
  }
  const scheduled = results.filter(row => row.status === "scheduled" || row.status === "duplicate-skipped").length;
  const failed = results.filter(row => row.status === "error").length;
  return {
    ok: scheduled > 0 && failed === 0,
    partial: scheduled > 0 && failed > 0,
    queued: results.filter(row => row.status === "scheduled").length,
    skipped: results.filter(row => row.status === "duplicate-skipped").length,
    failed,
    items: results
  };
}

async function statusApi(request, env) {
  if (!(await validSession(request, env))) return json({ ok: false, error: "Yetkisiz" }, 401);
  if (!String(env.BUFFER_API_KEY || "").trim()) {
    return json({ ok: true, configured: false, missing: ["BUFFER_API_KEY"], organizations: [], note: "Buffer ücretsiz planında en fazla 3 kanal ve kanal başına 10 bekleyen gönderi desteklenir; API erişimi plan/kota koşullarına bağlıdır." });
  }
  try {
    const snapshot = await bufferSnapshot(env);
    return json({
      ok: true, configured: true,
      account: snapshot.account,
      organizations: snapshot.organizations.map(org => ({
        id: org.id, name: org.name, channelCount: org.channelCount,
        channels: org.channels.map(channel => ({ id: channel.id, name: channel.name, service: channel.service, paused: channel.paused }))
      })),
      limitations: ["Buffer ücretsiz planı en fazla 3 bağlı kanal ve kanal başına 10 bekleyen planlı gönderi ile sınırlıdır."]
    });
  } catch (error) {
    return json({ ok: false, configured: true, error: clean(error?.message || error, 1200) }, 502);
  }
}

export async function bufferSocialApi(request, env, url) {
  if (!url.pathname.startsWith("/api/social/buffer/")) return null;
  if (url.pathname === "/api/social/buffer/status" && request.method === "GET") return statusApi(request, env);
  if (url.pathname === "/api/social/buffer/schedule" && request.method === "POST") {
    if (!(await validSession(request, env))) return json({ ok: false, error: "Yetkisiz" }, 401);
    const body = await request.json().catch(() => ({}));
    const result = await queueBufferSocialPost(env, {
      title: body.title, body: body.body, media_key: body.media_key,
      scheduled_at: body.scheduled_at, channel_ids: body.channel_ids,
      platforms: body.platforms, local_post_id: body.local_post_id, format: body.format
    });
    return json(result, result.ok ? 201 : result.partial ? 207 : 400);
  }
  return json({ ok: false, error: "Buffer API uç noktası bulunamadı" }, 404);
}
