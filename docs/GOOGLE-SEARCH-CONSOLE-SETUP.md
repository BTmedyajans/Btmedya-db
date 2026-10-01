# BTMEDYA Google Search Console ve Operasyon Yetkilendirme Kılavuzu

Bu belge, `btmedya.com.tr` için indeksleme takibi ve sosyal yayın operasyonunun güvenli biçimde etkinleştirilmesi içindir. **Şifre, JSON anahtarı, OAuth tokenı veya 2FA kodu GitHub'a, sohbete ya da kaynak koda yazılmaz.**

## 1. Search Console mülkü

1. Google Search Console'da `https://btmedya.com.tr/` URL-prefix mülkünü açın.
2. Alan adı mülkü kullanıyorsanız DNS TXT doğrulaması; URL-prefix kullanıyorsanız HTML dosyası veya HTML etiketi doğrulaması kullanın.
3. Şu canlı kaynakları kontrol edin:
   - `https://btmedya.com.tr/robots.txt`
   - `https://btmedya.com.tr/sitemap.xml`
   - `https://btmedya.com.tr/news-sitemap.xml`
4. Search Console > **Sitemaps** bölümüne iki sitemap'i ayrı ayrı gönderin.
5. Search Console > **Ayarlar > Kullanıcılar ve izinler** bölümünde otomasyon servis hesabını en az **Full user**, URL Inspection ve sitemap yönetimi için tercihen doğrulanmış mülk sahibi olarak ekleyin.

## 2. GitHub Actions otomasyonu

GitHub deposu: `BTmedyajans/Btmedya-db`

Repository Settings > Secrets and variables > Actions > New repository secret:

```text
Name: GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON
Value: Google Cloud servis hesabının JSON içeriği
```

Google Cloud tarafında:

1. Bir proje seçin veya oluşturun.
2. **Google Search Console API**'yi etkinleştirin.
3. Bir servis hesabı oluşturun.
4. JSON anahtarını yalnızca güvenli yerel makinede indirin.
5. Servis hesabı e-posta adresini Search Console mülküne ekleyin.
6. JSON içeriğini yukarıdaki GitHub secret'ına kaydedin.

Kurulum tamamlandığında workflow şu işlemleri yapar:

- `sitemap.xml` gönderir.
- `news-sitemap.xml` gönderir.
- Ana sayfa, haberler, hizmetler ve portföy URL'lerini URL Inspection API ile denetler.
- Verdict, coverage state, robots state, indexing state ve page fetch state bilgisini workflow loguna yazar.

Workflow yolu:

```text
.github/workflows/google-search-console.yml
```

Manuel çalıştırma:

```text
GitHub > Actions > BTMEDYA Google Search Console > Run workflow
```

## 3. İndeks durumu yorumlama

- `robotsTxtState=ROBOTS_TXT_STATE_ALLOWED`: Googlebot robots tarafından engellenmiyor.
- `indexingState=INDEXING_ALLOWED`: Sayfa indekslenmeye açık.
- `coverageState=Submitted and indexed`: Google sayfayı indekslemiş.
- `URL is unknown to Google`: URL henüz keşfedilmemiş veya incelenmemiş olabilir; sitemap gönderimi ve URL Inspection isteği gerekir.
- `Discovered - currently not indexed`: Google URL'yi biliyor fakat henüz indekslememiştir; bu, teknik bir engel olduğu anlamına gelmez.

Search Console API olmadan dışarıdan yalnızca teknik erişilebilirlik ve sınırlı `site:` görünürlüğü kontrol edilebilir; kesin indeks sayısı Search Console'dan alınır.

## 4. Sosyal yayın yetkilendirmesi

Üretimde tek yayın geçidi Metricool'dur. Worker içinde ayrı Instagram, Facebook, TikTok veya YouTube access tokenları tutulmaz.

Metricool'da şu ağları bağlayın:

- Instagram Business/Creator
- Facebook Page
- TikTok Business
- YouTube Channel

Ardından GitHub secret'larını tanımlayın:

```text
BTMEDYA_METRICOOL_USER_TOKEN
BTMEDYA_METRICOOL_USER_ID
BTMEDYA_METRICOOL_BRAND_ID
```

`BTMEDYA_METRICOOL_TIMEZONE` kaynak koda yazılmaz; Worker varsayılanı `Europe/Istanbul` kullanır.

GitHub Actions > **BTMEDYA Sync Worker Secrets** workflow'unda `metricool` scope'unu çalıştırın. Workflow, secret değerlerini göstermeden Worker'a aktarır ve Brand ID erişimini doğrular.

## 5. Güvenlik sınırları

- Kullanıcı şifresi ve 2FA yalnızca ilgili sağlayıcının giriş ekranında girilir.
- Google servis hesabı JSON'u yalnızca GitHub Actions secret olarak saklanır.
- OAuth tokenları commit edilmez.
- `admin`, `api` ve `social-studio` yolları arama botlarına kapalıdır.
- Sosyal yayın yetkisi bağlanmadan önce içerik planları taslak/planlandı durumunda tutulur; otomatik yayın iddiası oluşturulmaz.

## 6. Operasyonel doğrulama checklist'i

- [ ] Search Console mülkü doğrulandı.
- [ ] Sitemap'ler Search Console'a gönderildi.
- [ ] Servis hesabı mülke eklendi.
- [ ] `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` secret'ı mevcut.
- [ ] Search Console workflow'unda `Submit sitemaps and inspect URLs` adımı çalıştı.
- [ ] Metricool'da tüm hedef ağlar bağlı.
- [ ] Üç Metricool GitHub secret'ı mevcut.
- [ ] Metricool secret sync workflow'u başarılı.
- [ ] İlk sosyal gönderi düşük riskli bir taslak/test olarak doğrulandı.
