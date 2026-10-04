# BTMEDYA V10 — Award-Level Design Direction

## Amaç
Mevcut BTMEDYA mimarisini bozmadan, uluslararası ödüllü dijital deneyimlerde görülen sinematik anlatım, editoryal tipografi, motion ve güçlü medya kullanımı prensiplerini BTMEDYA kimliğine uyarlamak.

## Kaynak mimari korunuyor
- GitHub: kod ve sürüm geçmişi
- Cloudflare Worker: uygulama/API
- D1: haber ve içerik kayıtları
- R2: fotoğraf/video/ses/doküman
- Admin: günlük içerik ve medya yönetimi
- `/api/public/media`: canlı portföy medya kaynağı
- `/api/news`: canlı haber kaynağı

## V10 deneyim akışı
1. Hero / gerçek medya video
2. Manifesto / marka fikri
3. Hizmetler
4. Gerçek işler / portföy
5. Haber akışı
6. Siyah Oda / podcast
7. AI LAB / açık AI etiketi
8. Kurucu / editoryal kimlik
9. İletişim

## Görsel prensipler
- Siyah / antrasit zemin
- Kırık beyaz tipografi
- Kontrollü altın vurgu
- DM Serif Display + Manrope
- Büyük editoryal başlıklar
- Full-bleed gerçek medya
- Kart kalabalığı yerine sinematik çalışma alanları
- AI üretimleri yalnızca AI LAB içinde ve açık etiketle

## Medya slotları
- HERO_DESKTOP
- HERO_MOBILE
- HERO_POSTER
- PORTFOLIO_01 ... PORTFOLIO_N
- NEWS_COVER
- PODCAST / SIYAH ODA
- AI_LAB

## Performans
- `preload="metadata"`
- `playsinline`, `muted`
- poster fallback
- `prefers-reduced-motion`
- lazy-loaded images
- canlı medya API'den gelen içerik
- ağır WebGL zorunlu değil, progressive enhancement tercih edilir

## Ödül referanslarından alınan teknik fikirler
D&AD'nin ödüllü dijital örneklerinde scroll tabanlı anlatım, özel etkileşimler, sinematik case-study yapısı, motion ve sesin birlikte düşünülmesi öne çıkıyor. BTMEDYA V10 bunları kopyalamadan, kendi gazetecilik + prodüksiyon kimliğine uyarlıyor.

## Uygulama durumu
- `public/v10/index.html` oluşturuldu.
- `public/v10/v10.css` oluşturuldu.
- `public/v10/v10.js` oluşturuldu.
- V10 medya alanı `/api/public/media` ile canlı bağlandı.
- V10 haber alanı `/api/news` ile canlı bağlandı.
- `/v10/`, `/v10/index.html` ve `/api/health` için smoke test workflow'u eklendi.
- Mevcut ana sayfa henüz silinmedi/değiştirilmedi. Önce V10 görsel son kontrolü yapılacak, ardından root'a kontrollü aktarım yapılacak.
