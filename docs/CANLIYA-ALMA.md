# BTMEDYA | Canlıya Alma ve Yayın Kontrolü

Bu depo BTMEDYA'nın üretim kaynağıdır. `main` dalı GitHub Actions `.github/workflows/deploy.yml` üzerinden `btmedya-db` Worker'ına deploy edilir.


> **Kimlik doğrulama notu:** Production runtime accepts the current *_SECRET names and the older ADMIN_PASSWORD / ADMIN_SESSION_SECRET names for compatibility. Prefer ADMIN_PASSWORD_SECRET and ADMIN_SESSION_SECRET_SECRET in new deployments.
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

- `ADMIN_PASSWORD_SECRET`
- `ADMIN_SESSION_SECRET_SECRET`
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


## Cloudflare / Email control-plane

Repository now includes `control-plane/cloudflare-control-plane.sh` and the GitHub Actions workflow `.github/workflows/cloudflare-control-plane.yml`.

### Otomatik yapılan işler

- `btmedya.com.tr/*` biçimindeki eski Page Rule bulunursa apply modunda silinir.
- Kök SPF tek kayıt olacak şekilde Cloudflare Email Routing include'ı mevcut include'larla birleştirilir.
- `busetuncay74@gmail.com` Cloudflare Email Routing destination olarak yoksa oluşturulur.
- Hedef adres Cloudflare tarafından doğrulanmışsa Email Routing etkinleştirilir ve `info@`, `admin@` ve catch-all yönlendirmeleri aynı hedefe bağlanır.
- Eski kök MX `btmedyajans.com` yalnızca Email Routing başarıyla etkinleştikten sonra silinir.

### Bilerek otomatik silinmeyen kayıt

`send.btmedya.com.tr` MX kaydı varsayılan olarak korunur. Proje kodu Resend kullanıyor ve Resend'in 2026 dokümantasyonu `send` alt alanındaki Amazon SES MX/SPF kayıtlarını Resend domain return-path yapılandırmasının parçası olarak gösteriyor. Bu nedenle bunu sırf ekrandaki eski yönerge nedeniyle körlemesine silmek güvenli değildir.

### İnsan müdahalesi gereken tek adım

Cloudflare destination address ilk kez oluşturulursa Cloudflare, `busetuncay74@gmail.com` adresine doğrulama e-postası gönderir. Bu e-postadaki doğrulama bağlantısı insan tarafından bir kez onaylanmalıdır. Cloudflare, doğrulanmamış hedefe routing rule oluşturulmasına izin vermez.

### Çalıştırma

GitHub Actions → **BTMEDYA Cloudflare Control Plane** → **Run workflow**.

- `audit`: yalnızca okur ve raporlar.
- `apply`: DNS / Email Routing değişikliklerini uygular.
- `apply_dmarc=false`: mevcut DMARC'ı korur.
- `remove_resend_records=false`: `send.*` Resend/Amazon SES kayıtlarını korur.

> Production deploy yolu DNS'i doğrudan değiştirmez. Cloudflare değişiklikleri ayrı bir control-plane iş akışında tutulur.

> Control-plane audit tetikleyici commit'i GitHub Actions'ın otomatik audit yolunu başlatmak için eklendi.
