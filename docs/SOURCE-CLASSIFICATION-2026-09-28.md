# BTMEDYA Kaynak ve Varlık Ayrıştırması — 28 Eylül 2026

Bu belge production deposundaki varlıkların canlı yayın zincirindeki rolünü ayırır. Amaç, kullanılmayan görünen bir dosyanın yanlışlıkla canlı içerik veya kaynak zincirinden silinmesini önlemektir.

## 1. CANLI ÜRETİM KAYNAĞI

Bunlar canlı uygulamanın doğrudan veya Worker/API üzerinden kullandığı kaynaklardır.

- `src/worker.js` — ana Worker / API / yayın mantığı
- `public/index.html` — ana sayfa ve menü
- `public/mobile-fixes.css` — mobil davranış katmanı
- `public/data/haberler.json` — arşiv haber verisi
- `public/data/haber-kapak-plani.json` — kapak planı ve kaynak eşlemesi
- `public/data/haber-kapak-kaynagi.json` — gerçek/arşiv/temsili kaynak ayrımı
- `public/data/kapak-fotograflari.json` — kapak havuzu
- `public/data/medya-ozel.json` — gerçek çekim/vitrin kayıtları
- `public/data/youtube-portfoy.json` — YouTube portföy kayıtları
- `public/kaynak-masasi/index.html` — editoryal kaynak masası
- `public/arsiv/index.html` — arşiv merkezi
- `public/admin/index.html` — yönetim merkezi
- `public/assets/**`, `public/media/**` — production medya varlıkları
- R2/D1 bağlı verileri — canlı medya ve içerik zinciri

## 2. TEMSİLİ / HARİCİ KAYNAK

`tools/temsili-kaynak/**` üçüncü taraf lisanslı/temsili kaynak karelerini içerir. Bu klasör şu anda kullanılmıyor varsayılamaz.

`public/data/haber-kapak-plani.json` içindeki `temsili.dosya` alanları bu klasördeki dosyalara doğrudan işaret eder. Bu nedenle klasör fiziksel olarak silinmemelidir.

Her temsilî görsel için yazar/lisans/kaynak sayfası kaydı korunmalıdır. Sitede yayınlanan kaynak/atıf kaydı `public/data/kapak-foto-kaynaklari.json` üzerinden tutulur.

## 3. ARŞİV / VİTRİN DIŞI

Arşiv, `vitrinDisi` ve `haric` kayıtları otomatik olarak gereksiz değildir. Bunlar canlı ana vitrinde gösterilmeyen ancak medya kasasında veya editoryal geçmişte gerekli olabilecek varlıklardır.

Fiziksel silme için önce:
1. kod referansı,
2. veri referansı,
3. R2/asset referansı,
4. lisans/kaynak durumu,
5. sitemap veya canlı URL etkisi
kontrol edilmelidir.

## 4. ÜRETİM ARAÇLARI / DENETİM

`tools/**`, `.github/workflows/**`, `migrations/**`, `wrangler.toml` ve `docs/**` canlı sayfa içeriği değildir. Ancak deploy, veri migrasyonu, kalite kontrolü veya üretim zinciri için kritik olabilirler.

Bu klasörlerden bir dosya, kullanılmıyor gibi görünmesi nedeniyle tek başına silinmemelidir.

## 5. TEMİZLİK KARARI

28 Eylül 2026 itibarıyla doğrulanmış ilk orphan dosya `automation-config.yml` idi. Yalnızca `enabled: true` içerdiği ve üretim zincirinde kullanım referansı bulunmadığı için kaldırıldı.

Bunun dışında bu denetimde canlı zinciri etkileyebilecek production binary veya kaynak dosyası silinmedi.

## 6. SONRAKİ DENETİM

DNS/Custom Domain düzeltildikten sonra aşağıdaki eşleştirme tekrar çalıştırılmalıdır:

`GitHub kaynak → build/deploy → Worker → URL → HTTP 200 → içerik/medya eşleşmesi`

Öncelik sırası:
1. canonical DNS / Custom Domain
2. mobil menü ve tüm ana URL'ler
3. veri kaynaklarının canlı karşılıkları
4. gerçek/temsili/arşiv rozetlerinin doğrulanması
5. admin özelliklerinin canlı API karşılığı
6. kullanılmayan dosyaların referans taraması
7. yalnızca doğrulanmış orphan dosyaların temizlenmesi
