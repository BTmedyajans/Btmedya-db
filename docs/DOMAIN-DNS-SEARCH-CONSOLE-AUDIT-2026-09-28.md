# BTMEDYA Alan Adı, DNS ve Search Console Denetimi

**Denetim tarihi:** 28 Eylül 2026  
**Canonical hedef:** `https://btmedya.com.tr/`  
**Kaynak depo:** `BTmedyajans/Btmedya-db`

## Kritik bulgu

### 1. Apex DNS eksik

Kamuya açık resolver testleri:

- `btmedya.com.tr A` → **NOERROR / ANSWER: 0** (`1.1.1.1`, `8.8.8.8`, `9.9.9.9`)
- `www.btmedya.com.tr A` → Cloudflare IP’leri (`104.21.90.86`, `172.67.198.84`)
- Nameserver → `dimitris.ns.cloudflare.com`, `katja.ns.cloudflare.com`
- Worker config’te her iki custom domain tanımlı.

Sonuç: `www.btmedya.com.tr` Worker’a ulaşsa da Worker’ın `www → apex` 301’i DNS’siz `btmedya.com.tr` adresine gönderiyor. Bu nedenle canonical alan adı şu an dış DNS’te kırık görünüyor.

**Cloudflare’da yapılması gereken:** Workers & Pages → `btmedya-db` → Custom Domains ekranında `btmedya.com.tr` custom domain’inin durumunu kontrol edip yeniden bağlamak/provision etmek. Rastgele A kaydı eklenmemeli; Worker custom domain’in Cloudflare tarafından önerilen DNS hedefi kullanılmalı. Düzeltmeden sonra `btmedya.com.tr` için A/AAAA veya CNAME-flattened cevap ve HTTPS 200 görülmeli.

### 2. WWW davranışı

Kod, `www` isteklerini 301 ile canonical apex’e yönlendiriyor. Bu karar doğru; ancak apex DNS düzeltilmeden kullanıcıyı çalışmayan hedefe yönlendiriyor. DNS düzeltildikten sonra beklenen davranış:

- `https://btmedya.com.tr/` → 200
- `https://www.btmedya.com.tr/` → 301, `Location: https://btmedya.com.tr/`
- `http://btmedya.com.tr/` → HTTPS’e geçiş
- `http://www.btmedya.com.tr/` → HTTPS canonical akışı

### 3. Sitemap düzeltmeleri

- Ana sitemap’te Türkçe/eski serbest metin tarihleri Google’ın kabul ettiği ISO `YYYY-MM-DD` formatına çevrildi.
- Tarihi güvenilir biçimde çözülemeyen arşiv kayıtlarında `<lastmod>` kaldırıldı; yanlış tarih gönderilmiyor.
- Google News sitemap yalnızca gerçek `published_at` alanı bulunan son iki gün içindeki haberleri alacak şekilde yeniden üretim script’i eklendi: `tools/repair-news-sitemap.py`.
- Google Search Console’a sitemap olarak şu iki URL eklenmeli:
  - `https://btmedya.com.tr/sitemap.xml`
  - `https://btmedya.com.tr/news-sitemap.xml`

### 4. Robots ve canonical

- `robots.txt` `/admin/` ve `/api/` yollarını engelliyor.
- `robots.txt` ana sitemap ve news sitemap’i bildiriyor.
- Public sayfaların canonical URL’leri apex canonical’a işaret ediyor.
- `www`’nin canonical’a 301 olması nedeniyle Search Console’da esas mülk olarak Domain property veya `https://btmedya.com.tr/` URL-prefix property kullanılmalı; ikisini ayrı içerik kaynağı gibi izlemekten kaçınılmalı.

### 5. Search Console erişimi

Bu sandbox oturumunda Google hesabı açık değil ve My Browser bağlantısı etkin değil. Bu nedenle mülk doğrulama, Sitemap gönderme, URL Inspection, Pages/Indexing, Core Web Vitals ve Manual Actions ekranları henüz hesap içinde okunamadı.

Search Console kontrol listesi:

1. Domain property: `btmedya.com.tr` doğrulamasını DNS TXT ile tamamla.
2. Sitemap’leri gönder ve “Başarılı” durumunu bekle.
3. URL Inspection ile `https://btmedya.com.tr/`, `/haberler/`, `/hizmetler/`, `/iletisim/` ve bir haber URL’sini test et.
4. `www` URL’sinde canonical/redirect zincirini kontrol et.
5. Pages → Not indexed sebeplerini özellikle Redirect, Duplicate without user-selected canonical, Server error ve Crawled - currently not indexed olarak filtrele.
6. Core Web Vitals ve HTTPS raporunu kontrol et.
7. Search Console’dan alınan doğrulama TXT değeri veya HTML meta değeri varsa kaynak projeye ekle; değer uydurulmaz.

## Değiştirilen dosyalar

- `public/sitemap.xml`
- `public/news-sitemap.xml`
- `tools/repair-sitemap.py`
- `tools/repair-news-sitemap.py`

## Deploy sonrası tekrar test

```bash
dig @1.1.1.1 btmedya.com.tr A
curl -I https://btmedya.com.tr/
curl -I https://www.btmedya.com.tr/
curl -fsS https://btmedya.com.tr/robots.txt
curl -fsS https://btmedya.com.tr/sitemap.xml
curl -fsS https://btmedya.com.tr/news-sitemap.xml
```
