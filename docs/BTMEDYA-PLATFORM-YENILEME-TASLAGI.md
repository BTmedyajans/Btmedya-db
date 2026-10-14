# BTMEDYA Uluslararası Dijital Medya Platformu — Yenileme Taslağı

**Durum:** Taslak / denetim ve planlama. Bu belge tek başına canlı dağıtım onayı değildir.
**Kaynak depo:** BTmedyajans/Btmedya-db
**Üretim yolu:** GitHub `main` → `.github/workflows/deploy-production.yml` → Wrangler → Cloudflare Worker `btmedya-db`
**Alan adı:** `https://btmedya.com.tr`
**Teknik ilkesi:** Mevcut mimariyi koru; küçük, test edilebilir değişiklikler; ayrı dal/PR; canlı deploy öncesi doğrulama ve açık onay.

## Hedef
BTMEDYA'yı haber, dijital içerik ve prodüksiyon alanlarını tek marka altında toplayan, uluslararası kullanıcının da kolayca anlayabileceği bir platform haline getirmek. Haber doğruluğu ve editoryal kontrol korunurken arayüz, yönetim ve dağıtım süreçleri sadeleştirilecek.

## Çalışma kuralları
- Önce mevcut kaynak, API, veri şeması ve iş akışlarını oku.
- Üretimdeki dosyaları doğrudan değiştirme; taslakları ayrı dalda ve PR içinde hazırla.
- DNS, Worker yapılandırması, secrets, migration, sosyal hesap izinleri ve canlı dağıtım gibi riskli işlemler için açık onay al.
- Anahtarları veya kişisel tokenları hiçbir zaman koda/issue/PR'a koyma.
- Gerçek haber içeriğini uydurma; kaynağı olmayan bilgi otomatik yayımlanmasın.
- Test kanıtı yoksa başarı iddiası yazma. Başarısız adımı düzeltmeden sonraki gruba geçme.

## Taslak yol haritası

### P0 — Envanter ve temel güvenlik
- [ ] `main`, açık PR'lar, son deploy, workflows ve son başarısız işler envanterini çıkar.
- [ ] `/api/health`, ana sayfa, www → apex yönlendirmesi, robots, sitemap, RSS, haber arşivi ve yönetim paneli rotalarını canlıdan doğrula.
- [ ] Cloudflare'da yalnızca okuma denetimi: Worker, D1, R2, zone, DNS kayıtları, route, log/observability ve bindings envanteri.
- [ ] Gizli değerlerin yalnızca GitHub Actions Secrets / Cloudflare Worker Secrets tarafında kullanıldığını kontrol et; değerlerini dökme.
- [ ] R2 medya arşivi, D1 şema ve migration'lar için yedek/geri dönüş prosedürünü kanıtla.
- [ ] Açık PR #413 (saatlik haber kapağı otomasyonu) tasarım çalışmasından ayrı değerlendirilsin; bağımsız onay olmadan birleştirilmesin.

### P1 — Marka platformu ve tasarım dili
- [ ] Logo varyantları: yatay, kare ikon, açık/koyu zemin, favicon, sosyal avatar.
- [ ] Marka token'ları: ana renkler, vurgular, yüzeyler, metin kontrastı, tipografi, boşluk, köşe, gölge ve hareket standartları.
- [ ] Haber kapağı kılavuzu: fotoğraf oranı, güvenli alan, kategori etiketi, tarih/yazar ve AI/sponsor açıklaması.
- [ ] Sosyal şablonları: 9:16 Reels/Shorts, 1:1/4:5 post, 16:9 video/YouTube, 1200×630 paylaşım önizlemesi.
- [ ] Aşırı hareket, gizli imleç, gereksiz efekt ve küçük metinlerin erişilebilirlik/performans etkisini denetle.
- [ ] Gerçek BTMEDYA logosu/varlıkları envanterlenmeden logo değiştirilmesin.

### P2 — Bilgi mimarisi / kategori ağacı
Ana navigasyonda üç ana giriş:
1. **Haber**
   - Balıkesir
   - Türkiye
   - Dünya
   - Gündem ve politika
   - Ekonomi ve iş dünyası
   - Teknoloji ve yapay zekâ
   - Eğitim
   - Kültür-sanat
   - Yaşam
   - Spor
   - Röportajlar ve özel dosyalar
2. **Sosyal Medya ve Dijital**
   - Sosyal medya yönetimi
   - İçerik stratejisi ve takvim
   - Reels/Shorts üretimi
   - SEO ve dijital yayıncılık
   - Performans raporları
   - Otomasyon ve entegrasyon
3. **Marka ve Prodüksiyon**
   - Reklam/tanıtım filmi
   - Kurumsal video
   - Etkinlik ve düğün çekimleri
   - Röportaj/belgesel/podcast
   - AI LAB
   - Portföy ve vaka çalışmaları
