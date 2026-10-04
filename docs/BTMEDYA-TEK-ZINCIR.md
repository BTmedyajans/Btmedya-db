# BTMEDYA Tek Üretim Zinciri

Bu depo BTMEDYA'nın tek kanonik web uygulamasıdır.

## 1. Production kaynak gerçeği

```
ChatGPT / Claude Code
        ↓
GitHub: BTmedyajans/Btmedya-db
        ↓
main
        ↓
Cloudflare Workers Builds
        ↓
Worker: btmedya-db
        ├── D1: btmedya-media
        └── R2: btmedya-media
        ↓
btmedya.com.tr
```

GitHub'daki kod ve `wrangler.toml` production yapılandırmasının kaynak gerçeğidir.

## 2. Kullanılacak bağlantılar

### Zorunlu

- GitHub repository: `BTmedyajans/Btmedya-db`
- Cloudflare Worker: `btmedya-db`
- Cloudflare D1: `btmedya-media`
- Cloudflare R2: `btmedya-media`
- Domain: `btmedya.com.tr`
- GitHub Actions secret: `CLOUDFLARE_API_TOKEN`
- GitHub Actions secret: `CLOUDFLARE_ACCOUNT_ID`

### Site özelliğine göre

- `BTMEDYA_ADMIN_PASSWORD_SECRET`
- `BTMEDYA_ADMIN_SESSION_SECRET_SECRET`
- `BTMEDYA_MEDIA_SIGNING_SECRET`
- `BTMEDYA_OPENAI_API_KEY` yalnızca AI özellikleri etkinse
- Resend secret'ları yalnızca e-posta gönderimi etkinse
- Meta/TikTok/YouTube secret'ları yalnızca ilgili sosyal yayın özelliği etkinse
- Google Drive yalnızca master arşivden içe aktarma gerektiğinde

Secret değerleri hiçbir zaman GitHub dosyasına veya sohbet mesajına yazılmaz.

## 3. ChatGPT ve Claude Code çalışma modeli

### ChatGPT

ChatGPT'nin GitHub bağlantısı üzerinden:

- dosya okuyabilir,
- mevcut kodu inceleyebilir,
- hedefli dosya değişikliği yapabilir,
- commit oluşturabilir,
- workflow/check sonuçlarını inceleyebilir.

ChatGPT Cloudflare hesabının parolasını veya API token değerini sohbet içinde istemez.

### Claude Code

Claude Code yalnızca GitHub repository üzerindeki çalışma kopyasında geliştirme istemcisidir.

Claude Code'un yaptığı değişiklikler de aynı kurala uyar:

1. mevcut kodu oku,
2. küçük ve hedefli değişiklik yap,
3. testleri çalıştır,
4. commit/PR oluştur,
5. production'a yalnızca GitHub üzerinden gönder.

Claude Code, Manus veya ayrı bir backend production zincirine eklenmez.

## 4. Cloudflare'ın rolü

Cloudflare production altyapısıdır:

- Worker: uygulama/API
- D1: yapılandırılmış site verisi
- R2: web medya kasası
- DNS: alan adı
- Workers Builds: production deploy
- Worker Secrets: gizli uygulama anahtarları
- Cloudflare Access: admin gibi özel alanları koruma

Cloudflare Dashboard günlük içerik düzenleme aracı değildir. Haber, medya, video ve mesaj yönetimi admin panelinden yapılır.

## 5. Manus / Macaly / Hostinger / FastAPI / Convex

Bunlar BTMEDYA production runtime'ında kullanılmaz.

- Manus: eski prototip/araç geçmişi
- Macaly: staging/prototip referansı
- Hostinger/Güzelhosting: domain/altyapı geçmişi; Worker production zincirinin dışında
- FastAPI: Worker ile aynı API sorumluluğunu tekrar edeceği için kullanılmaz
- Convex: eski/prototip backend; D1/Worker'ın yerine geçmez

Bu isimlerin dokümantasyonda geçmesi bağlantı kurulduğu anlamına gelmez.

## 6. Production workflow'ları

Gerekli zincir:

- `deploy.yml`: ana production deploy/doğrulama
- `production-diagnostic.yml`: periyodik ve değişiklik sonrası sağlık kontrolü
- `cloudflare-control-plane.yml`: Cloudflare DNS/Email Routing denetimi; varsayılan davranış AUDIT
- `sync-worker-secrets.yml`: Worker secret senkronizasyonu, yalnızca ihtiyaç olduğunda
- `d1-migrations.yml`: D1 migration, yalnızca migration gerektiğinde
- `r2-sync.yml`: statik medya arşivi R2 senkronizasyonu

Aynı Worker'ı ikinci kez deploy eden workflow oluşturulmaz.

## 7. Güvenlik

- Global Cloudflare API Key kullanılmaz.
- GitHub secret değerleri dosyaya yazılmaz.
- Production'da kullanılmayan üçüncü taraf tokenlar tutulmaz.
- Cloudflare Control Plane varsayılan olarak `AUDIT` çalışır.
- DNS/MX değişiklikleri canlı mail akışı doğrulanmadan uygulanmaz.
- `send.btmedya.com.tr` gibi Resend/Amazon SES kayıtları, servis gerçekten kullanılmıyorsa kontrollü olarak temizlenir.
- R2 ham arşivleri doğrulanmadan silinmez.

## 8. İçerik güvenliği

- Gerçek çekim ve AI üretimi ayrı tutulur.
- AI içeriği açıkça AI LAB olarak etiketlenir.
- Haber otomatik olarak uydurulmaz.
- Kaynak doğrulaması ve editoryal onay olmadan haber yayınlanmaz.
- Sosyal otomasyon için yayın hedefi, içerik ve yayın koşulları kayıtlı olmalıdır.

## 9. Değişiklik ilkesi

BTMEDYA'da bundan sonra bir değişiklik için önce GitHub kaynak kodu incelenir.

Aynı iş için Manus, Macaly, ayrı FastAPI backend'i veya ayrı D1 sistemi yeniden kurulmaz.

Tek hedef:

**GitHub → Cloudflare → BTMEDYA canlı sitesi.**
