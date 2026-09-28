# BTMEDYA Sosyal API Bağlantısı

## Üretim mimarisi

BTMEDYA'nın sosyal yayın katmanında **Metricool tek yayın geçididir**. Instagram, Facebook, TikTok ve YouTube hesapları Metricool içinde bir kez yetkilendirilir; Worker bu platformların ayrı OAuth tokenlarını tutmaz.

### Worker için gerekli sosyal secret

- `METRICOOL_USER_TOKEN`: Metricool REST API erişim tokenı
- `METRICOOL_USER_ID`: Metricool kullanıcı kimliği
- `METRICOOL_BRAND_ID`: BTMEDYA Metricool marka kimliği
- `METRICOOL_TIMEZONE`: varsayılan `Europe/Istanbul`

### Hesap bağlantısı

Platform hesaplarının yetkilendirmesi Metricool tarafında yapılır. Worker'a Instagram/Facebook/TikTok/YouTube access tokenları eklenmez.

### Sonuç

Yeni kurulumda sosyal yayın için tek kullanıcı tarafından girilecek gizli değer **Metricool API tokenıdır**. Cloudflare/GitHub secret senkronizasyonu yalnızca kurulum veya değişiklik gerektiğinde kullanılır; normal GitHub → Cloudflare Workers Builds deploy akışı bu secretları tekrar istemez.
