# BTMEDYA Web + Social Content System
## 2026-09-29

Bu belge BTMEDYA'nın web sitesi, haber merkezi, sosyal yayın ve AI LAB katmanlarının aynı editoryal sistemle çalışması için referans mimaridir.

## 1. Marka omurgası

Ana ifade:
- Gerçek saha
- Kaynak görünür
- Arşiv ayrı
- AI açıkça etiketli
- İçerikten yayına tek zincir

Ana üretim alanları:
1. HABER
2. PRODÜKSİYON
3. MEDYA
4. AI LAB

Gerçek fotoğraf/video ana görsel kaynaktır. AI üretimleri ayrı AI LAB alanında tutulur ve "AI ÜRETİMİ" / "AI DESTEKLİ" etiketi taşır.

## 2. Web bilgi mimarisi

ANA SAYFA
- Sinematik hero
- Live Desk
- BT World
- Manifesto
- Haber akışı
- Saha / portföy
- Prodüksiyon
- AI LAB
- Kaynak Masası
- Teklif / iletişim

HABER
- Balıkesir
- İlçeler
- Türkiye
- Dünya
- Gündem
- Ekonomi
- Eğitim
- Sağlık
- Kültür
- Spor
- Teknoloji / AI
- Özel Haber
- Arşiv

## 3. Haber kayıt standardı

Her yayın kaydında mümkün olduğunca:
- başlık
- slug
- özet / spot
- kategori
- yayın tarihi
- güncelleme tarihi
- yazar / editoryal masa
- kaynak
- kaynak URL
- kapak medya anahtarı
- lisans / görsel künyesi
- AI durumu
- haberin güncel veya arşiv olduğu
- sosyal türevleri

bulundurulur.

Arşiv içerikleri güncel veri gibi sunulmaz.

## 4. Sosyal içerik formatları

FLASH
- son dakika
- tek güçlü görsel
- kısa açıklama
- kaynak

SAHA
- gerçek saha görüntüsü
- röportaj
- altyazı
- muhabir / marka kimliği

60 SANİYEDE
- ilk 2 saniye kanca
- temel bilgi
- kaynak
- web haberi CTA

VERİ MASASI
- tek konu
- rakam / karşılaştırma
- açıklayıcı grafik
- kaynak

ÖZEL DOSYA
- çoklu görsel / carousel
- kısa bağlam
- haber bağlantısı

BTMEDYA AI LAB
- AI üretimi açık etiket
- kullanılan üretim türü
- gerçek haberden ayrıştırılmış görsel dünya

## 5. Platform rolleri

Instagram
- Reels
- Carousel
- Stories
- saha fotoğrafı
- portföy / kamera arkası

Facebook
- haber linki
- yerel gündem
- açıklamalı görsel
- Reels

TikTok
- dikey kısa video
- hızlı kanca
- saha + olay + kaynak
- 9:16

YouTube
- Shorts
- uzun video
- haber açıklaması
- seri / oynatma listesi

Aynı haber her platforma aynı metinle kopyalanmak yerine platform rolüne göre türetilir.

## 6. Üretim zinciri

Kaynak
→ Editoryal kontrol
→ BTMEDYA haber kaydı
→ Gerçek medya seçimi
→ Sosyal türevler
→ Onay
→ Planlama
→ Metricool
→ Yayın
→ Yayın sonucu
→ Analiz / arşiv

Worker sosyal kuyruğunda yalnızca onaylanmış, gelecekte tarihli kayıtlar Metricool'a teslim edilir.

## 7. Metricool durumu

2026-09-29 denetiminde BTMEDYA'nın doğrulanmış Metricool Brand'i:
- Brand: busetuncayy10
- Brand ID: 6858384
- User ID: 5278969
- Timezone: Europe/Istanbul

API üzerinden doğrulanan ağlar:
- TikTok: btmedya1010
- YouTube: UCGyRifwCyrKJQAbmo4uoO9g

Instagram ve Facebook'un aynı Metricool Brand'e bağlı olduğu henüz API tarafında doğrulanmış değildir. Bu nedenle uygulama bunları bağlı olarak göstermemelidir.

## 8. Admin Control Center

Admin panelindeki sosyal ağ kontrolleri canlı Worker durumuna göre davranır:
- doğrulanmış ağ: seçilebilir
- bağlantısı görülen ancak Worker listesinde olmayan ağ: uyarı
- doğrulanmayan ağ: pasif

Control Center; site, Worker, D1, R2, admin secrets, Metricool ve sosyal ağ matrisini birlikte gösterir.

## 9. Mobil tasarım

Mobil tasarım masaüstünün küçültülmüş kopyası değildir.
- tek kolon haber akışı
- 16:10 / 16:9 kontrollü medya alanı
- dengeli başlık ölçeği
- minimum 44 px etkileşim alanı hedefi
- safe-area dikkati
- yatay taşma kontrolü
- reduced-motion desteği
- hero'da düşük veri yükü

## 10. Editoryal görsel hiyerarşi

1. Gerçek saha fotoğrafı / video
2. BTMEDYA grafik şablonu
3. Temsili ve lisans bilgisi görünür medya
4. AI üretimi, yalnızca açık AI LAB etiketiyle

## 11. Teknik değişiklik ilkesi

Yayın zinciri kullanıcıya ait hesaplarda geri döndürülemez veya herkese açık bir işlem yapmadan önce doğrulanır. Secret/token değerleri kaynak koduna veya sohbet mesajlarına yazılmaz.

## 12. Sonraki evre

Instagram + Facebook Metricool Brand bağlantısı API ile doğrulandığında:
- ağlar Worker konfigürasyonuna eklenir
- admin seçimleri aktifleşir
- sosyal otomasyon şablonları dört platforma genişletilir
- aynı haberden platforma özgü türevler üretilebilir
