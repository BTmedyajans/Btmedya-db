# BTMEDYA Production Secret Map

Bu dosya secret değerlerini içermez. Yalnızca Worker'ın beklediği gerçek secret isimlerini ve kaynağını tanımlar.

## Cloudflare Worker: btmedya-db

Cloudflare Dashboard > Workers & Pages > btmedya-db > Settings > Variables and Secrets > Add > Secret

### Çekirdek Worker

- ADMIN_PASSWORD: /admin giriş şifresi
- ADMIN_SESSION_SECRET: admin oturum imzası
- MEDIA_SIGNING_SECRET: imzalı medya URL'leri

### Meta / Instagram / Facebook

- META_ACCESS_TOKEN: Meta Graph API erişim tokenı
- META_IG_USER_ID: Instagram Professional hesabının IG User ID'si
- META_PAGE_ID: bağlı Facebook Page ID'si

### TikTok

- TIKTOK_ACCESS_TOKEN: TikTok kullanıcı access tokenı
- TIKTOK_OPEN_ID: OAuth ile yetkilendirilmiş TikTok kullanıcısının open_id'si

### YouTube

- YOUTUBE_CLIENT_ID: Google OAuth client ID
- YOUTUBE_CLIENT_SECRET: Google OAuth client secret
- YOUTUBE_REFRESH_TOKEN: YouTube kanalını yetkilendiren OAuth refresh token

## GitHub Actions

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID

Bunlar GitHub Actions secret'larıdır. Worker runtime secret'larından ayrıdır.

## Güvenlik

Gerçek secret değerleri GitHub source dosyalarına veya wrangler.toml içine yazılmaz. Cloudflare Worker Secret olarak tutulur.

## Kontrol endpoint'i

Admin oturumu ile GET /api/admin/social/providers çağrıldığında platformların hangi secret'larının eksik olduğu değerleri gösterilmeden döner.

Örnek:

    {
      "ok": true,
      "providers": {
        "instagram": {
          "configured": false,
          "missing": ["META_ACCESS_TOKEN", "META_IG_USER_ID"]
        }
      }
    }

Secret değerleri bu endpoint tarafından hiçbir zaman döndürülmez.