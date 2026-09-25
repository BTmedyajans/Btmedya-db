# BTMEDYA Media Vault

Bu belge yalnızca **kanonik production** mimarisini anlatır. Eski Btmedya-Ajans, Hostinger/Manus ve demo Wrangler kurulumları kullanılmaz.

## Kanonik zincir

GitHub `BTmedyajans/Btmedya-db` → GitHub Actions `deploy.yml` → Cloudflare Worker `btmedya-db` → `btmedya.com.tr`

Medya: Cloudflare R2 `btmedya-media`  
Veri: Cloudflare D1 `btmedya-media`  
Eski arşiv: R2 `btmedya-r2` yalnızca fallback/okuma

## Media Vault iş akışı

1. `/admin/` üzerinden giriş yapılır.
2. Medya R2'ye yüklenir, metadata D1'e kaydedilir.
3. Yayın durumu ve site yuvası belirlenir.
4. Gerçek medya `GERÇEK ÇEKİM`, AI üretimi `AI ÜRETİMİ` olarak açıkça işaretlenir.
5. Public feed yalnızca yayınlanabilir kayıtları gösterir.
6. Geçici/çöp R2 anahtarları public feed'den otomatik çıkarılır.

## Büyük dosyalar

Worker multipart upload akışını kullanır. Güncel endpoint sözleşmesi için Worker kaynak kodu ve admin paneli esas alınır. Bu belgede eski 10 MB/100 MB limitleri veya demo endpoint isimleri referans alınmaz.

## Güvenlik

Runtime secret'ları GitHub'a yazılmaz:

- `ADMIN_PASSWORD_SECRET`
- `ADMIN_SESSION_SECRET_SECRET`
- `MEDIA_SIGNING_SECRET`
- sosyal API secret'ları yalnızca gerçekten bağlanan platformlar için

## Dış araçlar

Adobe/CloudConvert/Morphix gibi araçlar üretim tezgâhıdır, production runtime bağımlılığı değildir. FastAPI, Convex, Manus, Hostinger ve ayrı bir D1 backend'i kanonik zincire eklenmez.

## Kaynak ve lisans

Lisansı doğrulanmayan üçüncü taraf görsel/video production sitesine alınmaz. AI üretimleri gerçek arşive karıştırılmaz. Haberlerde kaynak URL'si, orijinal tarih ve arşiv notu korunur.

## Kontrol

- `GET /api/health`
- `GET /api/public/media`
- `GET /api/news`
- `/kaynak-masasi/`
- GitHub Actions `deploy.yml` production smoke testleri
