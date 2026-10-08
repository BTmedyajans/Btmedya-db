# BTMEDYA Arama Motoru Araştırması — 2026-10-08

## Resmi kaynak bulguları

- Google sitemap kılavuzu: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
  - Sitemap UTF-8 olmalı; tek dosyada 50 MB veya 50.000 URL sınırı var.
  - Sitemap kökte yayınlanmalı ve tam, mutlak URL kullanmalı.
  - Sitemap yalnızca arama sonuçlarında görünmesi istenen canonical URL'leri içermeli.
  - `lastmod` yalnızca doğrulanabilir ve anlamlı son içerik/structured-data/link değişikliğini yansıtmalı. `priority` ve `changefreq` Google tarafından yok sayılıyor.
  - Sitemap gönderimi indeks garantisi değil; Search Console, Search Console API veya robots.txt üzerinden keşif sinyali sağlar.
- Google News sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
  - Yalnızca son iki gün içinde oluşturulan haberler News sitemap'te tutulmalı.
  - Her sitemap en fazla 1.000 `news:news` girdisi içermeli.
  - `news:name` yayında görünen yayın adıyla eşleşmeli; dil ISO kodu olmalı; yayın tarihi ilk yayın zamanını yansıtmalı.
- Google JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
  - Googlebot crawling, rendering ve indexing aşamalarını kullanıyor; ilk HTML'de anlamlı içerik ve crawlable `<a href>` bağlantıları bulunması tercih edilir.
  - Canonical HTML içinde verilmelidir; JS canonical'ı farklı bir adrese değiştirmemeli.
  - 200 durumlu sayfalar render kuyruğuna girer; robots.txt engellenen sayfalar render edilmez.
- Google structured data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
  - JSON-LD önerilen format; markup sayfadaki görünür içeriği doğru açıklamalı, boş/uydurma içerik için kullanılmamalı.
  - Rich Results Test ve Search Console rich-result raporlarıyla doğrulanmalı.
- IndexNow: https://www.indexnow.org/documentation
  - Anahtar dosyası host kökünde bulunmalı ve dosya içeriği anahtarla aynı olmalı.
  - Tekli bildirimde 200/202 alınması kabul anlamına gelir; toplu bildirimde 10.000 URL'ye kadar gönderilebilir.

## Canlı BTMEDYA bulguları

- `https://btmedya.com.tr/` 200; canonical, title, description, robots, H1 ve 4 JSON-LD mevcut.
- `https://btmedya.com.tr/haberler/` 200; canonical, title, description, H1 ve 2 JSON-LD mevcut.
- `robots.txt`, `sitemap.xml`, `news-sitemap.xml` ve `rss.xml` canlıda 200.
- Canlı `news-sitemap.xml` dinamik olarak güncel haberler içeriyor; yerel statik dosya boş olması tek başına sorun değil çünkü Worker route'u canlı sitemap üretiyor.
- Canlı `/llms.txt` 200 ancak `x-robots-tag: noindex`; bu makine-okunur bilgi dosyasının Google web arama sonucu olmasını engeller, normal HTML içeriklerinin indekslenmesini engellemez.
- Canlı `https://btmedya.com.tr/indexnow-key.txt` 404. Worker, `57fb863171638cffa9cdfb3913627b57.txt` dosyasını kullanacak şekilde ayarlanmış; robots.txt içinde IndexNow anahtar adresi yok. Kök anahtar dosyası canlı olarak mevcut kontrol edilmeli.
- Search Console workflow'u canlı uçları denetliyor; `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` secret yoksa sitemap gönderimi ve URL Inspection çalışmıyor. Bunun için kullanıcı/Google yetkisi gerekir.
