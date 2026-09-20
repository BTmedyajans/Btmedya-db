/* BTMEDYA sosyal medya kimlikleri.
 * Secret değerleri kesinlikle source'a yazılmaz. Cloudflare Worker env'den okunur.
 * Yayın API'leri için gerekli OAuth/API kimliklerinin isimleri burada tek yerde tutulur.
 */
export const SOCIAL_PROVIDERS = {
  instagram: {
    label: "Instagram",
    required: ["META_ACCESS_TOKEN", "META_IG_USER_ID"],
    api: "Meta Graph API"
  },
  facebook: {
    label: "Facebook",
    required: ["META_ACCESS_TOKEN", "META_PAGE_ID"],
    api: "Meta Graph API"
  },
  tiktok: {
    label: "TikTok",
    required: ["TIKTOK_ACCESS_TOKEN", "TIKTOK_OPEN_ID"],
    api: "TikTok Content Posting API"
  },
  youtube: {
    label: "YouTube",
    required: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"],
    api: "YouTube Data API v3"
  }
};

export function socialProviderStatus(env) {
  return Object.fromEntries(
    Object.entries(SOCIAL_PROVIDERS).map(([key, p]) => {
      const missing = p.required.filter(name => !String(env?.[name] ?? "").trim());
      return [key, {
        label: p.label,
        api: p.api,
        configured: missing.length === 0,
        missing
      }];
    })
  );
}
