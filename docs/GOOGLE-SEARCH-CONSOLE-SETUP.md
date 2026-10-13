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

## 4. Sosyal medya hesaplarının doğrudan bağlantısı (Metricool bağımsız)

BTMEDYA'nın birincil yayın yolu, her platformun resmî OAuth/API bağlantısını kullanan yerel Social OS'tur. `wrangler.toml` içindeki `BTMEDYA_SOCIAL_PUBLISHER = "direct"` ayarı, eski sosyal gönderi ekranının da doğrudan yayın kuyruğunu kullanmasını sağlar. Cloudflare Cron, `social_direct_jobs` kuyruğunu beş dakikada bir işler. **Metricool hesabı, aboneliği, tokenı veya Brand ID'si bu yol için gerekli değildir.**

Bağlantı merkezi: `https://btmedya.com.tr/admin/connect/`  
Doğrudan yayın ve kuyruk paneli: `https://btmedya.com.tr/admin/social-os/`

Resmî sağlayıcı kimlik bilgilerini Cloudflare Dashboard > Workers & Pages > `btmedya-db` > Settings > Variables and Secrets bölümünde tanımlayın. Değerleri sohbete, kaynak koda veya herkese açık GitHub dosyalarına koymayın.

| Platform | Gerekli Worker değişken/secret'ları | Hesap koşulu |
|---|---|---|
| Facebook + Instagram | `META_APP_ID`, `META_APP_SECRET`; token şifrelemek için `MEDIA_SIGNING_SECRET` veya `SOCIAL_TOKEN_ENCRYPTION_KEY` ve OAuth state için KV | Facebook Page; Instagram Professional (Business/Creator) hesabı, ilgili Facebook Page'e bağlı olmalı |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok Content Posting API erişimi ve gereken `video.publish` izni |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | Google OAuth uygulaması ve YouTube Data API yükleme izni |
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET` | X Developer uygulaması ve uygun API erişimi |

Güvenli bağlantı sırası:

1. BTMEDYA yönetim paneline giriş yapın ve Connect Merkezi'ni açın.
2. Facebook + Instagram, TikTok ve YouTube için **hesabı bağla** düğmesini kullanın. Kimlik bilgisi eksikse ilgili sağlayıcının geliştirici portalında uygulamayı yapılandırın; mevcut kimlik bilgilerini değiştirmeden önce kapsamı doğrulayın.
3. Sağlayıcının resmî izin ekranında BTMEDYA için istenen yayın izinlerini onaylayın. Hesap tokenları D1 veritabanında şifrelenmiş biçimde tutulur; kullanıcı parolaları kaydedilmez.
4. Social OS'ta doğru bağlı hesabı seçin, uygun görsel/video dosyasını belirleyin ve önce ileri tarihli düşük riskli bir test paylaşımı planlayın.
5. Kuyruk bölümünde `queued`, `published` veya hata durumunu doğrulayın. Yalnızca profil adresinin görünmesi, API yayın izninin verildiği anlamına gelmez.

Platform sınırlamaları: Facebook kişisel profillerine otomatik gönderim bu uygulamada desteklenmez; Facebook Page gerekir. Instagram'ın sıradan kişisel hesabı yerine Professional/Business/Creator hesabı kullanılmalıdır. TikTok ve YouTube doğrudan yayınında video gerekir. Üretimdeki API izinleri ve platform inceleme/onay koşulları sağlayıcı hesabına göre değişebilir.

Ana sayfadaki sosyal medya profil bağlantıları, yayın API bağlantısından bağımsız olarak doğrudan Instagram/Facebook/YouTube/TikTok profillerine gider. Bir profil bağlantısı çalışsa bile, o hesabın otomatik paylaşım yetkisi ayrıca OAuth ile tamamlanmalıdır.

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
- [ ] `BTMEDYA SEO & Search Console Daily Sync` iş akışında sitemap gönderme ve `Inspect priority URLs in Google Search Console` adımları başarılı oldu.
- [ ] BTMEDYA Social OS'ta doğrudan yayın modu etkin (`BTMEDYA_SOCIAL_PUBLISHER=direct`).
- [ ] Her hedef platformun resmî OAuth uygulama bilgileri Cloudflare Worker'da tanımlı.
- [ ] İlgili platform hesabı Connect Merkezi üzerinden doğrudan yetkilendirildi.
- [ ] İlk sosyal gönderi düşük riskli bir test olarak planlandı ve yerel kuyrukta doğrulandı.
