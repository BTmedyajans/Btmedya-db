# BTMEDYA Depo Yönlendirme Politikası

Son doğrulama: 16 Ekim 2026.

## Kanonik depo ve üretim zinciri

Tek kanonik uygulama deposu: `BTmedyajans/Btmedya-db`.

Üretim zinciri:

`BTmedyajans/Btmedya-db:main` → `.github/workflows/deploy-production.yml` → Wrangler → Cloudflare Worker `btmedya-db` → `btmedya.com.tr`.

Üretim dağıtımı yalnızca `main` dalına gelen uygun değişikliklerle çalışmalıdır. Cloudflare Workers Builds ile ikinci ve bağımsız bir dağıtım zinciri açılmamalıdır. `develop` dalı entegrasyon ve doğrulama içindir; doğrudan üretime dağıtım yapmaz.

## Dal ve PR akışı

1. Yeni geliştirmeler ve diğer fork'lardan gelen katkılar `develop` dalına yönelik Pull Request ile alınır.
2. Pull Request doğrulama iş akışları `main` ve `develop` hedeflerini kontrol eder.
3. Entegrasyon doğrulamaları geçmeden değişiklikler `main` dalına alınmaz.
4. `develop` dalından `main` dalına ayrı bir yayın PR'ı açılır. Üretim dağıtımı ancak bu PR birleştirildikten sonra tetiklenir.
5. `main` dalına doğrudan commit atılmaz. Fork dalları topluca veya körlemesine ana dala senkronize edilmez.

## Diğer depolar

- `busetuncay1029-ai/Btmedya-db`: kanonik deponun fork'udur. 16 Ekim 2026 karşılaştırmasında ana depodan 191 commit geride ve ana depoda bulunmayan 8 commit ilerideydi. Bu değişiklikler otomatik birleştirilmez; `develop` hedefine PR ile incelenir.
- `Btmedya/Btmedya-db`: kanonik deponun fork'udur. Aynı tarihte ana depoya göre 1198 commit gerideydi ve özgün ileri commit'i yoktu. Yeni geliştirme veya üretim kaynağı olarak kullanılmamalıdır. Bu fork silinmez ya da zorla senkronize edilmez; önce canlı bağlantısı olup olmadığı ayrıca doğrulanmalıdır.
- Diğer fork ve çalışma depolarındaki değişiklikler yalnızca kaynak dosyalar, geçmiş, varlıklar ve testler incelendikten sonra PR üzerinden taşınır. Bir fork'un aynı ada sahip olması, onun üretim kaynağı olduğu anlamına gelmez.

## Cloudflare doğrulama kuralı

Üretim Worker'ı `btmedya-db`, D1 veritabanı `btmedya-media` ve `btmedya.com.tr` ile `www.btmedya.com.tr` alan adı bağları üretim zincirinin parçasıdır. Cloudflare API işlemlerinden önce etkin hesabın kimliği `wrangler.toml` içindeki `account_id` ile eşleşmelidir. Yanlış hesaba bağlı bir bağlantıyla Worker, DNS, D1, R2 veya secret değişikliği yapılmaz. Secret değerleri koda veya dokümana yazılmaz.

## Yönetici tarafından çözülmesi gereken kural seti engeli

GitHub'daki `Bağlantılar` kural seti şu an tüm dallara uygulanıyor ve dört onay, doğrusal geçmiş, imzalı commit, tarama ve PR zorunlulukları içeriyor. Bu kapsam `develop` ve `automation/*` dallarını da kilitleyebilir. 16 Ekim 2026'da `automation/haber-kapaklari` dalını güncelleyen kapak otomasyonu bu nedenle başarısız oldu: GitHub korunan dalın doğrudan güncellenmesini reddetti.

Önerilen hedef:
- `main`: PR zorunlu, gerekli üretim/CI kontrolleri ve ana dal için belirlenen onay sayısı.
- `develop`: PR zorunlu ve CI kontrolleri; ana dalın dört onay şartı aynen uygulanmamalı.
- `automation/*`: otomasyon ya izin verilen PR tabanlı dalları kullanmalı ya da dar kapsamlı, ayrı bir kural istisnasına sahip olmalı. Geniş kapsamlı korumayı kapatmak yerine yalnız gerekli ref kapsamı düzenlenmeli.

Bu kural seti ayarı GitHub yönetici ayarından değiştirilmelidir. Depo kodu tek başına GitHub Ruleset yapılandırmasını değiştiremez; değişiklik yapılmış gibi kabul edilmemelidir.
