# BTMEDYA Social Integration Status

Tarih: 29 Eylül 2026

## TikTok yayın zinciri

TikTok hesabı: https://www.tiktok.com/@btmedya1010
Metricool brand: 6858384
Yayın geçidi: Metricool
Zincir: GitHub ana dalı -> Cloudflare Worker -> D1 sosyal kuyruk -> Metricool -> TikTok
Durum: Metricool teslim kuyruğu yarış koşullarına karşı kilitlendi; başarılı teslim kimliği D1'e kaydedilir; geçici API hataları 5 dakikalık geri çekilmeyle sınırlı tekrar denenir.

**Güvenlik:** Token/secret değerleri kaynak koda yazılmaz. GitHub Actions yalnızca `BTMEDYA_METRICOOL_USER_TOKEN`, `BTMEDYA_METRICOOL_USER_ID` ve `BTMEDYA_METRICOOL_BRAND_ID` secret'larını Cloudflare Worker'a aktarır.

## Dağıtım katmanı

Metricool brand: 6858384
Brand label: busetuncayy10
Timezone: Europe/Istanbul

Doğrulanan kanal kimlikleri:
- Instagram: https://www.instagram.com/btmedyajans/
- YouTube: https://www.youtube.com/@BTmedyaAjans
- TikTok: https://www.tiktok.com/@btmedya1010
- Facebook: sayfa URL'si ve META_PAGE_ID doğrulama bekliyor

Son Metricool snapshotında TikTok üzerinden iki yayın doğrulandı:
- 24 Eylül 2026: Balıkesir Pazarında Canlı Helva Şovu
- 23 Eylül 2026: Balıkesir'in Cuma Pazarı

## Yayın güvenliği

BTMEDYA editoryal kuralı:
- Gerçek haber/çekim önce gelir.
- Arşiv içeriği özgün tarih ve kaynak URL'si ile korunur.
- AI üretimleri AI LAB içinde açıkça etiketlenir.
- Kaynak veya izin doğrulanmadan üçüncü taraf medya yayınlanmaz.
- Sosyal otomatik yayın, kaynak + gerçek medya + platforma uygun format + editoryal onay koşullarını geçmeden çalıştırılmamalıdır.

## Worker secret gereksinimleri

Instagram:
- META_ACCESS_TOKEN
- META_IG_USER_ID

Facebook:
- META_ACCESS_TOKEN
- META_PAGE_ID

TikTok:
- TIKTOK_ACCESS_TOKEN
- TIKTOK_OPEN_ID

YouTube:
- YOUTUBE_CLIENT_ID
- YOUTUBE_CLIENT_SECRET
- YOUTUBE_REFRESH_TOKEN

## Google bağlantıları

Google Drive ve Google Calendar entegrasyonları bu çalışma ortamında yönetici tarafından devre dışı bırakılmış durumda. Bu nedenle:
- Drive master archive -> Media Vault otomatik import henüz etkin değil.
- Calendar -> yayın/çekim takvimi senkronu henüz etkin değil.

Bu iki bağlantı açıldığında hedef akış:
Drive -> metadata/kaynak kontrolü -> R2/D1 -> Social Studio -> Metricool schedule
Calendar -> çekim/yayın etkinliği -> Social Studio takvimi

## Site entegrasyonu

Ana siteye /api/public/social-feed endpoint'i eklendi.
public/data/social-feed.json Metricool doğrulama snapshotını tutuyor.
Ana sayfaya Social Desk eklendi.
Admin/Social Studio ile editoryal yayın mantığı korunuyor.

Not: Snapshot, sürekli canlı API senkronu değildir. Sürekli senkron için Worker tarafındaki sosyal OAuth/secret bağlantıları gereklidir.