Ortak sabit aksiyonlar: Haber ihbar et, düzeltme bildir, reklam/iş birliği teklifi al, iletişim.
- [ ] Var olan URL'ler ve içerikler yeni ağaçla eşleştirilsin; URL değiştirmek gerekiyorsa 301 eşleştirme tablosu oluşturulsun.
- [ ] Haber, sponsorlu içerik, ajans hizmeti ve AI ile üretilen materyalin etiketleri ayrıştırılsın.
- [ ] Kategori başına benzersiz açıklama, SEO başlığı, H1, breadcrumb ve ilgili içerikler planlansın.

### P3 — Ana sayfa, haber sayfası ve mobil/masaüstü
- [ ] Masaüstü haber portalı: net üst navigasyon, son dakika alanı, öne çıkan haber, kategori blokları, video ve ajans CTA'ları.
- [ ] Mobil haber deneyimi: okunabilir metin, dokunma alanları, hızlı kategori menüsü, arama, paylaşım ve sabit gezinme çakışma testi.
- [ ] Mobil ve masaüstü için ayrı içerik hiyerarşileri; tek kaynak/veri modeli ve responsive bileşenler.
- [ ] Hero video için yükleme, sessiz oynatma, kullanıcı tercihleri, poster/fallback, mobil performans ve prefers-reduced-motion davranışı.
- [ ] Haber sayfası: başlık, spot, yazar, yayın/güncelleme saati, kaynak, gövde, galeri/video, ilgili haber, düzeltme ve paylaşım.
- [ ] Arşiv/arama: filtre, sayfalama, boş sonuç, yanlış URL ve geri tuşu testleri.
- [ ] Erişilebilirlik: klavye, odak, kontrast, semantik başlıklar, alt metin ve ekran okuyucu temel denetimi.
- [ ] Android küçük ekran, büyük ekran, tablet ve masaüstü viewport testleri; mümkünse gerçek cihazdan ekran görüntüleri.

### P4 — Admin / Haber Odası
- [ ] Mevcut `/admin/agency-os/` ve `/admin/site-os/` modüllerini haritalandır.
- [ ] Tek menü altında: Genel Bakış, Haberler, Kategoriler, Medya Kasası, Sosyal Yayın, Hizmetler/Portföy, SEO, Analitik, Sistem Sağlığı.
- [ ] Haber durumları: Fikir → Taslak → Kaynak kontrolü → Editör onayı → Zamanlandı → Yayında → Düzeltildi/Arşiv.
- [ ] Haber formunda zorunlu başlık, spot, gövde, kategori, yazar, kaynak/kanıt, kapak, SEO ve güncelleme alanları.
- [ ] Medya kasasında dosya önizleme, oran/çözünürlük, erişim durumu, lisans/kaynak, AI üretim işareti ve kullanım yeri.
- [ ] Mobil panelde sadeleştirilmiş menü; geniş tablo yerine kartlar ve belirgin birincil aksiyon.
- [ ] Rol/yetki ve oturum süresi denetimi; yetkisiz API isteklerinin reddedilmesi.
- [ ] Form hataları ve başarı durumları kullanıcıya doğru gösterilsin; erişim tokenları tarayıcı loglarına sızmasın.

### P5 — Haber üretim otomasyonu
- [ ] RSS/API/kaynak içe alımları allowlist üzerinden çalışsın; kaynağın yayın tarihi ve orijinal URL kaydedilsin.
- [ ] Otomatik özet/başlık önerisi yalnızca editör taslağı üretsin; kaynakta olmayan iddia eklemesin.
- [ ] Duplikasyon denetimi, eski haber uyarısı, saat/tarih normalizasyonu ve kaynak erişilebilirlik kontrolü.
- [ ] Kapak seçimi: lisans/kaynak, içerikle eşleşme, doğru kırpma, fallback ve görsel doğrulama.
- [ ] Son dakika veya hassas iddialarda insan onayı zorunlu.
- [ ] Saatlik iş akışlarında idempotency, tekrar denemeler, hata kuyruğu ve bildirim.
- [ ] Kaynak/kanıt alanı olmayan haber otomatik yayınlanmasın.

### P6 — Metricool ve sosyal medya
- [ ] Bağlı Metricool markalarını, sağlayıcıları, zamanlanmış gönderileri ve yayın saat dilimini salt okunur biçimde eşle.
- [ ] Web haberinden her platform için farklı metin uzunluğu, hashtag, alt metin, medya oranı ve CTA üret.
- [ ] Başlangıçta tüm içerikler taslak/inceleme kuyruğuna düşsün; otomatik yayın ancak hesap bazlı test ve açık onaydan sonra etkinleştirilsin.
- [ ] Instagram gönderisi/Reel/Story için gereken medya türleri; YouTube için video, başlık ve çocuklara yönelik içerik ayarı; platforma özgü gereklilikler doğrulansın.
- [ ] Gönderi durumu: taslak, incelemede, zamanlandı, yayımlandı, başarısız, tekrar denenecek.
- [ ] Aynı haberin bir platforma iki kere gitmesini önleyen idempotency kaydı ve kalıcı post kimliği.
- [ ] Yayın başarısı API cevabı ve mümkünse gönderi URL'si üzerinden teyit edilsin.
- [ ] Başarısızlıkta sessizce başarı yazma; hata nedeni ve yeniden deneme politikası tut.
- [ ] Metricool planının/hesabın otomasyon ve onay iş akışlarını desteklediği doğrulansın; ücretsiz kullanım varsayımı yapılmasın.
- [ ] Hesap erişimleri ve izinleri değiştirilmeyecek; yetkilendirme gerekiyorsa kullanıcıya manuel adım verilecek.

