# BTMEDYA Sosyal API Bağlantısı

## Üretim mimarisi

BTMEDYA'nın sosyal yayın katmanında **Metricool tek yayın geçididir**. Instagram, Facebook, TikTok ve YouTube hesapları Metricool içinde bir kez yetkilendirilir; Worker bu platformların ayrı OAuth tokenlarını tutmaz.

### Worker için gerekli sosyal secret

- `METRICOOL_USER_TOKEN`: Metricool REST API erişim tokenı (**tek gizli Metricool değeri**)
- `METRICOOL_USER_ID`: `wrangler.toml` içinde tutulan, gizli olmayan kullanıcı kimliği
- `METRICOOL_BRAND_ID`: `wrangler.toml` içinde tutulan, gizli olmayan BTMEDYA marka kimliği
- `METRICOOL_TIMEZONE`: varsayılan `Europe/Istanbul`

### GitHub -> Cloudflare secret zinciri

GitHub Actions workflow'u yalnızca `BTMEDYA_METRICOOL_USER_TOKEN` GitHub Secret'ını Cloudflare Worker'daki `METRICOOL_USER_TOKEN` secret'ına aktarır. Kullanıcı ve marka kimlikleri `wrangler.toml` içindeki `METRICOOL_USER_ID` ve `METRICOOL_BRAND_ID` değişkenlerinden okunur; aynı adların hem açık değişken hem Worker secret olarak tanımlanması engellenir. Token değeri hiçbir zaman kaynak koda veya dokümana yazılmaz.

### Hesap bağlantısı

Platform hesaplarının yetkilendirmesi Metricool tarafında yapılır. Worker'a Instagram/Facebook/TikTok/YouTube access tokenları eklenmez.

### Sonuç

Yeni kurulumda sosyal yayın için tek kullanıcı tarafından girilecek gizli değer **Metricool API tokenıdır**. Cloudflare/GitHub secret senkronizasyonu yalnızca kurulum veya değişiklik gerektiğinde kullanılır; normal GitHub → Cloudflare Workers Builds deploy akışı bu secretları tekrar istemez.
