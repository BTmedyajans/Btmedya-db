# BTMEDYA, Ajan Yönergeleri

BTMEDYA bir **haber markası**. Buradaki kararların çoğu teknik değil editoryal:
yanlış bir etiket ya da uydurulmuş bir cümle, bozuk bir CSS'ten çok daha pahalı.

Depo yapısı, API uçları ve Cloudflare durumu: README.md.

## Tek kaynak ve çalışma modeli

Bu depo **tek kanonik uygulama deposudur**.

- **Canlı uygulama:** btmedya-db Cloudflare Worker
- **Canlı alan adı:** https://btmedya.com.tr
- **İçerik yönetimi:** https://btmedya.com.tr/admin/
- **Medya:** Cloudflare R2
- **Veri:** Cloudflare D1
- **Kod/sürüm geçmişi:** GitHub
- **Production deploy:** main → Cloudflare Workers Builds → npx wrangler deploy

Günlük içerik için GitHub veya Cloudflare Dashboard kullanılmaz. Haber, medya,
video ve mesaj işlemleri admin panelinden yapılır. Cloudflare Dashboard yalnızca
altyapı ve yetkilendirme ayarları gerektiğinde kullanılır.

**Hostinger/Güzelhosting/Manus bu uygulamanın production yayın zincirinde değildir.**
Eski dokümanlarda bunlara rastlarsanız yeni işlem başlatmadan önce bu yönergeyi
esas alın.

## Kod stili

Saf HTML, CSS ve sade JavaScript. **Kütüphane yok, derleme adımı yok, npm yok.**
package.json yokluğu bir eksiklik değil, karar. npm install çalıştırmayın.

Tanımlayıcılar ve yorumlar **Türkçe**: servisEt, guvenlikBasliklari, onbellek,
KAYNAKLAR. Yeni kodu İngilizceye çevirmeyin.

Yorum, *ne* yaptığını değil **neden** öyle yapıldığını anlatır.

## Mimari

| Katman | Yer |
|---|---|
| Worker (API + statik servis) | src/worker.js, src/news-page.js |
| Şema | migrations/ |
| Yayınlanan her şey | public/ |
| Yönetim paneli | public/admin/index.html |
| Cloudflare yapılandırması | wrangler.toml |

public/ **olduğu gibi servis edilir.** Oraya koyduğunuz her dosya herkese
açıktır. Backend dosyaları bu klasörün dışında kalır.

## Yayına alma

main dalına push production dağıtımını tetikler. Cloudflare Builds üzerinde
**Dağıtım komutu npx wrangler deploy** olmalıdır.

npx wrangler versions upload production akışının ana komutu değildir.
Yeni bir version yüklemek ile production'a geçirmek aynı işlem değildir.

Yeni kod göndermeden önce aktif production değişikliğini bozmayacak küçük,
hedefli bir commit tercih edin.

## Doğrulama

Değişiklikler için öncelik sırası:

1. sözdizimi
2. yerel davranış
3. mobil davranış
4. canlı smoke test

Production smoke test GitHub Actions üzerinden ana sayfa ve /api/health
için çalışır.

Görsel ve davranış kontrolü için headless Chrome kullanılabilir. Chromium'da
H.264 olmayabilir; .mp4 oynatılamaması tek başına sitede hata değildir.

## Sessizce bozan tuzaklar

run_worker_first yalnızca listelenen yol desenlerinde Worker'ı öne alır.
Yeni bir üst düzey HTML sayfası eklenirken wrangler.toml kontrol edilmelidir.

CSP yola göre kurulur (cspKur, src/worker.js). Kamuya açık sayfalarda
script-src 'self': satır içi script veya onclick eklemeyin. /admin/ bunun
mevcut istisnasıdır.

Migration numaraları sıralıdır. Yeni dosya eklemeden önce migrations/ içine
bakın; aynı numarayı ikinci kez kullanmayın.

## Editoryal kurallar

**Uydurmayın.** Müşteri yorumu, fiyat, teslim süresi, referans, istatistik:
kaynağı yoksa üretilmez.

**AI etiketlemesi zorunluluk, süs değil.** Sitedeki her kare AI ÜRETİMİ ya da
GERÇEK ÇEKİM etiketi taşır. Varsayılan AI ÜRETİMİdir.

## Tasarım

Anasayfanın tasarım kaynağı docs/10K-TASARIM-PAKETI.md.

Bant metinlerinin en kötü kare kontrastı **3.5:1'in altına düşemez**.

İki komşu bölüm aynı iskeleti paylaşmaz.

## Yönetim paneli

Panel: https://btmedya.com.tr/admin/

Panel üzerinden haber, medya, video ve gelen mesajlar yönetilir. Medya
R2'ye gider, kayıtları D1'de tutulur. Panelde yapılması gereken bir işlem için
doğrudan R2 nesnelerini veya D1 tablolarını elle değiştirmek tercih edilmez.

Ayrıntı: docs/YONETICI-PANELI.md.
