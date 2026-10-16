# BTMEDYA Deneme Sürümü: Navigasyon ve Otomasyon
Tarih: 15 Ekim 2026
Durum: Pilot kapsamı; production'a alınmadan önce kontrol edilecek.

## Amaç
Mevcut çalışan siteyi bozmadan ana navigasyon, portföy sunumu ve içerik otomasyonlarını küçük bir pilotla doğrulamak.

## Navigasyon kararı
Kanonik kategori sözlüğü `public/data/btmedya-taxonomy.js` tek kaynak olmaya devam eder. Kamu menüsü ile admin paneli ayrı ayrı sabitlenmez; ikisi aynı sözlükten beslenir.

Müşteri tarafındaki üç giriş:
1. **Haberler** — Balıkesir, Türkiye, röportaj, özel dosya ve Siyah Oda.
2. **Hizmetler** — sosyal medya yönetimi, reklam kampanyaları, web/SEO, otomasyon ve dijital deneyim.
3. **Portfolyo** — sosyal medya işleri, reklam kreatifleri, tanıtım filmleri, motion graphics, düğün/etkinlik videoları, kurumsal kimlik, logo ve kartvizit.

İç sistemdeki mevcut üç üretim yolu korunur: Haber & Medya, Sosyal & Dijital, Marka & Prodüksiyon. Yeni etiketler bu mevcut yolların üstüne haritalanır; mevcut URL'ler ve kayıt anahtarları gerekmedikçe değiştirilmez.

## Siyah Oda
Siyah Oda, Haberler altında ayrı bir program sayfası olarak kalır. YouTube podcast bölümleri için kapak, bölüm açıklaması, video URL'si, yayın tarihi ve sosyal kesit bağlantıları tutulur.

## Pilot otomasyon akışı
1. İçerik admin panelinde taslak olarak oluşturulur.
2. Kaynak, kategori, medya ve AI/gerçek çekim etiketi doğrulanır.
3. Önizleme ve SEO temel kontrolleri yapılır.
4. İnsan onayıyla yayına alınır.
5. Sosyal gönderi, yalnızca ilgili platform hesabı yetkilendirilmişse yayın kuyruğuna eklenir; aksi durumda taslak kalır.
6. Haftalık rapor; yayınlanan içerik, sosyal teslim durumu ve erişilebilir teknik sağlık sinyallerini özetler.

## İlk pilotta kapsam dışı
- İzinsiz veya doğrulanmamış otomatik sosyal yayın.
- Canlı DNS, kimlik doğrulama veya veritabanı şeması değişikliği.
- Yeni ücretli API/abonelik açılması.
- Ana sayfa videosunun değiştirilmesi; yeni video varlığı ayrıca doğrulanmalıdır.

## Kabul ölçütleri
- Mobil ve masaüstünde üç giriş yolu anlaşılır ve kullanılabilir.
- Public menü ve admin kategori seçimleri aynı kategori sözlüğüyle tutarlı.
- Siyah Oda bağlantısı doğru sayfaya gider.
- İçerik taslak/onay/yayın durumu net görünür.
- Yetkisiz sosyal hesaplara otomatik gönderim yapılmaz.
- Ana sayfa ve `/api/health` smoke testleri başarılı olmadan production'a geçilmez.

## Uygulama sırası
1. Mevcut sayfalar ve kategori sözlüğüyle fark analizi.
2. Küçük UI değişikliği ve testler.
3. Taslak PR ve CI doğrulaması.
4. Onay sonrası production dağıtımı.
