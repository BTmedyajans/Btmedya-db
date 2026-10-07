# BTMEDYA Direct Social OS

BTMEDYA'nın kendi sosyal yayın katmanı. Metricool aboneliğini zorunlu kılmaz.

## V1

- Meta OAuth
- Facebook Page bağlantısı
- Bağlı Instagram Professional (Business/Creator) hesabı
- BTMEDYA çalışma alanı + müşteri çalışma alanı
- AES-GCM ile Worker Secret tabanlı erişim anahtarı şifreleme
- Planlı yayın kuyruğu
- Cloudflare Cron ile otomatik teslim
- Başarısız gönderiler için 5 denemeye kadar yeniden deneme
- Uygulama tarafında hesap paketi/abonelik kotası yok

## Worker değişkenleri / secret'ları

Secret olarak:

- `META_APP_SECRET`
- `SOCIAL_TOKEN_ENCRYPTION_KEY`

Değişken veya Secret olarak:

- `META_APP_ID`
- `META_OAUTH_REDIRECT_URI` (opsiyonel; varsayılan: `https://btmedya.com.tr/api/social/direct/meta/callback`)
- `META_GRAPH_VERSION` (opsiyonel; varsayılan: `v26.0`)
- `BTMEDYA_PUBLIC_ORIGIN` (opsiyonel; varsayılan: `https://btmedya.com.tr`)

## Meta uygulama geri dönüş adresi

`https://btmedya.com.tr/api/social/direct/meta/callback`

Uygulama tarafında Facebook Page + Instagram Professional yayın izinleri istenir.

## Kullanım

Admin'e giriş yaptıktan sonra:

`/admin/social-os/`

Önce çalışma alanını seç, ardından **Meta / Facebook + Instagram bağla** düğmesine bas.

## Önemli platform sınırları

Facebook tarafında bu katman Page yayınını hedefler; kişisel Facebook profilini resmi Graph API ile otomatik yayınlama hedeflenmez.

Instagram tarafında resmi API consumer/personal hesapları desteklemez. Otomatik yayın için Professional Business/Creator hesabı gerekir ve Facebook Login yönteminde Page bağlantısı gerekir.

Meta'nın API/rate-limit, uygulama incelemesi ve yetki şartları uygulama dışındadır; BTMEDYA Social OS bu nedenle "aboneliksiz"dir, "sınırsız API çağrısı" değildir.

## Mevcut BTMEDYA zinciri

- Metricool mevcutsa eski yayın zinciri çalışmaya devam eder.
- Direct Social OS Meta hesapları için ayrı yayın kuyruğu kullanır.
- Medya `/pub/<key>` üzerinden herkese açık yayınlanmış olmalıdır.
