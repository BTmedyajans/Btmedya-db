# BTMEDYA UI ve Dağıtım Düzeltme Kaydı

**Tarih:** 23 Eylül 2026  
**Mod:** Redesign · Preserve

## Mevcut durum

BTMEDYA ana alan adı Cloudflare üzerinde aktif bir zone ve `btmedya-db` adlı Worker ile yayınlanıyor. Ana alan adı ve `www` alan adı Worker custom domain olarak yapılandırılmış. Site ana sayfası, haber arşivi, iletişim formu, gerçek portföy videoları ve AI LAB bölümlerini içeriyor. Yerel medya varlıkları depo içinde mevcut ve canlı ana sayfadaki ana görseller ile videolar erişilebilir durumda.

## Korunacaklar

Mevcut siyah/antrasit ve kırmızı vurgulu görsel kimlik, sayfa yolları, haber slug'ları, iletişim form alanları, canonical URL, gerçek YouTube portföyü ve mevcut medya arşivi korunur. Uydurma haber veya üçüncü taraf fotoğraf eklenmez.

## İyileştirilenler

Yüklenen dağıtım betiği mevcut olmayan bir Worker dosyasına referans verdiği için gerçek `wrangler.toml` ve `src/worker.js` akışına taşındı. Üretim doğrulama workflow'u artık eski ve mevcut olmayan `anasayfa.*` dosyalarını sessizce atlamak yerine gerçek `public` HTML/CSS/JS kaynaklarını tarayacak şekilde güncellenecek. Yerel görsel ve video referansları, ana sayfa ve alt sayfalar için eksiksiz kontrol edilecek.

## Cloudflare bulguları

Zone aktif, ana alan adlarının Worker'a yönlenmesi çalışıyor ve canlı sağlık uç noktası erişilebilir. D1 ve R2 kaynakları yapılandırılmış; medya endpoint'i D1 metadata eksik olduğunda statik GitHub medya arşivine geri düşüyor. DNS'te e-posta ve doğrulama kayıtları bulunduğu için bunlara dokunulmaz.

## Güvenlik notu

Cloudflare Worker ayarlarında bazı yönetim değerlerinin düz metin binding olarak tutulduğu görüldü. Bunlar kaynak koda aktarılmadı ve rapora değerleri yazılmadı. Yönetici erişimini kesintiye uğratmamak için bu aşamada otomatik olarak değiştirilmedi; sonraki güvenlik bakımında yeni değerlerle Worker Secret'a dönüştürülmelidir.

## Tasarım sistemi

Siyah/antrasit zemin, beyaz metin ve kırmızı vurgu korunur. Space Grotesk/Manrope tipografisi, 8 px aralık ritmi ve düşük yoğunluklu hareket yaklaşımı sürdürülür. Mobil görünüm, klavye odağı, alt metinler ve `prefers-reduced-motion` davranışı önceliklidir.

## Geri dönüş

Değişiklikler GitHub `main` dalında tek bir anlamlı commit olarak tutulur. Canlı yayın öncesi `node --check`, Wrangler dry-run, asset taraması, health/news/robots/sitemap smoke testleri ve `www` canonical redirect kontrolü çalıştırılır.
