# Sosyal yayın zinciri

BTMEDYA sosyal yayınları öncelikle kendi OAuth/API bağlantıları, Cloudflare Worker ve D1 kuyruğu üzerinden çalışır. **Metricool aboneliği, tokenı veya Brand ID'si yayın için gerekli değildir.**

Kod: `src/direct-social.js`, `src/social-platforms.js`, `src/sosyal-otomasyon.js`, `autoPrepareSocialDrafts` ve `src/worker.js`. Test: `node tools/sosyal-otomasyon-testi.mjs` ve `node tools/yayin-zinciri-testi.mjs`.

## Doğrudan yayın akışı

1. Haber panelde yayınlanır; kalite ve güvenlik kapıları korunur.
2. Cron (5 dakikada bir) yeni haberler için sosyal taslak hazırlar:
   - Görsel: `public/assets/sosyal-kart/<slug>.jpg`, 1080×1350 JPEG. Instagram için görsel/video gerekir.
   - Metin: başlık, spot, haber adresi, görsel künyesi ve kategoriden türeyen etiketler. Eski haberlerde arşiv etiketi eklenir.
3. Otomatik planlama açıksa ve hedef hesap ilgili platformun resmî OAuth'u ile bağlanmışsa, gönderi boş bir yayın saatine yerleştirilerek D1 içindeki `social_direct_jobs` kuyruğuna girer.
4. Cloudflare Cron kuyruğu işler ve Facebook Page, Instagram Professional, TikTok Content Posting API, YouTube Data API veya X API'ye doğrudan gönderim yapar.
5. Gönderi, gerçek sağlayıcı yanıtı ve harici gönderi kimliği doğrulanmadan başarılı kabul edilmez. Başarılı/başarısız iş `social_direct_jobs` tablosunda saklanır; eski sosyal içerik ekranından oluşturulan işler ayrıca `social_posts` durumuyla eşleştirilir.

## Yönetim ekranları

- Hesap bağlantıları: `/admin/connect/`
- Doğrudan sosyal yayın, kuyruk ve planlama: `/admin/social-os/`
- Kontrol merkezi: `/admin/agency-os/`

## OAuth bağlantısı ve gereksinimler

GitHub Actions > **BTMEDYA Sync Worker Secrets** iş akışında `native-social` kapsamı, GitHub Secrets'ta tanımlı resmî uygulama kimliklerini Cloudflare Worker'a aktarır. Değerler kaynak koda veya sohbet alanına yazılmaz.

| Platform | GitHub Secret adları | Koşul |
|---|---|---|
| Facebook + Instagram | `BTMEDYA_META_APP_ID`, `BTMEDYA_META_APP_SECRET`, `BTMEDYA_SOCIAL_TOKEN_ENCRYPTION_KEY` | Facebook Page; Instagram Professional/Business/Creator hesabı Meta izinleriyle bağlı |
| TikTok | `BTMEDYA_TIKTOK_CLIENT_KEY`, `BTMEDYA_TIKTOK_CLIENT_SECRET` | Content Posting API erişimi ve `video.publish` izni |
| YouTube | `BTMEDYA_YOUTUBE_CLIENT_ID`, `BTMEDYA_YOUTUBE_CLIENT_SECRET` | OAuth onayı, YouTube Data API ve uygun kota |
| X | `BTMEDYA_X_CLIENT_ID`, `BTMEDYA_X_CLIENT_SECRET` | X Developer uygulaması ve uygun API erişimi |

Bağlantı sırası:

1. Sağlayıcının geliştirici portalında uygulama oluşturun ve kimlik bilgilerini GitHub Secrets'a kaydedin.
2. Sync Worker Secrets iş akışını `native-social` kapsamıyla çalıştırın.
3. `/admin/connect/` içinde resmî OAuth ekranını tamamlayın.
4. `/admin/social-os/` içinde bağlı hesabı kontrol edip düşük riskli bir test gönderisi planlayın.
5. Platformda oluşan gerçek gönderiyi doğrulayın.

TikTok ve YouTube doğrudan yayınında video gerekir. Facebook kişisel profiline otomatik gönderim desteklenmez; Facebook Page gerekir. Instagram için Professional hesap gerekir. Profil URL'sinin sitede bulunması otomatik yayın yetkisi anlamına gelmez.

## Görsel kartlar

Görsel kartlar `python3 tools/haber-kapagi.py <slug>` çalıştırıldığında otomatik üretilir. Yalnız kartı yenilemek için: `python3 tools/sosyal-kart.py <slug>`.

Kartın üzerindeki etiket `public/data/haber-kapak-kaynagi.json` dosyasından gelir: GERÇEK ÇEKİM, TEMSİLİ FOTOĞRAF, ARŞİV FOTOĞRAFI, BTMEDYA GRAFİK veya AI ÜRETİMİ. Resmî platformların AI içerik beyanları aynı medya künyesini kullanır.

## Geçiş ve geriye dönük kayıtlar

