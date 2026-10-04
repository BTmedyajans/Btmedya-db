# BTMEDYA Marka ve İçerik OS
Tarih: 29 Eylül 2026

## Marka omurgası
BTMEDYA'nın ortak görsel dili; koyu haber odası zemini, yüksek okunabilirlik, lime aksiyon rengi, cyan yalnızca AI işaretleyicisi, monospace bilgi etiketleri ve güçlü Bricolage/Space başlıklarıdır.

## Editoryal ritim
1. Ne oldu?
2. Nerede ve ne zaman?
3. Kaynak kim?
4. Görsel neyi kanıtlıyor?
5. Okur bundan sonra ne bilmeli?

## Medya hiyerarşisi
Gerçek çekim -> Arşiv görseli -> BTMEDYA grafiği/harita -> Temsili görsel. AI üretimleri ayrı AI LAB katmanında ve açık etiketle görünür.

## Wire-service esini
Anadolu Ajansı'nın yoğun kategori navigasyonu, veri bandı, kısa video/infografik ayrımı ve editör seçkisi; AFP'nin gerçek zamanlı haber, fotoğraf/video ve ürün-servis ayrımı; Reuters'ın yoğun başlık ve konu akışı referans alınır. BTMEDYA'nın metinleri, renk kullanımı ve bileşenleri özgündür.

## Şablon sistemi
Makine-okunabilir şablonlar: public/data/btmedya-content-templates.json

Site ve sosyal çıktısı aynı alan setinden beslenebilir:
- haber-son-dakika
- haber-standart
- ozel-haber
- vaka-calismasi
- sosyal-reel-remix
- sosyal-duyuru
- ai-lab-demo

## Remotion
9:16 kısa içeriklerde social-remix, duyurularda announcement-brief aileleri esas alınır. Sahne sırası: hook/başlık -> görsel kanıt -> kısa maddeler -> takeaway -> CTA.

## Admin akışı
Taslak -> kaynak kontrolü -> medya/provenance kontrolü -> editoryal metin -> yayına hazırlama -> site -> Metricool sosyal kuyruğu. Otomatik dağıtım, editör onayı olmadan haber metnini yayınlamaz.

## Supabase
Bağlı BTMEDYA Supabase projesi kontrol edildi. public şemasında tablo bulunmadı; ayrıca rls_auto_enable() SECURITY DEFINER fonksiyonu anon/authenticated tarafından çağrılabilir uyarısı verdi. Mevcut production mimarisi zaten Cloudflare D1/R2 üzerine kurulu olduğu için Supabase ikinci bir production backend olarak eklenmedi. Gerekirse Supabase staging/deney alanı olarak kullanılabilir.

## Google Drive / Remote Desktop
Google Drive, orijinal/master medya arşivinin kaynağı olarak tutuluyor. Live Drive bytes için bu oturumda doğrudan Drive dosya kimliği/linki verilmedi. Remote Desktop Commander bağlı cihaz döndürmedi, bu nedenle yerel bilgisayardan sessizce dosya taraması yapılmadı.

## Kalite kapıları
Kaynak görünür değilse yayın yok. Belirsiz kapak provenance'ı temsili olarak etiketlenir. AI içerik gerçek haber arşivine karışmaz. Mobilde temas alanları, final-boyut okunabilirliği ve reduced-motion desteği korunur.
