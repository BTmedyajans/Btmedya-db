# BTMEDYA Social Integration Status

Tarih: 25 Eylül 2026

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
