# BTMEDYA Control Center

BTMEDYA'nın Cloudflare Worker yönetimi, CMS, medya kasası, sosyal içerik akışı ve dış AI bağlantıları için merkezi operasyon katmanıdır.

## Mevcut durum

- Production: `https://btmedya.com.tr/`
- Worker: `btmedya-db`
- D1: `btmedya-media`
- R2: `btmedya-media`
- Admin: `/admin/`
- Control Center API: `GET /api/admin/control-center`
- iZap: mevcut `busetuncay74` WhatsApp asistanı operasyon talimatlarıyla güncellendi.
- CMS Open Data: ChatGPT tarafında resmi CMS/Medicare veri sorguları için kullanılabilir.
- GitHub → Cloudflare Workers Builds: production deploy zinciri.

## Güvenlik modeli

Control Center API admin oturumu ister. Cloudflare, GitHub, D1, R2 veya iZap gizli anahtarları kaynak koduna yazılmaz.

Otomatik yapılabilecek işler ile kullanıcı onayı gerektiren işler ayrılmalıdır:

- Otomatik: sağlık kontrolü, entegrasyon durumu, SEO/metadata kontrolleri, raporlar.
- Onaylı: haber yayınlama, medya yayınlama, deploy, sosyal paylaşım, DNS değişiklikleri.
- Kullanıcıya özel: token oluşturma, 2FA, ana hesap şifreleri ve yıkıcı işlemler.

## iZap

iZap doğrudan Worker secret'ı olarak gömülmez. WhatsApp asistanı müşteri taleplerini toplar ve doğrulanmamış teknik işlemleri yapılmış gibi göstermeden BTMEDYA operasyonuna aktarır.

## CMS Open Data

CMS Open Data, resmi Medicare verileri için araştırma/veri kaynağıdır. Bu kaynak BTMEDYA'nın D1 haber CMS'si değildir. Control Center, CMS verisini doğrudan Worker'a kopyalamak yerine gerektiğinde ChatGPT/entegrasyon katmanından sorgulatır.

## Sonraki bağlantı

Cloudflare Worker'daki zorunlu production secret'ları tamamlandıktan sonra Control Center canlı sağlık durumunu gösterebilir. Sosyal platform secret'ları da aynı panelden durum olarak izlenebilir; gizli değerler hiçbir zaman UI veya GitHub kaynak kodunda gösterilmez.
