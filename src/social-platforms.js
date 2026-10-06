/* BTMEDYA sosyal medya bağlantı katmanı.
 * Üretimde sosyal yayınların tek geçidi Metricool'dur.
 * Böylece Worker içinde Instagram/Facebook/TikTok/YouTube için ayrı OAuth
 * tokenları tutulmaz. Hesap yetkilendirmesi Metricool'da bir kez yapılır.
 *
 * Production redeploy marker: 2026-09-29
 * Social queue remains approval-driven: only records marked "planlandi"
 * with a future scheduled_at are delivered to Metricool automatically.
 */
export const SOCIAL_PROVIDERS = {
  instagram: { label: "Instagram", managedBy: "Metricool" },
  facebook: { label: "Facebook", managedBy: "Metricool" },
  tiktok: { label: "TikTok", managedBy: "Metricool" },
  youtube: { label: "YouTube", managedBy: "Metricool" }
};

export function metricoolConnectedNetworks(env) {
  const raw = String(env?.METRICOOL_CONNECTED_NETWORKS || "facebook,instagram,tiktok,youtube");
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
  const fallback = key === "company" ? "facebook,instagram,tiktok,youtube" : "";
  const raw = String(env?.[cfg.networksEnv] ?? fallback);
  const connectedNetworks = new Set(
    raw.split(",")
      .map(x => x.trim().toLowerCase())
      .filter(x => SOCIAL_PROVIDERS[x])
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

export function socialProviderStatus(env) {
  const metricool = Boolean(String(env?.METRICOOL_USER_TOKEN ?? "").trim());
  const connected = metricoolConnectedNetworks(env);
  return Object.fromEntries(
    Object.entries(SOCIAL_PROVIDERS).map(([key, p]) => {
      const isConnected = connected.has(key);
      return [
        key,
        {
          label: p.label,
          api: "Metricool",
          managedBy: p.managedBy,
          configured: metricool && isConnected,
          connected: isConnected,
          missing: !metricool ? ["METRICOOL_USER_TOKEN"] : (!isConnected ? ["Metricool bağlantısı"] : []),
          note: !metricool
            ? "Metricool Worker bağlantısı henüz kurulmadı."
            : (isConnected ? "Metricool üzerinden yönetiliyor." : "Bu ağ Metricool Brand bağlantılarında doğrulanmadı.")
        }
      ];
    })
  );
}
