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
→ BTMEDYA Native Social OS
→ Cloudflare D1 queue
→ Direct official API publish
→ Yayın sonucu
→ Analiz / arşiv

Worker sosyal kuyruğunda yalnızca onaylanmış, gelecekte tarihli kayıtlar Native Social OS'a teslim edilir.

## 7. Doğrudan sosyal hesap bağlantı durumu

BTMEDYA'nın yayın sistemi sosyal ağları her biri için ayrı resmî OAuth/API yetkisiyle bağlar. Önceki Metricool Brand/user kayıtları yalnızca geçmiş entegrasyonun kaydıdır; yeni yayın akışında kullanılmaz.

Doğrudan bağlantılar:
- Facebook: BTMEDYA Facebook Page; Meta OAuth ile ayrıca yetkilendirilir.
- Instagram: @btmedyajans; Professional/Business/Creator hesabı ve gereken Meta izinleri ayrıca yetkilendirilir.
- TikTok: @btmedya1010; Content Posting API izni ve kullanıcı OAuth'u gerekir.
- YouTube: @BTmedyaAjans; Google OAuth ve YouTube Data API gerekir.

Profil URL'sinin web sitesinde görünmesi otomatik yayın izni anlamına gelmez. Yönetim paneli, D1 içindeki aktif doğrudan hesap bağlantılarını ve OAuth uygulama ayarlarını birbirinden ayrı gösterir. Metricool Brand ID'si veya Metricool tokenı gerekmez.

## 8. Admin Control Center

Admin panelindeki sosyal ağ kontrolleri gerçek doğrudan OAuth durumuna göre davranır:
- Uygulama ayarı hazır ve hesap OAuth'u tamamlanmışsa doğrudan yayın yapılabilir.
- Uygulama kimlik bilgisi eksikse Connect Merkezi eksik Worker değişken/secret adlarını gösterir.
- Hesap bağlanmamışsa yalnızca profil bağlantısı bulunması nedeniyle yayın yapılmaz.
- Planlı gönderiler Cloudflare D1 kuyruğunda izlenir; hatalar ve gerçek dış gönderi kimliği panelde tutulur.

Control Center; site, Worker, D1, R2, admin secrets, Native Social OS ve sosyal ağ matrisini birlikte gösterir.

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

## 12. Doğrudan yayın için kalan kullanıcı yetkilendirmesi

Sosyal yayın motoru Metricool'dan bağımsızdır. Her hedef platformun resmî geliştirici uygulaması ve OAuth bağlantısı tamamlandığında:
- platform doğrudan Worker/D1 kuyruğunda kullanılabilir olur
- admin hesap seçimleri aktifleşir
- uygun medya türüne göre sosyal varyasyonlar üretilir
- her gönderi gerçek platform yanıtıyla doğrulanır

API kimlik bilgileri kullanıcı tarafından GitHub Secrets üzerinden eklenir; secret değerleri sohbete veya kaynak koda yazılmaz.
