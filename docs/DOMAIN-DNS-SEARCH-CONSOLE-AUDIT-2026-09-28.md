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

## Güncelleme — 28 Eylül 2026, ikinci ölçüm

Yukarıdaki "Apex DNS eksik" bulgusu ikinci ölçümde **doğrulanmadı**. DNS-over-HTTPS ile iki bağımsız çözücüye doğrudan soruldu:

| Sorgu | dns.google (8.8.8.8) | cloudflare-dns.com (1.1.1.1) |
|---|---|---|
| `btmedya.com.tr A` | `172.67.198.84`, `104.21.90.86` | aynı |
| `btmedya.com.tr AAAA` | `2606:4700:3031::ac43:c654`, `2606:4700:3032::6815:5a56` | aynı |
| `www.btmedya.com.tr A` | `172.67.198.84`, `104.21.90.86` | — |

Apex çözülüyor ve `https://btmedya.com.tr/` 200 dönüyor; `www` → apex 301 zinciri çalışıyor. İlk ölçüm geçici bir yayılma durumuna denk gelmiş olabilir; kanıt yok, varsayımdır.

Aynı ölçümde görülenler:

- Apex TXT'de `google-site-verification=pwUdz11U…` kaydı var: Search Console **Domain property** DNS ile doğrulanmış görünüyor. `public/google3d14019638be46ce.html` dosyası da yayında (URL-prefix doğrulaması). Hesap içi durum bu oturumdan görülemez.
- MX kaydı yok; DMARC `p=quarantine` ve `rua=admin@btmedya.com.tr`. MX olmadığı için DMARC raporları teslim edilemez. Email Routing kurulunca düzelir.

### Bu turda yapılan düzeltmeler

1. **Google News haritası hep boştu.** Statik dosya `<urlset .../>` olarak kendiliğinden kapanıyordu. Worker `</urlset>` arayıp ekleme yaptığı için panelden yayımlanan haberler hiç girmiyordu, `news:` ad alanı da tanımlı değildi. Harita artık her istekte D1'den son 48 saatin haberleriyle üretiliyor; ileri tarihli haberler dışarıda kalıyor. `tools/gerileme-denetimi.mjs` bu hatanın geri gelmesini yakalıyor.
2. **X-Robots-Tag:** Kamuya açık HTML yanıtları `max-image-preview:large, max-snippet:-1, max-video-preview:-1` başlığını alıyor. Bu başlık Discover ve Haberler'de büyük görselli kart için gerekli; daha önce yalnız iki sayfada vardı. `/admin/`, `/social-studio/` ve `/api/` yanıtları `noindex, nofollow` alıyor.
3. **307 → 301:** Static Assets'in `/hizmetler` → `/hizmetler/`, `/haberler` → `/haberler/` ve `/index.html` → `/` yönlendirmeleri geçici (307) idi; artık kalıcı (301).
4. **Haber sayfaları (D1):**
   - `datePublished` ve `dateModified` saat dilimiyle birlikte veriliyor (`2026-09-25T09:00:00+03:00`).
   - `article:published_time`, `article:modified_time`, `article:section`, `og:site_name` ve `og:locale` eklendi.
   - Meta açıklaması kelime sınırında ~160 karaktere kısaltılıyor.
   - RSS `alternate` bağlantısı eklendi.
   - JSON-LD içinde `<` kaçışlanıyor.
5. **Yapısal veri:** JSON-LD'si olmayan 8 sayfaya (`/haberler/`, `/sosyal-medya/`, `/video-produksiyon/`, `/whatsapp-katalog/`, `/basin-kiti/`, `/vaka-calismalari/`, `/sosyal-medya-kit/`, `/kaynak-masasi/`) `WebPage`/`CollectionPage` ve `BreadcrumbList` eklendi. İçerik yalnız sayfanın kendi başlığı ve açıklamasından türetildi.

### Hesap sahibinin yapması gerekenler (erişim yalnız sende)

1. Search Console → Sitemaps: `sitemap.xml` ve `news-sitemap.xml` gönder. Google, 2023'ten beri "ping" ile harita bildirimini kabul etmiyor; tek yol bu ekran ya da robots.txt (robots.txt'de zaten var).
2. Google Haberler için Publisher Center'da yayın kaydı oluştur. Başvuru zorunlu değil ama görünürlüğü artırır.
3. Google İşletme Profili: "BTMEDYA – Balıkesir" yerel aramada harita paketinde çıkmak için tek yol bu.
4. Bing Webmaster Tools: Search Console'dan tek tıkla içe aktarılabiliyor. IndexNow zaten kurulu.
