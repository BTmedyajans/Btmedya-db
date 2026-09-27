/* BTMEDYA sosyal medya bağlantı katmanı.
 * Üretimde sosyal yayınların tek geçidi Metricool'dur.
 * Böylece Worker içinde Instagram/Facebook/TikTok/YouTube için ayrı OAuth
 * tokenları tutulmaz. Hesap yetkilendirmesi Metricool'da bir kez yapılır.
 */
export const SOCIAL_PROVIDERS = {
  instagram: { label: "Instagram", managedBy: "Metricool" },
  facebook: { label: "Facebook", managedBy: "Metricool" },
  tiktok: { label: "TikTok", managedBy: "Metricool" },
  youtube: { label: "YouTube", managedBy: "Metricool" }
};

export function socialProviderStatus(env) {
  const metricool = Boolean(String(env?.METRICOOL_USER_TOKEN ?? "").trim());
  return Object.fromEntries(
    Object.entries(SOCIAL_PROVIDERS).map(([key, p]) => [
      key,
      {
        label: p.label,
        api: "Metricool",
        managedBy: p.managedBy,
        configured: metricool,
        missing: metricool ? [] : ["METRICOOL_USER_TOKEN"],
        note: metricool
          ? "Yayın Metricool üzerinden yönetiliyor."
          : "Metricool Worker bağlantısı henüz kurulmadı."
      }
    ])
  );
}
