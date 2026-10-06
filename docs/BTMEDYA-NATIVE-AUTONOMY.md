# BTMEDYA Native Autonomy / Staging Contract

## Amaç
BTMEDYA'nın haber, site ve müşteri sosyal içeriklerini üçüncü taraf bir sosyal planlayıcıya mecbur kalmadan üretmek, planlamak ve resmi platform API'lerine teslim etmek.

## Canonical zincir
Kaynak Masası → News Intelligence → Autopilot → D1 içerik kuyruğu → R2 medya → Cloudflare Cron → Native Social Gateway → Instagram / Facebook Page / TikTok / YouTube / LinkedIn.

Metricool mevcut kurulumla uyumluluk katmanı olarak kalabilir; native kuyrukta runtime bağımlılığı değildir.

## Zamanlama
- Her 5 dakika: sosyal native + Metricool teslim kuyrukları, heartbeat ve kuyruk bakımı.
- Her 15 dakika: haber istihbaratı, Agency Supervisor ve mevcut keşif/autopilot turu.
- Her saat: saatlik içerik pulse + müşteri autopilot.
- Her gün 08:00 İstanbul: Sabah Masası.
- Saatlik tetik UTC tabanlıdır; Cloudflare Cron Trigger kullanılır.

## Haber güvenliği
Otomatik haber üretimi yalnız kaynak sinyallerinden taslak üretir. Hassas kategoriler mevcut editorial gate ile otomatik yayın dışındadır. Kaynak URL'si korunur. AI tarafından üretilen medya AI LAB etiketiyle ayrılır.

## Müşteri güvenliği
Her müşteri ayrı `client_id` ile izole edilir. Sosyal hesaplar `native_social_accounts` üzerinde `scope=client` olarak tutulur. Müşteri stratejisindeki `approval_required` ve `autopublish_enabled` alanları yayın karar kapısıdır.

## Kimlik bilgileri
Platform uygulama secret'ları yalnız Worker Secrets'ta bulunur. OAuth tokenları `SOCIAL_CREDENTIALS_SECRET` ile AES-GCM şifreli olarak D1'de tutulur. Kaynak koduna token, şifre veya refresh token yazılmaz.

## Platform gerçekleri
Native API entegrasyonları resmi platformların OAuth/API kurallarına tabidir. TikTok Direct Post ve YouTube uploads uygulama denetimi/audit gerektirebilir; LinkedIn kuruluş gönderileri için `w_organization_social` yetkisi gerekir. Bu nedenle kod "hazır", canlı hesap bağlantısı ve platform onayı ise ayrı bir son kapıdır.

## Staging kuralı
Bu dal üretim deploy etmez, DNS/D1/R2 mutasyonu yapmaz ve sosyal ağlara gerçek yayın gönderen secret'ları içermez. Merge/production deploy yalnız ayrı bir onay kapısından geçer.
