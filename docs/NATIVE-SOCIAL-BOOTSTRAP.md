# BTMEDYA Native Social OS — Başlatma Kontrol Listesi

Bu kurulum, Metricool aboneliğine bağımlı olmadan mevcut Cloudflare Worker + D1 mimarisinde doğrudan sosyal yayın yapar. Üretim alan adı, Worker, D1 ve R2 kaynakları korunur.

## Doğrulanmış kod parçaları

- Yönetim paneli: `/admin/social-os/`
- Bağlantı merkezi: `/admin/connect/`
- Facebook Page + Instagram Professional OAuth: `src/direct-social.js`
- TikTok OAuth ve doğrudan yayın kuyruğu: `src/tiktok-direct.js` + `src/direct-social.js`
- YouTube OAuth ve doğrudan yayın kuyruğu: `src/youtube-direct.js` + `src/direct-social.js`
- X OAuth ve doğrudan yayın modülü: `src/x-direct.js` + `src/direct-social.js`
- Cron ile yerel kuyruk: `processDirectSocialQueue`
- Secret aktarımı: `.github/workflows/sync-worker-secrets.yml`, `native-social` kapsamı
- Birincil yayın ayarı: `BTMEDYA_SOCIAL_PUBLISHER=direct`

Kod modüllerinin mevcut olması, OAuth uygulamalarının ve platform hesaplarının bağlandığını tek başına kanıtlamaz. Bağlı hesap yoksa yayın yapılmaz.

## Uygulama kimlik bilgilerini ekleme

GitHub > Settings > Secrets and variables > Actions bölümünde yalnızca kullanacağınız sağlayıcılar için aşağıdaki secret'ları tanımlayın:

- Meta: `BTMEDYA_META_APP_ID`, `BTMEDYA_META_APP_SECRET`, tercihen `BTMEDYA_SOCIAL_TOKEN_ENCRYPTION_KEY`
- TikTok: `BTMEDYA_TIKTOK_CLIENT_KEY`, `BTMEDYA_TIKTOK_CLIENT_SECRET`
- YouTube: `BTMEDYA_YOUTUBE_CLIENT_ID`, `BTMEDYA_YOUTUBE_CLIENT_SECRET`
- X (isteğe bağlı): `BTMEDYA_X_CLIENT_ID`, `BTMEDYA_X_CLIENT_SECRET`

Ardından GitHub Actions > **BTMEDYA Sync Worker Secrets** > **Run workflow** > scope `native-social` seçin. Gizli değerleri issue, sohbet veya kaynak dosyalarına kopyalamayın.

## OAuth yönlendirme adresleri

- Meta: `https://btmedya.com.tr/api/social/direct/meta/callback`
- TikTok: `https://btmedya.com.tr/api/social/direct/tiktok/callback`
- YouTube: `https://btmedya.com.tr/api/social/direct/youtube/callback`

İlgili adresi her sağlayıcının geliştirici konsoluna tam eşleşecek şekilde ekleyin. X uygulaması için OAuth akışında belirtilen dönüş adresini kaynak kodla eşleştirin.

## Ücretsiz yayın mimarisi ve müşteri hesapları

- Birincil yol `BTMEDYA_SOCIAL_PUBLISHER=direct` olarak kalır; Metricool API tokenı veya Windsor.ai aboneliği gönderi yayınlamak için gerekmez.
- `/admin/social-os/` içinde önce BTMEDYA veya müşteri çalışma alanı seçilir, sonra platform OAuth bağlantısı yapılır. Bağlantı ve kuyruk kayıtları `workspace_type` / `workspace_id` ile ayrılır.
- Meta, TikTok ve YouTube OAuth akışları hesabı seçili çalışma alanına kaydeder. API anahtarları uygulama kurulumu için gerekir; müşteri hesap sahipleri kendi hesaplarında sağlayıcının resmî izin ekranını onaylamalıdır.
- İsteğe bağlı Buffer Free bağlantısı ayrı bir alternatif olabilir; ücretsiz planda en fazla 3 kanal ve 1 API anahtarı bulunduğundan çok müşterili sınırsız yayın çözümü değildir. TikTok'ta denetlenmemiş uygulamalar gönderileri özel görünürlükle sınırlayabilir.
- Windsor.ai analiz içindir, sosyal gönderi yayınlayıcı değildir. Ücretsiz planın hesap sınırı dolduğunda gerçek metrik üretmez; bu durumda sıfır değerleri gerçek veri gibi kullanmayın.

## Hesapları yetkilendirme ve test

1. `https://btmedya.com.tr/admin/connect/` sayfasına giriş yapın.
2. İlgili platformu bağla düğmesine basın ve sağlayıcının resmî izin ekranında onay verin.
3. Hesapların bağlı durumunu doğrulayın.
4. `https://btmedya.com.tr/admin/social-os/` sayfasında doğru hesabı seçin; Instagram için görsel/video, TikTok ve YouTube için video ekleyin.
5. İleri tarihli düşük riskli test gönderisi planlayın. Gerçek platformdaki gönderi bağlantısı veya kimliği görülmeden başarılı saymayın.

## Güvenlik ve platform sınırları

- Facebook için Page; Instagram için Professional/Business/Creator hesabı gerekir.
- TikTok'un Content Posting API erişimi ve `video.publish` onayı gerekir.
- YouTube OAuth onayı, Data API erişimi ve kota koşulları geçerlidir.
- API anahtarları eksikse Connect Merkezi eksik adları gösterir; bunlar kullanıcı parolası değildir.
- OAuth tokenları Worker/D1 tarafında şifrelenir. Hesap parolası saklanmaz.
- Önceden Metricool ile tutulan kayıtlar silinmez; yeni birincil yayın yolu Metricool'a çağrı yapmaz.
- D1/R2, DNS ve mevcut Worker yeniden oluşturulmaz.