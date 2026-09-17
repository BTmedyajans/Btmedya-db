# BTMEDYA | Canlıya Alma ve Yayın Kontrolü

Bu depo BTMEDYA'nın üretim kaynağıdır. `main` dalı Cloudflare Workers Builds tarafından `btmedya-db` Worker'ına deploy edilir.

## Mevcut üretim mimarisi

| Bileşen | Durum |
|---|---|
| Worker | `btmedya-db` |
| Ana alan adı | `btmedya.com.tr` |
| WWW | `www.btmedya.com.tr` |
| D1 | `btmedya-media` |
| R2 | `btmedya-media` |
| Worker giriş noktası | `src/worker.js` |
| Statik site | `public/` |
| Yönetim paneli | `/admin/` |
| Medya API | `/api/media`, `/api/public/media` |
| Haber API | `/api/news`, `/api/admin/news` |

`wrangler.toml` içinde iki alan adı da custom domain olarak tanımlıdır. `www` istekleri Worker tarafından ana domaine 301 yönlendirilir.

## Yayın için gerekli Cloudflare Secret'ları

Aşağıdaki secret'lar GitHub'a veya `wrangler.toml` dosyasına yazılmaz. Cloudflare Worker Secret olarak tanımlanmalıdır:

- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `MEDIA_SIGNING_SECRET`

İsteğe bağlı:

- `AI_READ_TOKEN`
- `RESEND_API_KEY`
- `RESEND_TO`
- `RESEND_FROM`

## Yayın kontrolü

GitHub Actions her `main` push'unda kaynak doğrulaması yapar ve canlı uç noktaları kontrol eder.

Beklenenler:

- `/api/health` → `ok:true`, `cms:true`, `r2:true`, `admin:true`
- `/api/news?limit=1` → başarılı cevap
- `/api/admin/news` → kimlik doğrulama olmadan `401`
- `https://btmedya.com.tr/` → başarılı cevap
- `https://www.btmedya.com.tr/` → `301`
- `/wrangler.toml` → herkese açık olmamalı

## Canlı içerik

Haberler D1 üzerinden, medya dosyaları R2 üzerinden yönetilir. Ana sayfadaki gerçek portföy içerikleri `/api/public/media` üzerinden yayınlanabilir.

AI üretimleri ayrı `AI LAB` alanında açıkça etiketlenmelidir. Gerçek saha fotoğrafı, video ve haber içerikleri AI üretimi gibi gösterilmemelidir.

## Yayın sonrası son kontrol

1. `https://btmedya.com.tr/`
2. `https://btmedya.com.tr/haberler/`
3. `https://btmedya.com.tr/admin/`
4. `https://btmedya.com.tr/api/health`
5. `https://btmedya.com.tr/api/public/media`
6. `https://www.btmedya.com.tr/`

Secret'lar Cloudflare'da tanımlı değilse admin ve imzalı medya bağlantıları üretim için hazır kabul edilmez.
