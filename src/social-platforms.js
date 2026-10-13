/* BTMEDYA social provider status and legacy Metricool adapter.
 * The primary publishing path is BTMEDYA's own OAuth + Cloudflare queue.
 * Metricool helpers remain for reading historical legacy entries only.
 */
export const SOCIAL_PROVIDERS = {
  instagram: { label: "Instagram", managedBy: "BTMEDYA Worker" },
  facebook: { label: "Facebook", managedBy: "BTMEDYA Worker" },
  tiktok: { label: "TikTok", managedBy: "BTMEDYA Worker" },
  youtube: { label: "YouTube", managedBy: "BTMEDYA Worker" },
  x: { label: "X", managedBy: "BTMEDYA Worker" }
};

export function metricoolConnectedNetworks(env) {
  const raw = String(env?.METRICOOL_CONNECTED_NETWORKS || "tiktok,youtube");
  return new Set(raw.split(",").map(x => x.trim().toLowerCase()).filter(x => SOCIAL_PROVIDERS[x]));
}

export const SOCIAL_ACCOUNT_SCOPES = {
  company: {
    label: "BTMEDYA Şirket",
    brandEnv: "METRICOOL_BRAND_ID",
    networksEnv: "METRICOOL_CONNECTED_NETWORKS",
  },
  personal: {
    label: "Kişisel",
    brandEnv: "METRICOOL_PERSONAL_BRAND_ID",
    networksEnv: "METRICOOL_PERSONAL_CONNECTED_NETWORKS",
  },
};

export function metricoolAccountConfig(env, scope = "company") {
  const key = scope === "personal" ? "personal" : "company";
  const cfg = SOCIAL_ACCOUNT_SCOPES[key];
  const brandId = String(env?.[cfg.brandEnv] ?? "").trim();
  const fallback = key === "company" ? "tiktok,youtube" : "";
  const raw = String(env?.[cfg.networksEnv] ?? fallback);
  const connectedNetworks = new Set(
    raw.split(",")
      .map(x => x.trim().toLowerCase())
      .filter(x => SOCIAL_PROVIDERS[x] && x !== "x")
  );
  return {
    scope: key,
    label: cfg.label,
    brandId,
    connectedNetworks,
    configured: Boolean(brandId),
  };
}

export function metricoolAccountCanPublish(env, scope, network) {
  const account = metricoolAccountConfig(env, scope);
  return account.configured && account.connectedNetworks.has(String(network || "").toLowerCase());
}

/* Native mode reports two separate facts:
 * - configured: official provider OAuth app/server prerequisites exist
 * - connected: an active account is stored in D1 after completing OAuth
 * It never treats a profile URL, old Metricool record, or token presence as
 * proof that a native social account has been authorized.
 */
export async function socialProviderStatus(env) {
  const direct = String(env?.BTMEDYA_SOCIAL_PUBLISHER || "direct").trim().toLowerCase() === "direct";
  if (direct) {
    const commonMissing = [];
    if (!env?.DB) commonMissing.push("DB");
    if (!env?.KV) commonMissing.push("KV");
    if (!String(env?.SOCIAL_TOKEN_ENCRYPTION_KEY || env?.MEDIA_SIGNING_SECRET || "").trim())
      commonMissing.push("SOCIAL_TOKEN_ENCRYPTION_KEY veya MEDIA_SIGNING_SECRET");

    const providerMissing = {
      facebook: [
        ...commonMissing,
        ...(!String(env?.META_APP_ID || "").trim() ? ["META_APP_ID"] : []),
        ...(!String(env?.META_APP_SECRET || "").trim() ? ["META_APP_SECRET"] : [])
      ],
      instagram: [
        ...commonMissing,
        ...(!String(env?.META_APP_ID || "").trim() ? ["META_APP_ID"] : []),
        ...(!String(env?.META_APP_SECRET || "").trim() ? ["META_APP_SECRET"] : [])
      ],
      tiktok: [
        ...commonMissing,
        ...(!String(env?.TIKTOK_CLIENT_KEY || "").trim() ? ["TIKTOK_CLIENT_KEY"] : []),
        ...(!String(env?.TIKTOK_CLIENT_SECRET || "").trim() ? ["TIKTOK_CLIENT_SECRET"] : [])
      ],
      youtube: [
        ...commonMissing,
        ...(!String(env?.YOUTUBE_CLIENT_ID || "").trim() ? ["YOUTUBE_CLIENT_ID"] : []),
        ...(!String(env?.YOUTUBE_CLIENT_SECRET || "").trim() ? ["YOUTUBE_CLIENT_SECRET"] : [])
      ],
      x: [
        ...commonMissing,
        ...(!String(env?.X_CLIENT_ID || "").trim() ? ["X_CLIENT_ID"] : [])
      ]
    };

    let active = {};
    if (env?.DB) {
      try {
        const rows = await env.DB.prepare(
          "SELECT provider,COUNT(*) AS total FROM social_direct_connections WHERE workspace_type='agency' AND workspace_id='btmedya' AND status='active' GROUP BY provider"
        ).all();
        for (const row of (rows?.results || [])) active[String(row.provider || "").toLowerCase()] = Number(row.total || 0);
      } catch {
        // The first protected Social OS request creates the direct-social tables.
      }
    }
    return Object.fromEntries(Object.entries(SOCIAL_PROVIDERS).map(([key, p]) => {
      const connected = Number(active[key] || 0) > 0;
      const missing = [...providerMissing[key]];
      if (!connected) missing.push("Resmî OAuth ekranından hesap bağlantısı");
      const configured = providerMissing[key].length === 0;
      return [key, {
        label: p.label,
        api: "Native OAuth/API",
        managedBy: p.managedBy,
        configured: configured && connected,
        connected,
        connectedAccounts: Number(active[key] || 0),
        missing: [...new Set(missing)],
        note: connected && configured
          ? "Doğrudan OAuth hesabı bağlı; BTMEDYA yerel yayın kuyruğu kullanılır."
          : (configured
            ? "Uygulama ayarları hazır; resmî OAuth hesabı bağlanmalı."
            : "Doğrudan yayın için uygulama/Worker yapılandırması eksik.")
      }];
    }));
  }

  // Compatibility view for an explicitly selected legacy publisher only.
  const metricool = Boolean(String(env?.METRICOOL_USER_TOKEN ?? "").trim());
  const connected = metricoolConnectedNetworks(env);
  return Object.fromEntries(Object.entries(SOCIAL_PROVIDERS).map(([key, p]) => {
    const isConnected = connected.has(key);
    return [key, {
      label: p.label,
      api: "Metricool legacy",
      managedBy: "Metricool legacy",
      configured: metricool && isConnected,
      connected: isConnected,
      connectedAccounts: isConnected ? 1 : 0,
      missing: !metricool ? ["METRICOOL_USER_TOKEN"] : (!isConnected ? ["Metricool bağlantısı"] : []),
      note: !metricool
        ? "Eski Metricool entegrasyonu seçili ancak Worker tokenı yok."
        : (isConnected ? "Eski Metricool entegrasyonu üzerinden yönetiliyor." : "Eski entegrasyonda bu ağ doğrulanmadı.")
    }];
  }));
}
