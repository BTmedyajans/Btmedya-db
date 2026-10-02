# BTMEDYA Production Chain — 28 Eylül 2026

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

## 28 Eylül kontrollü denetim sonucu

### Kaynak ve dağıtım

- GitHub repository: `BTmedyajans/Btmedya-db`
- `wrangler.toml`: Worker `btmedya-db`, D1 `btmedya-media`, R2 `btmedya-media` üretim deposu olarak tanımlı; eski `btmedya-r2` artık kaldırıldı.
- Cloudflare Workers Builds, 28 Eylül'de `btmedya-db` için başarılı bir production build/deploy gerçekleştirdi. Bilinen başarılı build: `7ac9dcd2-49b0-4fa8-a1bd-f14ca914ca40`.
- GitHub Actions içindeki ayrı Wrangler deploy workflow'u Cloudflare Worker servisine erişim yetkisi olmadığı için başarısız oluyordu. Bu workflow artık production deploy yapmıyor; yalnızca manuel HTTP doğrulama amacıyla tutuluyor.
- Böylece iki ayrı deploy motorunun aynı production Worker üzerinde yarışması engellendi. Kanonik deploy motoru Workers Builds'tir.

### DNS ve domain

- Cloudflare zone `btmedya.com.tr`: `active`.
- GüzelHosting registrar/public NS delegasyonu Cloudflare nameserver'larıyla eşleşiyor:
  - `dimitris.ns.cloudflare.com`
  - `katja.ns.cloudflare.com`
- Cloudflare DNS API'sinde şu anda web için görülen kayıtlar arasında apex web kaydı yok.
- `www.btmedya.com.tr` için Cloudflare tarafından kullanılan proxied `AAAA 100::` kaydı mevcut.
- Public HTTPS testinde `www` Cloudflare üzerinden `301 → https://btmedya.com.tr/` döndürüyor.
- Apex `btmedya.com.tr` ise public DNS çözümlemesinde başarısız oluyor. Bu nedenle ana domain HTTP/API smoke testleri henüz yeşil değildir.

### Yetki sınırı

GitHub'daki mevcut Cloudflare API token:

- zone sorgusuna erişebiliyor;
- DNS kayıtlarını okuyabiliyor;
- ancak Worker script/deployment, Worker Routes ve Worker Custom Domains API'lerine erişemiyor.

Cloudflare'ın güncel yetki modeline göre mevcut token ile Wrangler üzerinden Worker deployu ve custom-domain değişikliği yapılamıyor. Production deploy için Workers Scripts Editor ve custom-domain/route değişiklikleri için ilgili Workers Routes Write yetkileri gerekiyor.

### Sonuç

```
GitHub kaynak       ✅
Workers Builds      ✅
Worker build        ✅
Cloudflare zone     ✅
Nameserver          ✅
www                  ✅ 301
apex DNS             ❌
apex HTTP/API        ❌
Worker API token     ⚠️ yetersiz kapsam
```

## Güvenli onarım sırası

1. Mevcut Cloudflare hesabı/zone altında `btmedya-db` Worker'ın Custom Domains durumunu doğrula.
2. `btmedya.com.tr` Custom Domain'in Worker'a bağlı olduğunu doğrula veya eksikse ekle.
3. Cloudflare'ın Custom Domain için oluşturduğu apex DNS kaydının oluştuğunu doğrula.
4. Public DNS'i tekrar `1.1.1.1` üzerinden test et.
5. Apex HTTP 200, `/api/health`, D1/R2, admin 401 ve www 301 testlerini çalıştır.
6. Bundan sonra medya, haber, admin ve Metricool zincirini canlı uçtan uca test et.

**Not:** 27 Eylül'deki başarılı production smoke test sonucu tarihsel bir sonuçtur. 28 Eylül'deki yeni denetim, apex DNS'in o zamandan sonra tekrar bozulduğunu/eksik olduğunu gösterdiği için eski HTTP 200 sonucu bugünkü canlı durum olarak kullanılmamalıdır.
