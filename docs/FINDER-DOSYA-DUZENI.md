# BTMEDYA Finder Dosya Düzeni

Bu belge, `btmedya.com.tr` için kullanılan kanonik kaynak deposunun Finder'da kolay bulunacak şekilde nasıl gruplanacağını kaydeder. Production kaynağı **GitHub `BTmedyajans/Btmedya-db` → Cloudflare Worker `btmedya-db`** zinciridir; Finder'daki yerel klasör bu zincirin çalışma kopyasıdır.

> **Kapsam:** Bu kayıt, sandbox içindeki kaynak deposunun gerçek yapısına dayanır. Kullanıcının kişisel Mac Finder etiketleri veya klasör konumları bu oturumda okunmadığı için varsayılmamıştır.

## Finder'da kök klasör

Finder'da depo kökü `Btmedya-db` olarak tutulur. Kök seviyesinde yalnızca çalışma sistemiyle doğrudan ilişkili klasörler ve yapılandırma dosyaları bulunur:

```text
Btmedya-db/
├── public/          # Kullanıcıya servis edilen tüm site dosyaları
├── src/             # Worker backend'i ve iç servis modülleri
├── migrations/      # Cloudflare D1 şema değişiklikleri
├── r2-media/        # Medya arşivi ve üretim kaynakları
├── docs/            # Mimari, editoryal, yayın ve operasyon belgeleri
├── tools/           # Denetim, üretim ve senkronizasyon araçları
├── control-plane/   # Cloudflare kontrol/diagnostic script'leri
├── .github/         # CI, production smoke test ve otomasyon iş akışları
├── wrangler.toml    # Worker, D1, R2, KV ve domain yapılandırması
├── package.json     # Wrangler komutlarının tanımı
├── README.md        # Proje özeti ve API sözleşmesi
└── AGENTS.md        # Kaynak gerçekliği ve çalışma kuralları
```

## `public/`: Finder'da "Yayın"

`public/` olduğu gibi Cloudflare Workers Assets üzerinden servis edilir. Backend veya secret dosyası bu klasöre konmaz.

```text
public/
├── index.html, en/                 # Türkçe ve İngilizce giriş sayfaları
├── haberler/                       # Haber listesi ve statik haber sayfaları
├── hizmetler/, video-produksiyon/  # Hizmet sayfaları
├── sosyal-medya/, sosyal-medya-kit/ # Sosyal yayın ve kit sayfaları
├── vaka-calismalari/, portfoy/     # Gerçek iş ve portföy sayfaları
├── ai-lab/                         # AI üretimleri; gerçek haber arşivinden ayrı
├── admin/, social-studio/          # İç operasyon arayüzleri
├── assets/                         # Siteye servis edilen görsel, font ve video varlıkları
├── data/                           # Haber, medya ve vitrin katalogları
├── .well-known/                    # security.txt ve doğrulama dosyaları
├── robots.txt, sitemap.xml         # Arama motoru keşif dosyaları
├── news-sitemap.xml, rss.xml       # Haber keşif ve RSS akışı
└── site.webmanifest                # PWA/uygulama metadata'sı
```

### `public/assets/` adlandırma kuralı

- `logo/`: BTMEDYA logoları ve amblemleri.
- `haber-kapak/`: Haber kapakları; mümkünse haber slug'ıyla aynı ad kullanılır.
- `media/web/`: Hero ve vitrin video/görselleri.
- `media/ai-lab/`: AI üretimleri; dosya ve sayfa üzerinde AI etiketi korunur.
- `media/portfoy/`: Gerçek kişi/iş portföyü görselleri.
- `fonts/`: Site içinde kullanılan font dosyaları.

## `src/`: Finder'da "Uygulama"