Önceki Metricool yayın kayıtları ve `social_posts` içeriği silinmez. Ancak `wrangler.toml` içinde `BTMEDYA_SOCIAL_PUBLISHER = "direct"` birincil modu seçildiğinden yeni planlı gönderiler doğrudan yayın kuyruğuna alınır. Metricool tokenı yokluğu yayın akışını durdurmaz. Eski teslim kayıtları yalnızca geçmişi inceleme/legacy fallback amacıyla kalabilir.

## Sabah Masası (her gün 08:00)

Kod: `src/sabah-masasi.js`. Tetik: `wrangler.toml` içinde `0 5 * * *` (05:00 UTC = 08:00 İstanbul). Test: `node tools/sabah-masasi-testi.mjs`.

1. Google Trends TR günlük akışı okunur.
2. Kategori kaynakları okunur: TRT Haber kategori akışları, Balıkesir Büyükşehir haber listesi, CUMHA Balıkesir; yedek olarak Hürriyet (spor, eğitim, teknoloji), Sabah (spor, kültür-sanat, sağlık) ve Anadolu Ajansı (kültür, bilim-teknoloji).
3. Seçimden önce elenenler:
   - 72 saatten eski haberler,
   - başka kategoriye sızan spor haberleri,
   - video sayfaları,
   - son 4 günde yayınlanmış konular,
   - daha önce alınmış bağlantılar.
4. Kalan her haber trendle eşleşmesine ve tazeliğine göre puanlanır; her kategoriye en yüksek puanlı haber seçilir. Aynı bağlantı iki kategoriye verilmez. Konu tekrarı son 4 günün başlıklarıyla sözcük kökü (ilk 5 harf) üzerinden aranır; yazılan başlık da yeniden karşılaştırılır ve benzerse haber taslak kalır.
5. Siyaset, soruşturma, gözaltı, suç, ölüm ve yaralanma haberleri otomatik akışa alınmaz (`HASSAS`). Özel hastane ve klinik tanıtımları da alınmaz (`TANITIM`). Bunlar editör kararıdır. Kulis, iddia ve transfer söylentileri kaynağa atfedilmeden yayına çıkmaz (kalite denetimi).
6. Workers AI (`@cf/openai/gpt-oss-120b`) kaynak metinden özgün metin yazar. Seçilen kategorilerin hepsi **eş zamanlı** yazılır; biri hata verirse diğerleri etkilenmez. Model koddan gelir, panel ayarlarında saklanmaz.

   Ücretsiz Workers planında bir çağrı en fazla 50 dış istek yapabilir. Bu yüzden ana çağrı yalnız trendleri, RSS akışlarını ve aday listesini hazırlar. Her kategori, `SABAH_YAZICI` servis bağlamasıyla (`wrangler.toml`, `SabahYazici` giriş noktası) ayrı bir Worker çağrısında işlenir: kaynak sayfa, yazım, denetim, görsel ve kayıt. Giriş noktası internetten erişilemez.
7. Üç denetim yapılır:
   - **Rakam denetimi:** metindeki her sayı kaynakta geçmeli.
   - **Özel ad denetimi:** metindeki her ad kaynakta geçmeli.
   - **Kalite denetimi:** başlık tam cümle (en az 40 karakter, 5 kelime, Her Kelimesi Büyük değil, sansasyonsuz), spot 90-300 karakter, gövde en az 3 paragraf ve 650 karakter, gövdenin en fazla %40'ı kaynaktan aynen, gövdede tekrar eden ifade yok, belirli tarihteki ay adları büyük harfle ("30 Eylül"), skor ekleri ünlü uyumuna uygun (4-1'lik, 2-0'lık).

   Denetimden kalan taslak, sorunlar modele geri verilerek en fazla üç denemeye kadar yeniden yazdırılır. Üçünü de geçen haber yayınlanır (panelde "Denetimi geçenleri otomatik yayınla" açıksa); geçemeyen haber taslak kalır ve nedeni panelde görünür.
8. Görsel: Openverse'ten ticari kullanıma açık CC lisanslı temsili fotoğraf alınır, `otomasyon/<slug>.jpg` olarak R2'ye kaydedilir ve `/gorsel/otomasyon/...` adresinden servis edilir. Künye metne ve nota yazılır. Fotoğraf bulunamazsa `public/assets/kategori-kapak/` altındaki kategori grafiği kullanılır.
9. Her otomatik haberin notunda yapay zekâ desteğiyle derlendiği ve editör denetiminden geçmediği açıkça yazılır.
10. Yayınlanan haberler sosyal zincire düşer. `RESEND_*` tanımlıysa günün özeti e-postayla gelir.

Panel > Sosyal İçerik > Sabah Masası kartından şunlar yapılır:
- açma/kapama,
- otomatik yayın ayarı,
- günlük azami haber sayısı,
- hangi kategorilerin yazılacağı (hepsi boşaltılırsa "hepsi" sayılır),
- **Önizle** (yazmadan yalnız seçim),
- **Deneme yazımı** (yazar ve denetler ama hiçbir şey kaydetmez; metin panelde görünür),
- **Şimdi çalıştır**.
