# BTMEDYA Production Chain — 27 Eylül 2026

## Kanonik zincir

```
GitHub: BTmedyajans/Btmedya-db
        ↓
main
        ↓
Cloudflare Workers Builds
        ↓
Worker: btmedya-db
        ├── D1: btmedya-media
        ├── R2: btmedya-media
        └── Static Assets: public/
        ↓
https://btmedya.com.tr
```

## Canlı doğrulama

27 Eylül 2026 tarihli son production doğrulamasında:

- Cloudflare Workers Build: başarılı
- Production deploy gate: başarılı
- `https://btmedya.com.tr/`: HTTP 200
- `https://www.btmedya.com.tr/`: HTTP 301 → apex
- `/api/health`: HTTP 200
- CMS/D1 bağlantısı: sağlık endpointi üzerinden doğrulandı
- R2 bağlantısı: sağlık endpointi üzerinden doğrulandı
- Production smoke test: başarılı
- Cloudflare zone ve registrar nameserver delegasyonu: eşleşiyor

## Eski hata nedenleri

### D1 migration hatası

23b7ed2... tabanlı eski production çalışmasında D1 migration adımı Cloudflare API 7403 ile durdu:

> The given account is not valid or is not authorized to access this service

Bu adım production deploy zincirinden ayrılmıştır. D1 migration artık ayrı ve manuel `.github/workflows/d1-migrations.yml` workflow'u üzerinden yürütülür; böylece D1 yetki sorunu statik site deployunu engellemez.

### Cloudflare control-plane

Normal `main` push akışında control-plane **audit-only** çalışır. DNS/Email Routing üzerinde otomatik mutasyon yapılmaz.

Account-owned token ile Page Rules API erişimi verilmeyen durumda bu kontrol atlanır; ana production akışı durdurulmaz.

### R2/D1 listeleme yetkisi

Bazı Cloudflare account/API token kapsamlarında `wrangler r2 bucket list` ve `wrangler d1 list` kaynakları görünmeyebilir. Diagnostic artık bu durumu doğrudan servis arızası olarak raporlamaz; `/api/health` içindeki R2/CMS sinyallerini de dikkate alır.

## Yönetim kuralı

Production deploy için tek kanonik kapı:

`.github/workflows/deploy.yml`

Önce PR validation, sonra `main`, sonra Cloudflare Workers Build, ardından canlı smoke-test.

D1 migration, R2 arşiv senkronizasyonu ve Cloudflare control-plane bağımsız operasyonlardır; birbirlerinin production deployunu gereksiz yere bloke etmez.