### P7 — Cloudflare / teknik altyapı
- [ ] Tek üretim Worker'ı ve tek dağıtım yolu korunmalı.
- [ ] Worker bindings, D1/R2 isimleri ve production `wrangler.toml` değerleri belgelenmeli.
- [ ] Route, custom domain, HTTPS, www yönlendirme, cache davranışı ve statik varlık fallback testleri.
- [ ] Admin için rate limiting/Access seçeneği, güvenli headers, CORS allowlist, giriş koruması ve abuse kontrolleri değerlendirilsin.
- [ ] D1 migration'ları idempotent olmalı; migration öncesi şema/backup ve sonrası smoke test bulunmalı.
- [ ] R2 public/private erişimleri ve imzalı URL süreleri denetlensin; gizli medya URL'leri gereksiz yere public yapılmasın.
- [ ] Worker observability: hatalar, başarısız API, scheduled job sonuçları ve PII/query-string redaction.
- [ ] DNS/MX/Email Routing değişikliği yalnızca özel onay ve mail akışı kontrolüyle.
- [ ] Token yetkileri en az ayrıcalık ilkesine göre; secret değerleri hiçbir çıktıda gösterilmesin.

### P8 — SEO, uluslararasılaşma ve erişilebilirlik
- [ ] Türkçe ana dil; İngilizce sayfalar yalnızca gerçekten çevrilmiş ve sürdürülebilir olan içerikler için.
- [ ] `hreflang`, canonical, 301 eşleştirme, sitemap ve news sitemap tutarlılığı.
- [ ] Article/NewsArticle, Organization, Breadcrumb ve VideoObject yapılandırılmış verileri sadece doğru alanlarla.
- [ ] Yazar sayfası, yayın ilkeleri, düzeltme politikası, iletişim, reklam/sponsor açıklaması ve kaynak şeffaflığı.
- [ ] Open Graph/Twitter önizlemeleri ve görsel endpoint'leri doğrulansın.
- [ ] Otomatik üretilen içerik arama motoru için seri/kalitesiz sayfa üretmemeli; yararlı özgün içerik kontrolü.
- [ ] Çok dilli URL ve arşivler arasında yinelenen içerik kontrolü.

### P9 — Test, ölçüm ve geri dönüş
- [ ] Kaynak seviyesi testler; HTML bağlantı kontrolü; responsive kontrat; admin login; API health; SEO XML; medya varlık kontrolü.
- [ ] Masaüstü/mobil gerçek ekran testleri ve kritik kullanıcı yolculukları.
- [ ] Değişiklik başına PR, test kanıtı ve geri alma yöntemi.
- [ ] Preview/staging varsa onun üzerinden yayın öncesi kontrol; yoksa production dışı güvenli doğrulama yolu tasarla.
- [ ] Deploy sonrası ana sayfa, sağlık endpoint'i, yönlendirme, haber rotası, admin giriş sayfası ve sosyal iş akışı duman testleri.
- [ ] Hata varsa deploy durdurulsun veya önceki bilinen iyi sürüme dönüş önerilsin; otomatik rollback davranışı ayrıca test edilmeden varsayılmasın.

## Kabul kriterleri
- İlk ekrandaki ana amaçlar anlaşılır; kategori menüsü üç ana yola ayrılır.
- Mobilde yatay taşma, navigasyon çakışması ve okunamayan metin bulunmaz.
- Her haber için kaynak, yazar, kategori ve yayın tarihi izlenebilir.
- Haber ile sponsorlu/AI içerik ayrı etiketlenir.
- Sosyal paylaşımın sonucu doğrulanır; mükerrer yayın önlenir.
- Admin API'si yetkisiz erişimi reddeder.
- DNS, secrets, production deploy ve mevcut içerik silme işlemleri ayrı onaya tabidir.
- Tamamlanma iddiası yalnızca gerçek test kanıtı varsa yazılır.

## Henüz uygulanmayanlar
Bu belge plan ve taslak niteliğindedir. Tasarım, kod, Cloudflare kaynakları, D1/R2, DNS, admin yetkileri, Metricool gönderileri ve canlı dağıtım bu belgeyi oluşturarak değiştirilmiş sayılmaz.
