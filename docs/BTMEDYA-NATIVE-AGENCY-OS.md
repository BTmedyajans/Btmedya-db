# BTMEDYA Native Agency OS

## Karar
Ana işletim katmanı BTMEDYA Worker + D1 + R2 + KV üzerinde kalır. Üçüncü taraflar yardımcı/adaptördür.

## Çekirdek
- Worker: API, OAuth callback, cron/queue, güvenlik
- D1: müşteri/workspace, sosyal hesap, içerik, yayın kuyruğu, görev, log
- R2: medya kasası
- KV: OAuth state, kısa süreli cache/rate limit
- GitHub: kaynak kodu + CI/CD
- Cloudflare: edge/deploy/DNS
- Supabase: yalnızca gerektiğinde analitik/harici uygulama veri katmanı
- Metricool: fallback; native yayın ana yolu değil

## Adaptörler
- Meta Direct: Facebook Page + Instagram Professional
- TikTok Content Posting API
- YouTube Data API
- X API
- WhatsApp Cloud API
- Canva: tasarım üretimi/dosya kaynağı; yayın motoru değil
- Dropbox: arşiv/girdi kaynağı; R2 ana medya kasası
- Notion: opsiyonel müşteri bilgi tabanı
- Slack: opsiyonel ekip bildirim kanalı
- HubSpot: CRM ihtiyacı olan müşteriler için opsiyonel
- Windsor/Metricool: harici analitik/yayın adaptörü
- Higgsfield/Magnific: üretim araçları; çekirdek bağımlılık değil

## İlke
Bir müşteri hesabını yönetmek için mümkünse tek müşteri workspace'i oluşturulur. Platform bağlantısı bir kez yapılır, token sunucuda şifreli tutulur, sonraki işler BTMEDYA Social OS kuyruğundan yürür.

## Kullanıcıya kalanlar
Yalnızca platformların zorunlu ilk yetkilendirmeleri ve geliştirici uygulaması onayları. Şifre/token ChatGPT'ye veya GitHub koduna konulmaz.

## Maliyet politikası
Ücretli üçüncü taraf ürünler varsayılan bağımlılık değildir. Native API + Cloudflare ücretsiz/uygun katmanları önceliklidir. Ücretli servis ancak native yol teknik veya ticari olarak mümkün değilse adaptör olarak kullanılır.