| Dosya | Sorumluluk |
|---|---|
| `src/worker.js` | API, kimlik doğrulama, statik servis, sitemap/RSS üretimi ve Worker giriş noktası |
| `src/news-page.js` | Haber sayfaları için HTML üretimi |
| `src/news-intelligence.js` | Kaynak tarama ve haber bulucu yardımcıları |
| `src/sabah-masasi.js` | Sabah Masası içerik akışı |
| `src/social-platforms.js` | Sosyal platform kayıtları |
| `src/sosyal-otomasyon.js` | Sosyal yayın otomasyonu |
| `src/metricool-scheduler.js` | Metricool zamanlama/entegrasyon yardımcıları |
| `src/sales-router.js` | Teklif ve satış yönlendirme akışı |
| `src/ai-gorunurluk.js` | AI görünürlük yardımcıları |
| `src/auth-recovery.js` | Yönetici erişim kurtarma akışı |

## `docs/`: Finder'da "Karar ve Kanıt"

- `CANONICAL-RESOURCE-MAP.md`: Production kaynak gerçeği.
- `CANLIYA-ALMA.md`: Yayına alma ve smoke test sözleşmesi.
- `MEDIA-VAULT.md`: R2/D1 medya kasası akışı.
- `KAYNAK-VE-MEDYA-REHBERI.md`: Kaynak, lisans ve editoryal provenance kuralları.
- `YONETICI-PANELI.md`: Admin paneli işlemleri.
- `DOMAIN-DNS-SEARCH-CONSOLE-AUDIT-*.md`: Domain ve arama görünürlüğü denetim kanıtları.
- `superpowers/`: Planlar ve tasarım/uygulama çalışma notları.

Yeni bir operasyon kararı önce `docs/` içine yazılır; kod davranışı değişiyorsa ilgili kaynak dosyası ve denetim kuralı aynı değişiklikte güncellenir.

## `tools/`: Finder'da "Kontrol"

Denetim araçları üretim kodundan ayrı tutulur:

- `site-denetimi.mjs`: Canlı sitemap, SEO, güvenlik, asset, dağıtım ve vitrin kontrolü.
- `a11y-denetimi.mjs`: Statik HTML erişilebilirlik kontrolü.
- `responsive-a11y-smoke.mjs`: Üç viewport ile tarayıcı smoke testi.
- `link-denetimi.mjs`: Dahili link ve asset bütünlüğü.
- `validate-assets.py`: Yerel asset referansları.
- `gerileme-denetimi.mjs`: Editoryal/metadata regresyon kapısı.
- `medya-listesi.mjs`: Vitrin medya katalog üretimi ve kontrolü.

## Finder'da günlük çalışma kuralı

1. **İçerik** için `public/` dosyalarını elle değiştirmek yerine `/admin/` panelini kullan.
2. **Kaynak kod** değişikliğini `src/`, `public/` veya `tools/` altında küçük ve hedefli tut.
3. **D1 migration** eklemeden önce `migrations/` içindeki son numarayı kontrol et.
4. **Görsel/video** eklerken doğru `public/assets/` alt klasörünü ve AI/gerçek çekim etiketini koru.
5. Değişiklikten sonra sözdizimi, yerel denetimler, mobil/a11y ve canlı smoke test sırasını izle.
6. `main` dalına giden doğrulanmış değişiklik Cloudflare Workers Builds üzerinden production'a ulaşır; ayrı bir backend veya yayın klasörü oluşturma.

## Kısa arama rehberi

- Bir sayfa bozuksa: önce `public/<sayfa>/index.html`, sonra `src/worker.js`, sonra `wrangler.toml`.
- Bir görsel 404 ise: `public/assets/` yolu, `public/data/` katalog kaydı ve `tools/validate-assets.py`.
- Bir haber görünmüyorsa: admin paneli → D1 kaydı → `public/data/haberler.json`/sitemap ve `tools/site-denetimi.mjs`.
- `www` farklı içerik gösteriyorsa: `src/worker.js` alan adı yönlendirmesi, `wrangler.toml` custom domain ve canlı smoke test.
- Production farklı sürümdeyse: GitHub Actions, `/api/health` içindeki `surum.yuklendi` ve canlı dosya hash'leri.
