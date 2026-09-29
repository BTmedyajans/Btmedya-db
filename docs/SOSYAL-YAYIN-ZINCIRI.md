# Sosyal yayın zinciri

Panelden yönetilen, haberden sosyal medyaya giden otomatik akış. Kod: `src/sosyal-otomasyon.js`, `src/metricool-scheduler.js`, `autoPrepareSocialDrafts` (`src/worker.js`). Test: `node tools/sosyal-otomasyon-testi.mjs` (PR doğrulamasında çalışır).

## Akış

1. Haber panelden yayınlanır.
2. Cron (5 dakikada bir) yeni haberler için sosyal gönderi hazırlar:
   - Görsel: `public/assets/sosyal-kart/<slug>.jpg`, 1080×1350 JPEG. Instagram webp kabul etmez.
   - Metin: başlık, spot, haber adresi, görsel künyesi ve kategoriden türeyen etiketler. 30 günden eski haberde "📌 Arşiv haberi · Ay Yıl" satırı eklenir.
3. **Otomatik planlama açıksa** ve haber tazeyse (varsayılan 72 saat), gönderi paylaşım saatlerinden ilk boş olana "planlandı" olarak yerleşir. Kapalıysa "onayda" bekler; paneldeki **Onayla ve planla** düğmesi gönderiyi tek tıkla bir sonraki boş saate yerleştirir.
4. Bir sonraki cron, "planlandı" gönderiyi Metricool'a teslim eder. Panelde "✓ Metricool'a teslim edildi #id" görünür.
5. Saati geçen teslim edilmiş gönderi panelde "yayınlandı" olur. Yayını Metricool yapar; Metricool tarafındaki sonuç Metricool planlayıcısında görünür.

## Ayarlar (Panel > Sosyal İçerik > Otomatik Yayın Ayarları)

Ayarlar KV'de tutulur ve dağıtım gerektirmez:
- Ağlar: yalnız **Metricool'da bağlı** olanları seçin. Bağlı olmayan bir ağ, gönderinin tamamını reddettirir.
- Paylaşım saatleri: İstanbul saatiyle.
- Otomatik planlama.
- Tazelik sınırı.

## Görsel kartlar

Görsel kartlar `python3 tools/haber-kapagi.py <slug>` çalıştırıldığında otomatik üretilir. Yalnız kartı yenilemek için: `python3 tools/sosyal-kart.py <slug>`.

Kartın üzerindeki etiket `public/data/haber-kapak-kaynagi.json` dosyasından gelir: GERÇEK ÇEKİM, TEMSİLİ FOTOĞRAF, ARŞİV FOTOĞRAFI, BTMEDYA GRAFİK veya AI ÜRETİMİ. Metricool'a giden AI beyanı (`isAiGenerated` / `isAigc`) da aynı dosyadan okunur.

## Dış teslim

Metricool'a Worker dışından planlanan gönderi, panel kuyruğuna `metricool_id` ile kaydedilir (`POST /api/admin/social`). Böylece anahtar eklendiğinde kuyruk aynı gönderiyi ikinci kez teslim etmez.

## Gerekenler

- **Worker → Metricool:** GitHub secret `BTMEDYA_METRICOOL_USER_TOKEN`. `sync-worker-secrets` iş akışı bunu Worker'a taşır. Anahtar yokken taslaklar hazırlanır ama teslim edilmez; panel bunu kırmızı uyarıyla gösterir.
- **Instagram / Facebook:** Metricool > Connections'ta hesap bağlanmalıdır (OAuth, tarayıcıda). Bağlandıktan sonra ağı panel ayarlarından işaretleyin.

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
5. Siyaset, soruşturma, gözaltı, suç, ölüm ve yaralanma haberleri otomatik akışa alınmaz (`HASSAS`). Bunlar editör kararıdır.
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
