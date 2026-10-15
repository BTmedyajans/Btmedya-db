import { generateAutopilotImage } from "./autopilot.js";
import { queueDirectSocialPost } from "./direct-social.js";

const nowIso = () => new Date().toISOString();
const clean = (v, n = 1200) => String(v ?? "").trim().slice(0, n);

function norm(value) {
  return String(value || "").toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function jsonArray(value) {
  try { const parsed = JSON.parse(String(value || "[]")); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
function words(value) {
  return [...new Set(norm(value).split(/[^a-z0-9]+/).filter(x => x.length > 3))];
}
function parseObject(value) {
  try { const match = String(value || "").match(/\{[\s\S]*\}/); return match ? JSON.parse(match[0]) : null; }
  catch { return null; }
}

async function ensureTables(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS client_trend_seen (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, source_url TEXT NOT NULL, trend_title TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0, content_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, UNIQUE(client_id, source_url))").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_client_trend_seen_client_date ON client_trend_seen(client_id, created_at)").run();
}

function relevance(client, strategy, trackedQueries, item) {
  const headline = norm(String(item.title || "") + " " + String(item.excerpt || ""));
  const queryTerms = [...new Set(trackedQueries.flatMap(words))];
  const sectorTerms = words(client.sector);
  const pillarTerms = words(jsonArray(strategy?.content_pillars_json).join(" "));
  const queryMatches = queryTerms.filter(term => headline.includes(term)).length;
  const sectorMatches = sectorTerms.filter(term => headline.includes(term)).length;
  const pillarMatches = pillarTerms.filter(term => headline.includes(term)).length;
  let score = Math.min(40, queryMatches * 8) + Math.min(20, sectorMatches * 7) + Math.min(12, pillarMatches * 4);
  score += Math.min(20, Math.round(Number(item.score || 0) / 4));
  const age = Date.parse(item.first_seen_at || item.updated_at || "");
  if (Number.isFinite(age)) {
    const hours = Math.max(0, (Date.now() - age) / 3600000);
    score += hours < 2 ? 8 : hours < 8 ? 5 : hours < 24 ? 2 : 0;
  }
  if (queryTerms.length && queryMatches === 0 && sectorMatches === 0 && pillarMatches === 0) score = 0;
  if (!queryTerms.length && !sectorTerms.length && !pillarTerms.length) score = 0;
  return Math.min(100, score);
}

async function makeDraft(env, client, strategy, item, score, trackedQueries) {
  const pillars = jsonArray(strategy?.content_pillars_json);
  let visualRules = {};
  let publishingRules = {};
  let template = {};
  try { visualRules = JSON.parse(String(strategy?.visual_rules_json || "{}")) || {}; } catch {}
  try { publishingRules = JSON.parse(String(strategy?.publishing_rules_json || "{}")) || {}; } catch {}
  try { template = JSON.parse(String(strategy?.ai_template_json || "{}")) || {}; } catch {}

  if (!env.AI) return { ok: false, reason: "Workers AI bağlantısı yok" };
  const brief = [
    "BTMEDYA müşteri trend radarından gelen sinyali özgün, marka uyumlu bir sosyal medya fikrine dönüştür.",
    "Kaynak metni kopyalama. Trendin doğrulanmamış iddialarını gerçek gibi sunma. Müşterinin yaptığı bir işi, kampanyayı, fiyatı veya sonucu asla uydurma.",
    "Sinyal yalnızca içerik açısı bulmak içindir. Müşteri sektörüne anlamlı biçimde bağlanamıyorsa relevant=false döndür.",
    "Yalnız JSON döndür: relevant, title, caption, creative_brief, cta, hashtags.",
    "Müşteri: " + clean(client.name, 160),
    "Sektör: " + clean(client.sector, 160),
    "Marka dili: " + clean(client.brand_voice, 900),
    "Konumlandırma: " + clean(strategy?.positioning, 900),
    "İçerik sütunları: " + JSON.stringify(pillars),
    "Görsel kuralları: " + JSON.stringify(visualRules),
    "Yayın kuralları: " + JSON.stringify(publishingRules),
    "AI şablonu: " + JSON.stringify(template),
    "İzlenen sorgular: " + JSON.stringify(trackedQueries),
    "Trend başlığı: " + clean(item.title, 300),
    "Kaynak özeti: " + clean(item.excerpt, 1000),
    "Kaynak: " + clean(item.source_url, 1500),
    "Kategori: " + clean(item.category, 80),
    "Trend puanı: " + score,
    "Caption 1-3 kısa paragraf, doğal Türkçe, gereksiz sansasyon yok. 3-6 ilgili hashtag üret."
  ].join("\n");

  let generated;
  try {
    const out = await env.AI.run("@cf/openai/gpt-oss-120b", {
      messages: [
        { role: "system", content: "Yalnızca geçerli JSON döndür. Gerçek dışı bilgi ekleme. Müşterinin marka diline sadık kal." },
        { role: "user", content: brief }
      ],
      max_tokens: 1000,
      temperature: 0.35
    });
    generated = parseObject(out?.response || out?.output_text);
  } catch (error) {
    return { ok: false, reason: "AI taslak üretimi başarısız: " + clean(error?.message, 180) };
  }
  if (!generated || generated.relevant === false) return { ok: false, reason: "Trend müşteri sektörüne yeterince uygun değil" };

  const title = clean(generated.title || item.title, 240);
  const caption = clean(generated.caption, 5000);
  const creativeBrief = clean(generated.creative_brief, 1600);
  if (!title || !caption || !creativeBrief) return { ok: false, reason: "AI yanıtında zorunlu alan eksik" };

  let mediaKey = "";
  if (env.MEDIA && creativeBrief) {
    const image = await generateAutopilotImage(env, {
      category: clean(client.sector || "Müşteri İçeriği", 80),
      title: client.name + " - " + title,
      prompt: [
        "Create a polished, original social-media visual for a Turkish business.",
        "No text, no letters, no watermark, no fake logo, no fabricated product packaging.",
        "Use a clean editorial composition, clear subject, professional lighting, mobile-first 4:5 composition.",
        "Brand visual direction: " + clean(client.brand_voice, 400),
        "Visual rules: " + JSON.stringify(visualRules).slice(0, 700),
        "Creative brief: " + creativeBrief
      ].join("\n")
    }).catch(() => ({ ok: false }));
    if (image?.ok && image.key) mediaKey = image.key;
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const approvalRequired = strategy?.approval_required !== 0;
  const hashtags = Array.isArray(generated.hashtags) ? generated.hashtags.map(x => clean(x, 80)).filter(Boolean).slice(0, 8) : [];
  const body = JSON.stringify({
    caption,
    creative_brief: creativeBrief,
    cta: clean(generated.cta, 500),
    hashtags,
    trend_source: { title: item.title, url: item.source_url, publisher: item.source_name, score }
  });
  const preview = {
    platform: "instagram",
    type: "social",
    title,
    caption,
    hashtags,
    creative_brief: creativeBrief,
    ai: true,
    trend_radar: true,
    trend_source: { title: item.title, url: item.source_url, publisher: item.source_name, score, first_seen_at: item.first_seen_at },
    approval_required: approvalRequired,
    autopublish_enabled: strategy?.autopublish_enabled === 1
  };
  await env.DB.prepare("INSERT INTO client_content(id,client_id,title,content_type,engine,brief,body,media_key,preview_json,status,client_approved,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(id, client.id, title, "social", "btmedya-trend-radar", brief.slice(0, 3000), body, mediaKey, JSON.stringify(preview), "draft", 0, null, now, now).run();

  await env.DB.prepare("INSERT OR IGNORE INTO client_trend_seen(id,client_id,source_url,trend_title,score,content_id,created_at) VALUES(?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), client.id, item.source_url, clean(item.title, 300), score, id, now).run();

  let delivery = { queued: 0, reason: "Müşteri onayı gerekli veya otomatik yayın kapalı." };
  if (!approvalRequired && strategy?.autopublish_enabled === 1 && mediaKey) {
    const connected = await env.DB.prepare("SELECT provider FROM social_direct_connections WHERE workspace_type='client' AND workspace_id=? AND status='active' AND provider IN ('facebook','instagram')").bind(client.id).all().catch(() => ({ results: [] }));
    const platforms = [...new Set((connected.results || []).map(x => x.provider).filter(x => x === "facebook" || x === "instagram"))];
    if (platforms.length) {
      delivery = await queueDirectSocialPost(env, {
        title,
        body: [caption, hashtags.join(" ")].filter(Boolean).join("\n\n"),
        mediaKey,
        sourceSlug: "client-trend:" + client.id + ":" + id,
        platforms,
        scheduledAt: new Date(Date.now() + 10 * 60000).toISOString(),
        workspace_type: "client",
        workspace_id: client.id,
        kind: "client-trend-radar"
      }).catch(error => ({ ok: false, queued: 0, error: clean(error?.message, 180) }));
      if (delivery?.ok && Number(delivery.queued || 0) > 0) {
        await env.DB.prepare("UPDATE client_content SET status='scheduled',updated_at=? WHERE id=?").bind(nowIso(), id).run();
      }
    } else {
      delivery = { queued: 0, reason: "Bu müşteri çalışma alanında yetkilendirilmiş Facebook/Instagram hesabı yok." };
    }
  }

  return { ok: true, id, client: client.name, title, media: Boolean(mediaKey), score, delivery };
}

export async function runClientTrendEngine(env, { limit = 5 } = {}) {
  const result = { ok: true, clients: 0, drafts: 0, images: 0, queued: 0, skipped: 0, errors: [] };
  if (!env.DB) return { ...result, ok: false, error: "D1 bağlantısı yok" };
  await ensureTables(env);
  const clients = (await env.DB.prepare(
    "SELECT c.*, s.positioning, s.content_pillars_json, s.visual_rules_json, s.publishing_rules_json, s.ai_template_json, s.approval_required, s.autopublish_enabled FROM client_workspaces c LEFT JOIN client_strategies s ON s.client_id=c.id WHERE c.status='active' AND c.automation_enabled=1 AND c.social_management_enabled=1 ORDER BY c.updated_at ASC LIMIT ?"
  ).bind(Math.max(1, Math.min(10, Number(limit) || 5))).all().catch(() => ({ results: [] }))).results || [];
  result.clients = clients.length;
  if (!clients.length) return result;

  const trends = (await env.DB.prepare(
    "SELECT source_url,title,excerpt,category,source_name,score,risk,first_seen_at,updated_at FROM news_intelligence WHERE risk=0 AND julianday(first_seen_at)>=julianday('now','-24 hours') ORDER BY score DESC,first_seen_at DESC LIMIT 100"
  ).all().catch(() => ({ results: [] }))).results || [];
  if (!trends.length) {
    result.errors.push("Henüz uygun haber/trend sinyali yok; haber istihbaratı taraması bekleniyor.");
    return result;
  }

  for (const client of clients) {
    try {
      const recent = await env.DB.prepare("SELECT id FROM client_content WHERE client_id=? AND engine='btmedya-trend-radar' AND julianday(created_at)>=julianday('now','-6 hours') LIMIT 1")
        .bind(client.id).first().catch(() => null);
      if (recent) { result.skipped++; continue; }

      const accounts = (await env.DB.prepare("SELECT tracked_queries_json FROM client_social_accounts WHERE client_id=? AND active=1").bind(client.id).all().catch(() => ({ results: [] }))).results || [];
      const trackedQueries = [...new Set(accounts.flatMap(row => jsonArray(row.tracked_queries_json)).map(x => clean(x, 120)).filter(Boolean))].slice(0, 12);
      const strategy = {
        positioning: client.positioning || "",
        content_pillars_json: client.content_pillars_json || "[]",
        visual_rules_json: client.visual_rules_json || "{}",
        publishing_rules_json: client.publishing_rules_json || "{}",
        ai_template_json: client.ai_template_json || "{}",
        approval_required: client.approval_required == null ? 1 : Number(client.approval_required),
        autopublish_enabled: Number(client.autopublish_enabled || 0)
      };
      const candidates = [];
      for (const item of trends) {
        if (!item.source_url || !item.title) continue;
        const seen = await env.DB.prepare("SELECT id FROM client_trend_seen WHERE client_id=? AND source_url=? LIMIT 1").bind(client.id, item.source_url).first().catch(() => null);
        if (seen) continue;
        const score = relevance(client, strategy, trackedQueries, item);
        if (score >= 30) candidates.push({ ...item, score });
      }
      candidates.sort((a, b) => b.score - a.score);
      if (!candidates.length) { result.skipped++; continue; }

      const draft = await makeDraft(env, client, strategy, candidates[0], candidates[0].score, trackedQueries);
      if (!draft.ok) {
        result.skipped++;
        if (draft.reason && result.errors.length < 10) result.errors.push(client.name + ": " + draft.reason);
        continue;
      }
      result.drafts++;
      if (draft.media) result.images++;
      result.queued += Number(draft.delivery?.queued || 0);
    } catch (error) {
      result.ok = false;
      if (result.errors.length < 10) result.errors.push(clean(client.name + ": " + (error?.message || error), 240));
    }
  }
  return result;
}
