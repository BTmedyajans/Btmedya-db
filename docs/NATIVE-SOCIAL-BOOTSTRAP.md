# BTMEDYA Native Social OS — Başlatma Kontrol Listesi

Bu belge, Metricool aboneliğine bağımlı olmadan mevcut Cloudflare Worker + D1 mimarisinde doğrudan sosyal yayın kurulumunu takip eder. Üretim domaini, Worker, D1 ve R2 kaynakları aynen korunur.

## Doğrulanan mevcut parçalar

- Yönetim paneli: `/admin/social-os/`
- Facebook Page + Instagram Professional OAuth: `src/direct-social.js`
- Worker Cron üzerinden doğrudan yayın kuyruğu: `processDirectSocialQueue`
- Secret aktarımı: GitHub Actions iş akışı `.github/workflows/sync-worker-secrets.yml`, `meta` / `native-social` kapsamları.
- D1'de bağlı hesap bulunmadığı için OAuth tamamlanana kadar yayın gerçekleşemez.

## Sıra

1. Meta for Developers içinde BTMEDYA adına uygulama oluştur. App ID ve App Secret'ı GitHub → Settings → Secrets and variables → Actions alanında şu adlarla kaydet:
   - `BTMEDYA_META_APP_ID`
   - `BTMEDYA_META_APP_SECRET`
   - `BTMEDYA_SOCIAL_TOKEN_ENCRYPTION_KEY` (güçlü, rastgele ayrı anahtar)
2. Meta Login/OAuth redirect URI olarak tam şu adresi ekle: `https://btmedya.com.tr/api/social/direct/meta/callback`
3. GitHub Actions → **BTMEDYA Sync Worker Secrets** → **Run workflow** → scope `meta`. Bu adım tanımlı GitHub secret'larını mevcut Worker'a aktarır; kod deposuna secret yazılmaz.
4. Workflow başarılı olduktan sonra `https://btmedya.com.tr/admin/social-os/` sayfasına giriş yap ve **Meta / Facebook + Instagram bağla** seçeneğine bas. Facebook Page ve Instagram Professional hesabı için Meta onayını tamamla.
5. Önce sadece kendi hesabında düşük riskli test paylaşımı planla. Medya, `/pub/<key>` üzerinden herkese açık olmalı; Instagram için görsel veya video gereklidir. Gerçek post URL'si/ID'si doğrulanmadan yayın başarılı kabul edilmez.

## TikTok / YouTube sonraki faz

Ayrı geliştirici uygulaması ve OAuth gerekir. GitHub secret isimleri:
- TikTok: `BTMEDYA_TIKTOK_CLIENT_KEY`, `BTMEDYA_TIKTOK_CLIENT_SECRET`
- YouTube: `BTMEDYA_YOUTUBE_CLIENT_ID`, `BTMEDYA_YOUTUBE_CLIENT_SECRET`

Her iki ağ için OAuth redirect URI, sağlayıcının geliştirici konsoluna eklenmelidir:
- `https://btmedya.com.tr/api/social/direct/tiktok/callback`
- `https://btmedya.com.tr/api/social/direct/youtube/callback`

Tüm kimlik bilgileri hazır olduğunda aynı workflow'da `native-social` scope'u seç. TikTok'un kamuya açık yayın için uygulama denetimi/izinleri, YouTube'un OAuth ve API kota/uygunluk şartları geçerlidir.

## Güvenlik ve yayın kontrolü

- Token, App Secret ve şifreleme anahtarı sohbet, issue, PR ya da kaynak dosyasına yazılmaz.
- Metricool ile ilgili mevcut bağlantılar ve taslaklar silinmez; bu iş akışı yeni bir ücret başlatmaz.
- D1/R2, DNS ve mevcut Worker yeniden oluşturulmaz.
- Kullanıcı hesabını OAuth ile onaylamadan hiç kimse adına yayın yapılmaz.
- Meta App ID/Secret yoksa sistemin OAuth'u başlatamayacağı açık şekilde bildirilmelidir.
