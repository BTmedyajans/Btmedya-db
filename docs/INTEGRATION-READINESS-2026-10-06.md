# BTMEDYA Entegrasyon ve Google Uygunluk Raporu

Tarih: 6 Ekim 2026

## Sonuç

BTMEDYA production mimarisi şu zincire uygundur:

`GitHub main → Cloudflare Worker → D1/R2 → Admin/Social Studio → Metricool → sosyal ağlar`

Facebook ve Instagram uygulama içinde **doğrudan ayrı OAuth tokenlarıyla değil**, mevcut güvenli tasarım gereği Metricool tek yayın geçidiyle yönetilir. Bu tercih Worker'a Meta tokenı yazılmasını önler ve hesap ayrımını korur.

## Uygulanan değişiklikler

- Instagram Manus bağlantısı etkinleştirildi.
- Metricool Manus bağlantısı etkinleştirildi.
- Admin > Yayın Merkezi > Hesaplar ekranına Facebook + Instagram bağlantı hazırlık paneli eklendi.
- Panel, "hesap Metricool'da bağlı" ile "Worker secret / Brand doğrulaması eksik" durumlarını ayrı gösterir.
- Metricool, Instagram Business/Creator ve Facebook Page bağlantılarına resmi hazırlık bağlantıları eklendi.
- Admin operasyon ekranındaki yanıltıcı `ChatGPT GSC bağlı` ifadesi kaldırıldı.
- Control Center API'ye Google teknik uygunluk durumu eklendi.
- Google robots, sitemap ve news-sitemap uçları canlı denetim zincirine bağlıdır.

## Kullanılması gereken bağlantı akışı

1. Metricool'da BTMEDYA Brand açılır.
2. `Connections` bölümünde BTMEDYA Instagram Business/Creator hesabı bağlanır.
3. Aynı Brand'e BTMEDYA Facebook Page bağlanır.
4. Metricool Brand bağlantısı doğrulanınca `METRICOOL_CONNECTED_NETWORKS` içine `instagram,facebook` eklenir.
5. Worker secret akışı şu değişkenleri kullanır: `METRICOOL_USER_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BRAND_ID`.
6. Admin > Yayın Merkezi > Otomasyon'da ağlar seçilir.
7. İlk yayınlar taslak/onay akışından geçirilir; başarılı teslim görülmeden otomatik yayın genişletilmez.

## Google uygunluğu

Canlı production denetiminde:

- `robots.txt`: 200
- `sitemap.xml`: 200
- `news-sitemap.xml`: 200
- canonical alan adı: `https://btmedya.com.tr/`
- `www.btmedya.com.tr`: canonical kalıcı yönlendirme
- site denetimi: 0 hata, 0 uyarı

Google Search Console otomasyonu repo içinde hazırdır: `.github/workflows/google-search-console.yml`. Kesin URL Inspection ve indeks raporu için Search Console mülk sahipliği ve şu GitHub Actions secret'ı gerekir:

`GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`

Bu secret'ın değeri kaynak koda veya Worker yanıtına yazılmaz. Secret kurulmadan yalnızca teknik erişilebilirlik teyit edilebilir; kesin indekslenme sonucu iddia edilmez.

## Otomasyon güvenlik kararı

- Kaynak ve medya doğrulanmadan otomatik sosyal yayın yapılmaz.
- Hassas haberler otomatik yayına kapalı kalır.
- Instagram/Facebook doğrulanmamışsa panel planlı yayını reddeder.
- Kişisel hesaplar şirket Brand'ine geri düşmez.
- Token, parola ve servis hesabı anahtarı GitHub dosyalarına yazılmaz.

## Kalan yetki gerektiren son adımlar

- Metricool hesabında Instagram ve Facebook Page OAuth bağlantısının tamamlanması.
- GitHub Actions'a Search Console servis hesabı secret'ının eklenmesi.
- Search Console mülkünde servis hesabının yetkili kullanıcı/owner olarak eklenmesi.

Bu adımlar tamamlanmadan site kodu güvenli şekilde çalışır; yalnız ilgili dış ağlarda yayın ve kesin Google API raporu beklemede kalır.
