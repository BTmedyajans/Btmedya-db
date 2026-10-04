# BTMEDYA, Ajan Yönergeleri

BTMEDYA bir **haber markası**. Buradaki kararların çoğu teknik değil editoryal:
yanlış bir etiket ya da uydurulmuş bir cümle, bozuk bir CSS'ten çok daha pahalı.

Depo yapısı, API uçları ve Cloudflare durumu: [`README.md`](README.md).

## Kod stili

Saf HTML, CSS ve sade JavaScript. **Kütüphane yok, derleme adımı yok, npm yok.**
`package.json` yokluğu bir eksiklik değil, karar. `npm install` çalıştırmayın.

Tanımlayıcılar ve yorumlar **Türkçe**: `servisEt`, `guvenlikBasliklari`,
`onbellek`, `KAYNAKLAR`. Örnek için [`src/worker.js`](src/worker.js) ve
[`public/anasayfa.js`](public/anasayfa.js). Yeni kodu İngilizceye çevirmeyin.

Yorum, *ne* yaptığını değil **neden** öyle yapıldığını anlatır. Sessizce
başarısız olan bir tuzağı kapatan satırın üstüne o tuzağı yazın:
`.band{isolation:isolate}` satırındaki not iyi bir örnek.

## Mimari

| Katman | Yer |
|---|---|
| Worker (API + statik servis) | `src/worker.js`, `src/news-page.js` |
| Şema | `migrations/` |
| Yayınlanan her şey | `public/` |

`public/` **olduğu gibi servis edilir.** Oraya koyduğunuz her dosya herkese
açıktır. Backend dosyaları bu klasörün dışında kalır.

## Yayına alma

`main` dalına push **doğrudan canlı siteyi günceller** (Cloudflare Workers
Builds → `btmedya-db` → btmedya.com.tr). Ayrı bir deploy adımı yoktur.
Ayrıntı: [`docs/CANLIYA-ALMA.md`](docs/CANLIYA-ALMA.md).

## Doğrulama

Test paketi yok. Doğrulama, sayfayı gerçekten sürerek yapılır:

```bash
python3 -m http.server 8788 --directory public   # ya da eşdeğeri
node --check src/worker.js public/anasayfa.js    # sözdizimi
node tools/dogrula.mjs                           # yapılandırma kontrolleri
```

`tools/dogrula.mjs`, aşağıdaki "sessizce bozan tuzaklar" bölümünde yazılı
hataların makineyle yakalanabilen kısmını denetler: kanonik adres tutarlılığı,
`run_worker_first` kapsamı, nonce'suz satır içi script, migration numaraları,
`routes` kapalılığı ve host yönlendirme tablosu. Aynı kontroller her pull
request'te `.github/workflows/dogrulama.yml` ile çalışır.

Betik görsel hiçbir şey denetlemez. Kontrast, perde ve video oynatma hâlâ gözle
kontrol edilir; "doğrulama temiz" çıktısı sayfanın doğru göründüğü anlamına
gelmez.

Görsel ve davranış kontrolü için headless Chrome (CDP) kullanılır:
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Bu Chromium'da **H.264
yoktur.** `.mp4` oynatılamaz, `.webm` oynar. Bir videonun açılmaması tek
başına sitede hata olduğunu göstermez.

"Çalışıyor olmalı" bir doğrulama değildir. Ekran görüntüsü alın ve bakın;
son iki gerçek hata (perde sisteminin tümüyle etkisiz olması, perdenin sert
kenarı) yalnızca göze görünüyordu, sayısal testler ikisinde de geçiyordu.

## Sessizce bozan tuzaklar

**`run_worker_first` yalnızca dört yol desenini kapsar** (`/`, `/haberler/*`,
`/hakkimizda*`, `/iletisim*`). Worker kodu diğer adreslerde **hiç çalışmaz**.
Oraya eklediğiniz başlık, yönlendirme ya da mantık sessizce devre dışı kalır.
Yeni bir üst düzey HTML sayfası eklerken listeyi de güncelleyin.

**CSP yola göre kurulur** (`cspKur`, `src/worker.js`). Kamuya açık sayfalarda
`script-src 'self'`: satır içi `<script>` ya da `onclick` eklerseniz sayfa
konsolda hata bile vermeden çalışmaz. Kodu ayrı bir `.js` dosyasına alın.
`/admin/` bunun tek istisnasıdır.

**Migration numaraları sıralıdır.** Yeni dosya eklemeden önce `migrations/`
içine bakın; aynı numara iki kez kullanıldığında `wrangler d1 migrations apply`
tökezler.

## Editoryal kurallar

**Uydurmayın.** Müşteri yorumu, fiyat, teslim süresi, referans, istatistik:
elinizde kaynağı yoksa üretilmez. Eksik bırakıp sahibine sormak, doldurup
yanlış söylemekten iyidir. Bu bir haber markası; uydurulmuş bir yorum gerçek
bir risktir.

**AI etiketlemesi zorunluluk, süs değil.** Sitedeki her kare `AI ÜRETİMİ` ya da
`GERÇEK ÇEKİM` etiketi taşır. **Varsayılan `AI ÜRETİMİ`'dir.** Bir kareyi
gerçek çekim olarak işaretlemek için kaynağının doğrulanmış olması gerekir;
"gerçek gibi duruyor" yeterli değildir. Üçüncü taraf filigranı taşıyan bir
görsel, izni bilinmeden portföye konmaz.

Gerekçe: Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği (RG 1/7/2026,
sayı 33297; yürürlük 1/8/2026) reklamlarda yapay zekâ kullanımının açıkça
belirtilmesini zorunlu kılıyor. Hukuki görüş değildir.
Ayrıntı: [`docs/10K-TASARIM-PAKETI.md`](docs/10K-TASARIM-PAKETI.md) 6.5.

**Metin kapısı.** Yayına giden her metin şunlardan geçer: sıfır uzun tire (—),
sıfır İngilizce stok kelime (leverage, seamless, robust, solutions…), sıfır
Türkçe kurumsal klişe (çözümler, kusursuz, uçtan uca, fark yaratmak, benzersiz,
yenilikçi…), sıfır "sadece X değil, Y" kalıbı, sıfır belirsiz atıf
("uzmanlara göre").

## Tasarım

Anasayfanın kaynağı [`docs/10K-TASARIM-PAKETI.md`](docs/10K-TASARIM-PAKETI.md):
palet token'ları ölçülmüş kontrast oranlarıyla, yazı tipi üçlüsü, bant haritası,
birebir metinler.

Bant metinlerinin en kötü kare kontrastı **3.5:1'in altına düşemez**. Perdeye,
banda ya da hero videosuna dokunan her değişiklikten sonra ölçümü yeniden
çalıştırın.

**İki komşu bölüm aynı iskeleti paylaşmaz.** Dört başlık biçimi sırayla
dağıtılmıştır (`bas-yan`, `bas-satir`, `bas-sag`, `bas-orta`). Yeni bölüm
eklerken komşularına bakın.

Panelden içerik girişi: [`docs/YONETICI-PANELI.md`](docs/YONETICI-PANELI.md).
