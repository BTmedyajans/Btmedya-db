# BTMEDYA — Dropbox Medya Envanteri ve Site Eşleştirmesi

Tarih: 2026-10-13  
Durum: Envanter hazır; canlıya aktarım ve yayınlama beklemede.  
Kaynak: Bağlı Dropbox hesabındaki kök klasör ve `Site arşiv/` klasörü. İncelemede 178 dosya görüldü: 118 JPG, 53 PNG, 5 MOV ve 2 TIFF.

## Yayın mimarisi

Kanonik kaynak: `BTmedyajans/Btmedya-db` / `main`  
Yayın: GitHub Actions / Wrangler → Cloudflare Worker `btmedya-db` → `btmedya.com.tr`  
Medya: Cloudflare R2 `btmedya-media` ve Media Vault/D1 metadata.

Dropbox, üretim sitesi için kalıcı medya CDN'i olarak kullanılmamalıdır. Dropbox geçici indirme bağlantıları kısa ömürlüdür. Kullanılacak dosyalar Media Vault üzerinden R2'ye aktarılmalı, metadata kaydı oluşturulmalı ve yayına uygunluk kontrol edilmelidir.

## Öncelikli adaylar

| Dropbox dosyası | Önerilen hedef | Kullanım kararı |
|---|---|---|
| `btmedya-studio-hero.png` | Video prodüksiyon / stüdyo sayfası | Görsel kontrolü ve sıkıştırma sonrası aday |
| `siyah-oda-hero.jpg` | Siyah Oda / podcast | Mevcut kamera arkası görseliyle karşılaştır; doğrulanmadan değiştirme |
| `BTMEDYA_robot_9x16_1080x1920-2.png` | AI LAB / dikey kreatif | AI üretimi etiketiyle aday |
| `BTMEDYA_robot_9x16_1080x1920-3.png` | AI LAB / dikey kreatif | `-2.png` ile aynı boyut (1,442,009 bayt); olası kopya, ikisini birden yayımlama |
| `hero-character-poster.jpg` | Giriş videosu poster adayı | Mevcut mobil/masaüstü posterlerinin yerine otomatik geçirme |
| `scene-start.jpg` | Hero/storyboard başlangıç karesi | Tasarım/önizleme materyali |
| `scene-end.jpg` | Hero/storyboard bitiş karesi | Tasarım/önizleme materyali |
| `collage-1.jpg` | Portföy/AI LAB taslak görseli | İçerik ve hak kontrolünden sonra |
| `SXHS2900.MOV` | Gerçek çekim arşivi | İçeriği izlenmeden sınıflandırma veya yayınlama yok |
| `SXHS2901.MOV` | Gerçek çekim arşivi | İçeriği izlenmeden sınıflandırma veya yayınlama yok |
| `SXHS2902.MOV` | Gerçek çekim arşivi | 564,478,464 bayt; önce düşük çözünürlüklü önizleme/kurgu kopyası üret |
| `SXHS2903.MOV` | Gerçek çekim arşivi | İçeriği izlenmeden sınıflandırma veya yayınlama yok |
| `SXHS2904.MOV` | Gerçek çekim arşivi | 4,749,569,024 bayt (~4.75 GB); doğrudan web'e koyma, önce seçki ve web çıktısı üret |

## Mevcut ana sayfa ile uyum

Ana sayfanın `public/index.html` dosyasında geniş ve dikey giriş videosu için ayrı kaynaklar zaten tanımlı:

- `/assets/media/web/btmedya-hero-web.mp4`
- `/assets/media/web/btmedya-hero-mobile.mp4`
- WebM alternatifleri ve her oran için ayrı posterler

Aynı klasörde ayrıca `btmedya-tanitim-v5`, `giris-ai`, `giris-filmi`, `hero-story` ve `showreel` varyantları bulunuyor. Bu nedenle yeni dosya adları mevcut hero kaynaklarının üzerine yazılmamalı. Önce kısa bir A/B görsel incelemesi, mobil kırpma kontrolü ve mevcut giriş akışına uygunluk testi yapılmalı.

## Metadata sözleşmesi

Her dosya Media Vault üzerinden yüklendiğinde, desteklenen alanlar mümkün olduğunca doldurulmalı:

- `source_url`: kaynak/Dropbox arşiv bilgisi veya orijinal kaynak URL'si
- `source_type`: `real_footage`, `user_asset` veya `ai_generated`
- `rights_status`: `confirmed`, `pending` veya uygun mevcut enum
- `credit`: gerekli kaynak/üretici bilgisi
- `captured_at`: çekim/üretim tarihi biliniyorsa
- `ai_generated`: `true` / `false`
- `alt_text`: görseli açıklayan kısa Türkçe metin
- `usage_scope`: `homepage`, `production`, `black-room`, `ai-lab` veya `portfolio`

Not: Yukarıdaki değerler kavramsal eşleştirmedir; uygulamadaki enum ve alan adları yükleme öncesinde Media Vault/Worker şemasıyla doğrulanmalıdır. Bilinmeyen kullanım hakkı `confirmed` yapılmamalıdır.

## Yayın öncesi kontrol listesi

- [ ] Görsel/video içeriğini açıp gerçekten hedef bölüme uygun olduğunu doğrula.
- [ ] Hak ve kaynak durumunu doğrula; belirsizse taslakta bırak.
- [ ] `-2` / `-3` robot dosyalarını hash ile karşılaştırıp kopya olup olmadığını kesinleştir.
- [ ] Çok büyük MOV dosyalarını doğrudan ana sayfaya ekleme; seçilmiş kısa MP4/WebM çıktısı oluştur.
- [ ] Görsel boyutlarını ve oranlarını doğrula; WebP/AVIF veya uygun sıkıştırılmış web çıktısı hazırla.
- [ ] Media Vault'ta AI/gerçek çekim ayrımını ve alt metni kaydet.
- [ ] Mobil (dikey) ve masaüstü (geniş) ana sayfada poster, autoplay-muted, playsinline, reduced-motion ve fallback davranışlarını test et.
- [ ] Deploy sonrası ana sayfa, ilgili hedef sayfalar, medya URL'leri ve mobil görünümü doğrula.

## Güvenli uygulama sınırı

Bu envanter tek başına hiçbir dosyanın canlıya alındığını, haklarının doğrulandığını veya site tasarımının değiştirildiğini ifade etmez. Canlı değişiklik, dosyalar Media Vault'a aktarıldıktan ve önizleme/metadata doğrulaması tamamlandıktan sonra ayrı bir kod değişikliği ve deploy ile yapılmalıdır.
