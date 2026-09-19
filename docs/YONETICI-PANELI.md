# Yönetici Paneli Kullanım Kılavuzu

Video, fotoğraf ve haber girişlerini buradan yaparsınız. Kod bilmenize gerek yok.

**Adres:** https://btmedya.com.tr/admin/

Panel siteye bağlantı verilmez, adresi bilen girer. Şifre Cloudflare tarafında
`ADMIN_PASSWORD` olarak tanımlıdır.

---

## Giriş

1. Adresi açın.
2. Yönetici şifrenizi girin, **Giriş yap** deyin.
3. Oturum çerezi 7 gün geçerlidir, her seferinde şifre girmeniz gerekmez.

Şifreyi unutursanız Cloudflare panelinden değiştirilir:
Workers & Pages > btmedya-db > Settings > Variables and Secrets > `ADMIN_PASSWORD`.

---

## Haber girişi

Panelde **Haber yayınla** bölümü.

| Alan | Ne yazılır |
|---|---|
| Başlık | Haberin başlığı |
| Slug | Adres eki, `orn-haber-basligi` biçiminde, Türkçe karakter ve boşluk olmadan |
| Kategori | Yerel, Ekonomi, Spor gibi |
| Gövde | Haber metni |

İki buton var: **Taslak kaydet** ve **Yayınla**. Yalnızca yayınlananlar siteye çıkar.

**Yayınlanan haber nereye düşer:**

- Anasayfadaki **Sahadan** bölümü, en yeni 6 haber
- `/haberler/` arşiv sayfası

Anasayfa haberleri canlı olarak `/api/news` üzerinden çeker. Yayınladığınız
haber sayfayı yenilediğinizde görünür, ayrıca bir işlem gerekmez.

---

## Video ve fotoğraf yükleme

Panelde **Toplu medya yükle** bölümü.

1. Dosyaları kutuya sürükleyin ya da tıklayıp seçin.
   Kabul edilenler: görsel, video, ses ve PDF.
2. Kategori seçin (Arşiv, Haber, Portre).
3. **Yüklemeyi başlat** deyin. Büyük dosyalar parça parça yüklenir, beklemeniz normaldir.

Yüklenen dosya Cloudflare R2 depolamasına gider ve kayıt veritabanında oluşur.

### Yüklediğiniz medyanın siteye çıkması için iki adım

Yükleme tek başına yeterli değil, çünkü her yüklenen dosyanın sitede
görünmesi istenmez. İki şey gerekir:

1. **Yayınla.** Arşiv listesinde ilgili kaydın yanındaki **Düzenle** ile
   yayın durumunu açın.
2. **Yuva ata.** Aynı düzenleme sırasında sorulan "Site alanı" kutusuna
   `portfoy` yazın.

Bu ikisi yapıldığında dosya anasayfadaki **Gerçek işler** bölümünde,
en fazla 6 kare olarak görünür. Sıralamayı `sort_order` belirler, küçük
olan önce gelir.

Yuvada hiç kayıt yoksa bölüm şu an sayfada duran karelerle kalır, yani
bölüm hiçbir koşulda boşalmaz.

### Etiketleme, önemli

Site her kareyi **AI ÜRETİMİ** ya da **GERÇEK ÇEKİM** olarak etiketler.
Varsayılan AI ÜRETİMİ'dir; bu bilerek böyle, çünkü yanlışlıkla üretilmiş
bir kareyi gerçek göstermek haber markası için gerçek bir risk.

Bir kareyi gerçek çekim olarak işaretlemek için etiketlerine `gercek`
yazın. O zaman site GERÇEK ÇEKİM etiketiyle gösterir.

Bu ayrım mevzuat açısından da önemli. Ayrıntı: `docs/10K-TASARIM-PAKETI.md`,
6.5 bölümü.

---

## İletişim mesajları

Sitedeki formdan gelen mesajlar `contact_messages` tablosuna düşer ve
`/api/admin/contact` ucundan okunur. Panelde ayrı bir ekranı yok; ihtiyaç
duyarsanız eklenebilir.

---

## Neyin canlı, neyin sabit olduğu

| Bölüm | Kaynak | Panelden değişir mi |
|---|---|---|
| Hero videosu | `assets/hero-scrub.webm` ve `.mp4` | Hayır, dosya değişimi gerekir |
| Sahadan (haberler) | `/api/news` canlı | **Evet** |
| Gerçek işler (portföy) | `/api/public/media`, `portfoy` yuvası | **Evet** |
| Showreel | Sayfada sabit dört video | Hayır |
| Kim yapıyor, SSS, metinler | Sayfada sabit | Hayır |

Sabit olanları değiştirmek istediğinizde söylemeniz yeterli, tek cümleyle
anlatın, ben değiştirip yayına alırım.

---

## Bilinen eksik

Panelin haber formunda kapak görseli alanı sınırlı. Anasayfa haber kartları
`cover_url` alanını destekliyor ve dolu olduğunda kapak görselini gösteriyor,
ancak bu alanı panelden rahat doldurmak için küçük bir ekleme gerekir.
İstenirse yapılır.
