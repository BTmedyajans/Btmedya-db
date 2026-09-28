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
