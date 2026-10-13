# BTMEDYA Sosyal API Bağlantısı — Doğrudan Yayın

## Üretim mimarisi

BTMEDYA'nın birincil yayın yolu **BTMEDYA Native Social OS**'tur. Worker, hesapları sağlayıcıların resmî OAuth/API akışlarıyla doğrudan yetkilendirir ve D1'deki `social_direct_jobs` kuyruğundan yayımlar. Bir Metricool aboneliği, tokenı veya Brand ID'si gerekmez.

- Web sayfasındaki sosyal profil bağlantıları doğrudan sosyal ağların profillerine gider.
- Otomatik gönderi yetkisi ayrı olarak Connect Merkezi'nde resmî OAuth izinleriyle alınır.
- `wrangler.toml` içinde `BTMEDYA_SOCIAL_PUBLISHER = "direct"` birincil yayın modudur.
- Cloudflare Cron, doğrudan kuyruğu beş dakikada bir işler.
- Önceki Metricool gönderileri/kayıtları D1'den silinmez; ancak birincil yayın yolunda kullanılmaz.

## Resmî uygulama bilgileri

GitHub > Settings > Secrets and variables > Actions alanında aşağıdaki GitHub secret isimleri kullanılır. Secret değerleri sohbete veya kaynak dosyasına yazılmaz.

| GitHub Secret | Cloudflare Worker Secret/Variable | Kullanım |
|---|---|---|
| `BTMEDYA_META_APP_ID` | `META_APP_ID` | Facebook + Instagram OAuth |
| `BTMEDYA_META_APP_SECRET` | `META_APP_SECRET` | Facebook + Instagram OAuth |
| `BTMEDYA_SOCIAL_TOKEN_ENCRYPTION_KEY` | `SOCIAL_TOKEN_ENCRYPTION_KEY` | OAuth tokenlarını şifrelemek; mevcut `MEDIA_SIGNING_SECRET` yedek olarak kullanılabilir |
| `BTMEDYA_TIKTOK_CLIENT_KEY` | `TIKTOK_CLIENT_KEY` | TikTok OAuth |
| `BTMEDYA_TIKTOK_CLIENT_SECRET` | `TIKTOK_CLIENT_SECRET` | TikTok OAuth |
| `BTMEDYA_YOUTUBE_CLIENT_ID` | `YOUTUBE_CLIENT_ID` | YouTube OAuth |
| `BTMEDYA_YOUTUBE_CLIENT_SECRET` | `YOUTUBE_CLIENT_SECRET` | YouTube OAuth |
| `BTMEDYA_X_CLIENT_ID` | `X_CLIENT_ID` | X OAuth (isteğe bağlı) |
| `BTMEDYA_X_CLIENT_SECRET` | `X_CLIENT_SECRET` | X OAuth yenileme (isteğe bağlı) |

### GitHub → Cloudflare aktarımı

1. Önce resmî geliştirici portallarında ilgili uygulamaları oluşturun ve kimlik bilgilerini GitHub Secrets'a kaydedin.
2. GitHub > Actions > **BTMEDYA Sync Worker Secrets** > **Run workflow** bölümünde `native-social` kapsamını seçin.
3. İş akışı değerleri göstermeden tanımlı secret'ları `btmedya-db` Worker'ına aktarır. Tanımlı olmayan isteğe bağlı secret'lar atlanır; otomatik olarak uydurulmaz.
4. Bağlantı merkezi `https://btmedya.com.tr/admin/connect/` üzerinden hedef platformun **resmî OAuth** akışını tamamlayın.

Meta OAuth dönüş adresi:
`https://btmedya.com.tr/api/social/direct/meta/callback`

TikTok OAuth dönüş adresi:
`https://btmedya.com.tr/api/social/direct/tiktok/callback`

YouTube OAuth dönüş adresi:
`https://btmedya.com.tr/api/social/direct/youtube/callback`

X bağlantısı kullanılacaksa `/api/social/direct/x/callback` dönüş adresini uygulama koduyla eşleştirin.

## Platform şartları

- Facebook otomatik paylaşımı için Facebook Page gerekir; kişisel profil bu uygulamada hedef değildir.
- Instagram Professional/Business/Creator hesabı, ilgili Meta izinleri ve bağlı Facebook Page gerektirir.
- TikTok için Content Posting API erişimi ve `video.publish` izni gerekir; sağlayıcının inceleme/onay şartları geçerlidir.
- YouTube için OAuth onayı, YouTube Data API yükleme izni ve kota koşulları geçerlidir.
- Instagram için görsel/video; TikTok ve YouTube için video seçilmelidir.
- Hesabın sitede profil bağlantısının olması, otomatik yayın yetkisinin onaylandığı anlamına gelmez.

## Doğrulama

1. `/admin/connect/` ekranında eksik uygulama kimlik bilgilerini kontrol edin.
2. Sağlayıcının resmî izin ekranından hesabı bağlayın.
3. `/admin/social-os/` ekranında hesapların doğrudan bağlı olduğunu görün.
4. Düşük riskli bir test gönderisini ileri tarihli planlayın; kuyruğun `published` durumuna geçmesini ve platformdaki gerçek gönderi kimliğini doğrulayın.

Parola, OAuth tokenı, uygulama secret'ı ve şifreleme anahtarı GitHub kaynak dosyalarında tutulmaz.