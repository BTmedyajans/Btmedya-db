# BTMEDYA — btmedya.com.tr

Haber, prodüksiyon ve yapay zekâ ajansı BTMEDYA'nın web sitesi. Cloudflare Workers + D1 + R2 üzerinde çalışan site + "Media Vault" medya arşivi ve admin paneli.

## Yapı

```
wrangler.toml        Worker config (D1 / R2 / Assets binding'leri)
src/worker.js        Birleşik API: haber CMS + medya kasası + statik servis
migrations/          D1 şeması (news, media, social_posts)
public/              Yayınlanan her şey (assets binding bu klasörü servis eder)
  index.html         Anasayfa (V11 sinematik/editorial tema)
  styles.css, script.js
  assets/            Görseller + videolar (logo, hero, showreel, portfolyo)
  haberler/          27 haberin statik HTML sayfası + arşiv listesi
  data/haberler.json Haber arşivi verisi (tam metin, kaynak, yazar)
  admin/             Media Vault yönetim paneli (/admin/)
  social-studio/     İçerik → sosyal video üretim sayfası
  robots.txt, sitemap.xml, news-sitemap.xml, rss.xml, site.webmanifest, llms.txt, llms-full.txt
docs/                Yayına alma, Media Vault ve kaynak/provenance kılavuzları
```

Backend dosyaları `public/` dışında tutulur; bu yüzden `wrangler.toml`, `src/` ve
`migrations/` hiçbir koşulda herkese açık servis edilmez.

## API uçları

| Uç | Açıklama |
|---|---|
| `GET /api/health` | D1/R2 bağlantı kontrolü |
| `GET /api/news` | D1'de yayınlanmış canlı haberler |
| `POST /api/admin/news` | Haber yayınla/güncelle (admin) |
| `POST /api/login`, `/api/logout` | Admin oturumu (imzalı çerez, 7 gün) |
| `GET/POST /api/media`, `PATCH/DELETE /api/media/:id` | Medya kayıtları (admin) |
| `PUT /api/upload/:key/part`, `POST /api/upload/:key/complete` | R2 çok parçalı yükleme |
| `GET /api/public/media` | Yayınlanmış medya (herkese açık, imzalı URL'ler) |
| `GET /api/export` | AI araçları için medya kataloğu (`AI_READ_TOKEN`) |
| `GET /media/:key?exp=&sig=` | Süreli imzalı medya servisi |

## Cloudflare durumu

| Worker | Rol |
|---|---|
| `btmedya-db` | **Bu depo buraya deploy eder** — site + API burada çalışıyor |

Cloudflare Workers Builds, `wrangler.toml` içindeki `name` alanını yok sayar ve
daima bağlı olduğu servise (`btmedya-db`) deploy eder. `main` dalına push
yapıldığında site otomatik güncellenir.

### Alan adı bağlama

`btmedya.com.tr` alan adı şu an `btmedya-db` Worker'ına bağlı ve canlı.

`www.btmedya.com.tr` ile gelen istekler Worker tarafından `btmedya.com.tr`
adresine 301 yönlendirilir. Bu yönlendirme yalnızca Worker çalıştığında devreye
girer; statik dosyalar Worker'dan önce servis edildiği için `wrangler.toml`
içindeki `run_worker_first` listesi indekslenen tüm HTML adreslerini kapsar
(`/`, `/haberler/*`, `/hakkimizda*`, `/iletisim*`). Yeni bir üst düzey sayfa
eklendiğinde bu listeye de eklenmelidir, aksi halde o sayfa hem `www` hem apex
adresinde 200 döner (yinelenen içerik).

Görseller, `styles.css` ve `script.js` gibi statik dosyalar bu listede değildir;
`www` üzerinden de servis edilirler. Arama motoru açısından sorun değildir, ancak
alan adı genelinde tek adımda çözüm isteniyorsa Cloudflare panelinde zone
seviyesinde bir **Redirect Rule** tanımlanabilir.

## Yayına almadan önce

`/admin/` panelinin ve imzalı medya bağlantılarının çalışması için üç secret
tanımlanmalı (Cloudflare paneli > Worker > Settings > Variables and Secrets,
ya da `wrangler secret put`):

- `ADMIN_PASSWORD_SECRET` — panel giriş şifresi
- `ADMIN_SESSION_SECRET_SECRET` — oturum imzalama anahtarı (rastgele uzun dizi)
- `MEDIA_SIGNING_SECRET` — medya bağlantısı imzalama anahtarı (rastgele uzun dizi)

Detaylı adımlar: `docs/CANLIYA-ALMA.md`

## Tek elden yönetim

GitHub Actions üzerindeki `deploy.yml` artık tek kanonik production deploy kapısıdır. `main` push'unda Worker'ı deploy eder ve canlı release marker, health, media feed, sitemap ve gerçek/AI etiketlerini smoke-test eder. Eski yinelenen deploy/smoke akışları kaldırılmıştır.
