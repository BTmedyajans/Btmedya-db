# BTMEDYA Canonical Taxonomy

## Amaç

BTMEDYA'nın müşteri-facing sitesi ile `/admin/` operasyon paneli aynı kategori sözlüğünü kullanır.

> Önce müşterinin niyetini seç. Sonra üretim alanını, formatı ve dağıtımı sistem belirlesin.

## Üç ana yol

### 01 · HABER & MEDYA

Müşterinin aradığı: haber, röportaj, özel dosya, arşiv veya medya içeriği.

Alt kırılımlar:
- **HABERİ BUL:** Balıkesir, Türkiye, Dünya
- **DERİNLEŞTİR:** Röportaj, Özel Dosya, Siyah Oda / YouTube
- **ARŞİV & KANIT:** Haber Arşivi, Gerçek Medya Arşivi, Dosyalar

Otomasyon ailesi:
`News Intelligence → Kaynak Masası → AI Editör → SEO/AEO → Önizleme → Onay → Yayın → IndexNow`

### 02 · SOSYAL & DİJİTAL

Müşterinin aradığı: sosyal medya yönetimi, içerik üretimi, platform dağıtımı, SEO, AI veya web/dijital büyüme.

Alt kırılımlar:
- **İÇERİK ÜRET:** Sosyal Medya Yönetimi, Reels / Shorts, Post / Carousel
- **KANALLAR:** Instagram + Facebook, TikTok + YouTube, X + WhatsApp
- **DİJİTAL BÜYÜME:** SEO/AEO, AI LAB + Otomasyon, Web + Dijital Deneyim

Otomasyon ailesi:
`Client Workspace → Media Vault → Native Provider → Metricool Fallback → Queue → Publish → Measure`

### 03 · MARKA & PRODÜKSİYON

Müşterinin aradığı: tanıtım filmi, ürün/hizmet içeriği, etkinlik, düğün/özel gün, portföy veya teklif.

Alt kırılımlar:
- **MARKA İÇERİĞİ:** Tanıtım Filmi, Ürün / Hizmet İçeriği, Kampanya & Reklam Kreatifi
- **ÇEKİM & PRODÜKSİYON:** Düğün / Özel Gün, Etkinlik, Fotoğraf + Video Prodüksiyon
- **VİTRİN & SATIŞ:** Portföy, Vaka Çalışmaları, Teklif / Proje Başlat

Otomasyon ailesi:
`Brief → Proje → Media Vault → Production → Approval → Portfolio/Case → Social Distribution → Sales`

## AI LAB neden ayrı ana kategori değil?

AI, müşterinin başlı başına aradığı bir iş alanı olmaktan çok BTMEDYA'nın üretim kabiliyeti olarak konumlanır.

- Sosyal & Dijital altında **AI LAB + Otomasyon**
- Marka & Prodüksiyon altında AI destekli üretim
- Haber & Medya'da AI Editör

## Teknik kaynak

Ortak sözlük:
`public/data/btmedya-taxonomy.js`

Admin ve public hamburger menüleri bu dosyayı okur.

İçerik kayıtlarında geriye dönük `news.category` alanı korunur. Yeni yapısal koordinatlar `content_taxonomy` tablosunda tutulur:

- `path_key`
- `group_key`
- `item_key`
- `secondary_json`

## Entegrasyon ilkesi

### Core
- GitHub — kaynak ve sürüm
- Cloudflare Worker — uygulama katmanı
- D1 — yapılandırılmış operasyon verisi
- R2 — medya kasası
- KV — state, OAuth ve rate-limit
- Workflow / Durable Object — uzun süreçler ve operasyon durumu

### Native adapter
- Meta Direct
- TikTok API
- YouTube API
- X API
- WhatsApp Cloud

### Fallback / optional
Metricool, Canva, Google Search Console, HubSpot, Google Drive, Figma, Notion ve Slack çekirdek sistem değildir.

Üçüncü taraf bir uygulama başarısız olduğunda BTMEDYA'nın ana veri modeli ve medya arşivi bozulmamalıdır.

## Manus / Macaly / Claude Code yaklaşımı

Repo geçmişindeki alternatif araç önerileri üretim backend'i değil, tasarım ve geliştirme referansıdır.

Üretim kaynak gerçekliği:
`GitHub main → Cloudflare Workers → D1/R2/KV`

Kategori veya otomasyon mantığının Manus, Macaly, Convex veya ayrı bir backend'e bağımlı olması kabul edilmez.

## UX kuralı

İlk bakışta kullanıcı şu üç sorudan birini cevaplayabilmelidir:

**Haber mi? → 01**

**Dijital/sosyal büyüme mi? → 02**

**Marka/çekim/prodüksiyon mu? → 03**

Alt kategoriler ancak ikinci adımda açılır. Teknik servis adları ana navigasyona taşınmaz.
