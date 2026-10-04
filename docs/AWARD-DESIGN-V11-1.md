# BTMEDYA V11.1 / Character World Navigator

Tarih: 24 Eylül 2026

## Amaç
BTMEDYA ana sayfasını haber sitesi + medya ajansı + AI LAB kimliğini tek deneyimde anlatacak şekilde geliştirmek.

## Uygulanan katman
- BT WORLD NAVIGATOR: Haber / Prodüksiyon / Medya / AI LAB.
- Kategori seçildiğinde görsel, başlık, kaynak etiketi ve açıklama aynı kadrajda değişir.
- Haber ve portföy tarafında gerçek Buse Tuncay arşiv görselleri kullanılır.
- Prodüksiyon ve AI LAB tarafında mevcut AI/robotik BTMEDYA görselleri yalnızca ilgili bağlamda kullanılır.
- İç sayfalara giderken kategoriye göre tam ekran geçiş katmanı devreye girer.
- Mobilde navigator dikey, dokunmatik kullanıma uygun hale gelir.
- `prefers-reduced-motion` desteği korunur.
- Mevcut D1/R2/CMS/API, haber URL'leri ve SEO yapısı değiştirilmez.

## Tasarım ilkesi
Aynı kişi, farklı üretim dünyaları. Kostüm/ortam değişebilir; gerçek portrelerde kimlik korunur. AI üretimleri gerçek çekim gibi sunulmaz ve AI LAB bağlamında etiketlenir.

## Doğrulama
- `public/home.js`: JavaScript syntax OK
- `public/script.js`: JavaScript syntax OK
- Ana sayfada haber, AI LAB, iletişim ve BT WORLD NAVIGATOR işaretleri mevcut.
- Geri dönüş noktası: `backup-before-award-redesign-2026-09-24`
