# BTMEDYA Anasayfa, Tasarım Paketi

`10k-websites` becerisinin Faz 5 çıktısı. Üretimden önce tamamlandı, Faz 8'in girdisi.
Buradaki her ziyaretçiye görünen satır **birebir** siteye girer. Yapım aşamasında
yeniden yazılmaz.

Tarih: 2026-09-07 · Dal: `claude/new-session-onanb3`

---

## 0. Kararlar ve sapmalar

| Karar | Değer |
|---|---|
| Kapsam | BTMEDYA'nın yeni anasayfası |
| Yayın | Cloudflare Workers, `public/` altında. **Becerinin Hostinger adımı uygulanmıyor.** |
| Katman | Tier 1, tek 6 saniyelik çekim |
| Hedef kitle | Hepsi, ağırlık kurumsal ve AI işlerinde |
| His | Sinematik ve etkileyici |
| Görseller | Karma: gerçek çekim portföyde, AI üretimi hero ve destek görsellerinde, ayrı ayrı etiketli |
| Hero konsepti | A, Sokaktan ekrana |
| Kurucu yüzü | Hero'da yok. Gerçek fotoğraf "Kim yapıyor" bölümünde. |

**Bilinçli sapmalar, açıkça kaydedilmiştir:**

1. **Hostinger yerine Cloudflare.** Beceri Faz 10'da Hostinger şart koşuyor.
   `btmedya.com.tr` zaten Cloudflare Workers üzerinde canlı ve alan adı bağlı.
   İkinci bir hosting katmanı yeni bir kırılma noktası olurdu. Kullanıcı kararı.
2. **Koyu zemin + kehribar.** Beceri bu kombinasyonu yapay zekâ klişesi olarak
   işaretliyor. Buradaki kullanım farklı: kehribar dekoratif bir vurgu değil,
   sahnedeki gerçek ışık kaynağı (dükkân ışığı), palet üretilen görüntünün
   kendisinden örnekleniyor, ve başlık yüzü serif değil. Vurgu rengi camgöbeği.
3. **GSAP kaldırılıyor.** Mevcut anasayfa GSAP ve ScrollTrigger'ı CDN'den çekiyor.
   Yeni sayfa saf HTML, CSS ve sade JavaScript. Kütüphane yok, derleme adımı yok.

---

## 1. Marka önermesi

Tek kelime: **kare.**

Gazeteci gerçeği kadraja alır. Yapımcı hikâyeyi kadraja alır. Yapay zekâ kare üretir.
BTMEDYA'nın üç kolunu birleştiren şey bu: olan biteni izlenen bir şeye çevirmek.
Sayfadaki her bölüm bu fikri öğretir, etkileşimli an bu fikri ziyaretçiye yaptırır,
ve kapanış cümlesi bu fikri satar. Bu fikre hizmet etmeyen bölüm sayfada durmaz.

Farklılaştırıcı, araştırmadan geldi: ajans müşterilerinin en sık şikâyeti, işi yapanla
konuşamamak. BTMEDYA'da haberi kovalayan el kamerayı da tutuyor. Bu bir slogan değil,
yapının kendisi, ve sayfa bunu kanıt olarak kullanır.

---

## 2. Palet, CSS token olarak

Konsept A'nın dünyasından örneklendi: mavi saatte ıslak asfalt, dükkân ışığının
kehribarı, ekran parıltısının camgöbeği. Kesin değerler video onaylandıktan sonra
gerçek karelerden örneklenerek kesinleşir; aşağıdakiler başlangıç değerleri.

```css
:root{
  --canvas:#070C12;         /* ıslak asfaltın mavi çalan koyusu, saf siyah değil */
  --panel:#0E1620;          /* kartlar ve yükseltilmiş yüzeyler */
  --accent:#35D6FF;         /* camgöbeği: CTA, odak halkası, nadir vurgu */
  --accent-hover:#6FE4FF;
  --accent-muted:rgba(53,214,255,.22);   /* kenarlık, parıltı, parçacık */
  --amber:#E0A257;          /* ortam ışığı. VURGU DEĞİL. Sahnedeki dükkân ışığı. */
  --amber-muted:rgba(224,162,87,.16);
  --text-primary:#EDF3F7;
  --text-secondary:#92A3B2;
  --line:rgba(146,163,178,.16);
  --line-strong:rgba(146,163,178,.34);   /* etkileşimli kenarlıklar, 3:1 için */
}
```

**Ölçülen kontrast oranları, `--canvas` üzerinde:**

| Renk | Oran | Gereken |
|---|---|---|
| `--text-primary` #EDF3F7 | ~17.6:1 | 4.5:1 |
| `--text-secondary` #92A3B2 | **7.53:1** | 4.5:1 |
| `--accent` #35D6FF | **11.35:1** | 3:1 |
| `--amber` #E0A257 | **8.81:1** | 3:1 |

Hepsi tahmin değil, hesaplandı. `--line` ince çizgiler için, etkileşimli kenarlıklarda
`--line-strong` kullanılır.

**Vurgu kuralı:** camgöbeği sadece üç yerde görünür. Tek çağrı butonu, odak halkaları
(`:focus-visible`), ve sayfada en fazla iki vurgu anı. Her yerde olan vurgu, vurgu değildir.
Kehribar bir vurgu değil, ortam ışığıdır: arka plan katmanında ve görsellerin içinde yaşar.

---

## 3. Yazı tipi üçlüsü

| Rol | Yüz | Ağırlıklar |
|---|---|---|
| Başlık | **Bricolage Grotesque** | 700, 800 |
| Gövde | **Manrope** | 400, 500, 600 |
| Mono etiket | **JetBrains Mono** | 400, 500 |

Bricolage Grotesque editoryal ve modern, alışkanlıktan seçilmiş bir yüz değil.
Manrope zaten markada var, sessiz ve okunaklı. Mono küçük etiketler ve sayaçlar için.
Inter ve Roboto başlık olarak kullanılmıyor.

**Yapım aşamasında doğrulanacak, atlanmayacak:** Bricolage Grotesque'in Türkçe glif
kapsamı (ğ Ğ ş Ş İ ı ç Ç ö Ö ü Ü) sitede kullanılan ağırlıklarda test edilecek.
Eksik varsa yedek **Archivo** (700, 800). Türkçe karakterlerin doğru dizilmesi pazarlık
konusu değil.

Fontlar sadece kullanılan ağırlıklarla, `preconnect` ile yüklenir.

---

## 4. Bant haritası

Hero yüksekliği **600vh**. Kaydırma aralığı 500vh (hero eksi 100vh görüntü alanı).
Aralıklar başlangıç değeridir, `scrub-pipeline.md` içindeki flick testiyle doğrulanır.

| Bant | Aralık | Plato | Görüntüdeki an | Metin (birebir) | Giriş |
|---|---|---|---|---|---|
| 1 | 0.00 – 0.22 | ~90vh | Islak kaldırım, dükkân ışıkları asfaltta, iniş başlıyor | "Her şey bir kareyle başlar." | Drift-down (f) + tek seferlik yükleme rampası |
| 2 | 0.26 – 0.50 | ~100vh | Kamera dengeli iniyor, yansıma yaklaşıyor | "Haberi kovalayan el, kamerayı da tutuyor." | Grid snap-align (b) |
| 3 | 0.54 – 0.76 | ~90vh | Su yüzeyinden geçiş: sıçrama, mercekte damlalar, bulanıklık | "Arada tampon yok." | Word-punch with overshoot (d) |
| 4 | 0.80 – 1.00 | ~90vh | Işık hacminde dinlenme, parçacıklar süzülüyor | Aşağıdaki oturma bloğu | Word-by-word rise into staged settle (e) |

**Bant 4, oturma bloğu (birebir):**

- Başlık: **"Fikir sizden. Kadraj bizden."**
- Alt satır: "Haber, prodüksiyon ve yapay zekâ. Tek ekip, tek akış."
- Buton: "WhatsApp'tan konuşalım"

> **Onayınıza bırakılan tek metin kararı.** "Fikir sizden. Kadraj bizden." mevcut
> "Dijitalde Fikir Sizden, Gerisi Bizden." satırının keskinleştirilmiş hali ve
> paketin marka önermesine oturuyor. Marka satırını değiştirmek sizin kararınız.
> Değiştirmek istemezseniz alternatif, mevcut satırın aynen kullanılmasıdır.

**Yankı ilkesi, bant 3'te bilerek kuruldu:** kamera yüzeyi kırıp geçerken metin de
"Arada tampon yok." diyor. Fiziksel eylem ile cümle aynı şeyi yapıyor. Sayfanın
dekore edilmiş değil yönetilmiş hissettiren şey budur.

**Bant yerleşimi:** aksiyon şeridi kadrajın sağ ve orta bölümünde. Metinler sol
üçtebirde yaşar, o alan görüntüde bilerek sakin tutulur. Bant 4 ortaya toplanır,
çünkü son kare tam sayfa ışık dokusudur ve her yeri metne uygundur.

---

## 5. Sabit hero metni

Telefonlar ve azaltılmış hareket tercihi olan ziyaretçiler videoyu değil, kompoze
edilmiş sabit görseli görür. Bu bir eksik değil, tasarlanmış bir yerleşimdir.

- Başlık: **"Fikir sizden. Kadraj bizden."**
- Alt satır: "Haber, prodüksiyon ve yapay zekâ. Balıkesir'den, tek ekiple."
- Buton: "WhatsApp'tan konuşalım"

Arka plan: onaylanmış videonun son karesi (`hero-ending.jpg`), telefon için dikey
kırpımı kontrol edilerek.

---

## 6. Kıvrım altı bölümler

Sırayla. Her bölüm tek çağrıya doğru bir sonraki kaydırmayı hak eder.
**Tek çağrı: WhatsApp teklif hattı.**

### 6.1 Kim yapıyor

Araştırmanın en keskin acısına doğrudan cevap: müşteri işi yapanla konuşamıyor.

- Üst etiket: `KİM YAPIYOR`
- Başlık: "İşi yapan kişiyle konuşuyorsunuz."
- Metin: "BTMEDYA'yı Buse Tuncay kurdu. Gazeteci. Sahada mikrofonu tutan da,
  kurguyu teslim eden de aynı kişi. Arada müşteri temsilcisi yok, brief kaybolmuyor,
  işin nerede olduğunu her zaman söyleyebilecek biri var."
- Görsel: **gerçek fotoğraf.** AI üretimi değil. Etiketi: `GERÇEK ÇEKİM`.
- Bağlantı: "BTMEDYA'yı daha yakından tanıyın" → `/hakkimizda/`

Bu bölüm `/hakkimizda/` sayfasının kopyası değil, kancasıdır. Anasayfa tek acıyı
çözer (işi yapanla konuşmak), detay sayfada durur.

### 6.2 Nasıl çalışıyoruz

Üç adım. Beceri kuralı: paralel öğelerin hepsi eşit muamele görür, üçünün de görseli olur.

| Adım | Başlık | Metin (birebir) |
|---|---|---|
| 01 | "Konuşuyoruz" | "Ne istediğinizi anlatıyorsunuz. Bütçeyi ve tarihi ilk konuşmada söylüyoruz. Sonradan çıkan kalem yok." |
| 02 | "Çekiyoruz" | "Saha, stüdyo ya da yapay zekâ. Hangisinin işinizi göreceğini biz söylüyoruz, hepsini birden satmıyoruz." |
| 03 | "Teslim ediyoruz" | "Söylediğimiz tarihte. Ham kayıtlar da sizin, master da." |

### 6.3 Ne üretiyoruz

Sekiz hizmet üç üretim hattında toplanır. Sekiz kart ziyaretçiyi yorar, üç hat anlaşılır.

- **Haber.** Saha haberi, röportaj, arşiv. 27 haberlik yayın arşivi buna kanıt.
- **Prodüksiyon.** Tanıtım filmi, klip, özel gün, kurumsal kimlik.
- **Yapay zekâ.** AI video, AI görsel, reklam kreatifi, web deneyimi.

Üst etiket: `ÜÇ ÜRETİM HATTI`
Başlık: "Üç hat, tek ekip."

### 6.4 Gerçek işler

Portföy. **Her karenin etiketi var:** `GERÇEK ÇEKİM` ya da `AI ÜRETİMİ`.
Bu etiketleme hem markanın gazetecilik tarafını korur hem 6.5'teki iddiayı kanıtlar.

Üst etiket: `PORTFÖY`
Başlık: "Ne gerçek, ne üretilmiş. Hepsi yazıyor."

### 6.5 Yapay zekâ ve dürüstlük (imza bölümü)

Sayfanın en ayırt edici bölümü ve etkileşimli anın evi.

- Üst etiket: `AI VE DÜRÜSTLÜK`
- Başlık: "Yapay zekâ kullanıyoruz. Nerede kullandığımızı yazıyoruz."
- Metin: "1 Ağustos 2026'da yürürlüğe giren Ticari Reklam ve Haksız Ticari Uygulamalar
  Yönetmeliği, reklamlarda yapay zekâ kullanımının açıkça belirtilmesini zorunlu kıldı.
  Biz bunu zorunluluk olduğu için değil, haber üreten bir ekip olduğumuz için zaten
  yapıyorduk. Sizin için ürettiğimiz her işte de aynısını yapıyoruz."
- İkinci paragraf: "Yapay zekâ hızı veriyor. Neyin gerçek olduğunu söylemek bize kalıyor."

**Etkileşimli an: Kadraj.** Geniş bir görselin üzerinde dört köşeli bir kadraj çerçevesi
durur. Ziyaretçi çerçeveyi basılı tutup sürükler. Çerçeve nereye gelirse, altındaki
etiket `GERÇEK ÇEKİM` ya da `AI ÜRETİMİ` olarak değişir. Ziyaretçi markanın tek fikrini
okumakla kalmaz, kendi eliyle yapar: kadrajı kurar ve neyin ne olduğunu doğrular.

Mekanikler: basılı tutarken ilerleme birikir, erken bırakınca yumuşayarak geri döner,
asla sıfıra çarpmaz. Tamamlandığında bölümün içeriği sırayla aydınlanır. Azaltılmış
hareket tercihinde son durum doğrudan gösterilir, tutma gerekmez. Dokunmatikte
`(pointer: coarse)` altında hedef en az 44px.

### 6.6 Sık sorulanlar

Araştırmada çıkan gerçek itirazlar, alıcının kendi diliyle.

| Soru | Cevap (birebir) |
|---|---|
| "Fiyat sonradan değişir mi?" | "Hayır. İlk konuşmada verdiğimiz rakam teslimde de aynı. Kapsam siz değiştirirseniz değişir, biz değiştirmeyiz." |
| "İşi kim yapacak?" | "Buse Tuncay ve BTMEDYA ekibi. Konuştuğunuz kişi işi yapan kişi." |
| "Ne zaman teslim edersiniz?" | "Tarihi ilk gün veriyoruz. Gecikme olacaksa siz sormadan haber veriyoruz." |
| "Yapay zekâ ile yapılan iş yapay durmuyor mu?" | "Kötü kullanıldığında duruyor. Biz yapay zekâyı prodüksiyon disipliniyle kullanıyoruz: kadraj, ışık, süreklilik ve kurgu insan işi. Nerede AI kullandığımızı da yazıyoruz." |
| "Sadece Balıkesir'de mi çalışıyorsunuz?" | "Saha işleri Balıkesir ve çevresinde. Yapay zekâ, kurgu ve web işleri her yerden." |

### 6.7 Tek çağrı

- Üst etiket: `TEK ADIM`
- Başlık: "Projeyi anlatın, kadrajı kuralım."
- Metin: "Ne yapmak istediğinizi yazın, aynı gün dönüş yapalım."

**Form kararı, doğrulanmış gerçek duruma göre.** Depoda çalışan bir form altyapısı
zaten var ve canlıda doğrulandı: `POST /api/contact` ucu ad, e-posta ve mesaj alanlarını
doğruluyor, honeypot ile spam eliyor, mesajı D1 üzerindeki `contact_messages` tablosuna
yazıyor, ve `/admin/` panelinden okunuyor. Tablo üretim veritabanında mevcut.

Bu yüzden anasayfa gerçek bir form taşır. Ziyaretçinin mesajı gerçekten bir yere gider,
ve başarı durumu bu gerçeği söyler.

Tek dönüşüm anı korunur, iki tamamlama yolu olur:

- **Birincil:** sayfa içi form, `POST /api/contact` ucuna gider.
  - Alanlar: Ad Soyad, E-posta, Telefon (opsiyonel), Konu (opsiyonel), Mesaj
  - Gizli honeypot alanı: `_honey`
  - Buton: "Mesajı gönder"
  - Başarı durumu: "Mesajınız bize ulaştı. Aynı gün dönüş yapacağız."
  - Hata durumu: ucun döndürdüğü Türkçe hata metni aynen gösterilir, uydurulmaz.
- **İkincil, aynı blok içinde:** "WhatsApp'tan yaz" → `https://wa.me/905416401029`
  ve "+90 541 640 10 29".

İki ayrı çağrı değil bu. Tek dönüşüm bloğu, içinde bir hızlı geçiş şeridi.
WhatsApp hemen konuşmak isteyen için, form yazıp bırakmak isteyen için.

Ayrıntılı iletişim sayfası `/iletisim/` adresinde zaten var; anasayfadaki blok
onun kısa hali olur, kopyası değil.

### 6.8 Alt bilgi

Marka, iletişim, sosyal bağlantılar, telif satırı.
Ek olarak **AI beyanı**: "Bu sitedeki bazı görseller yapay zekâ ile üretilmiştir ve
`AI ÜRETİMİ` etiketiyle işaretlenmiştir."

Marka gerçek olduğu için kurgusal marka beyanı yok.

---

## 7. Vektör katmanı planı

Kendi elimle çizilen SVG'ler. Kütüphane yok.

**İmza öğesi: kadraj köşeleri.** Dört köşe işareti, bir çerçevenin köşelerini işaret eder.
Sayfada üç yerde yaşar: bölüm başlıklarının yanında küçük ve sessiz, portföy görsellerinin
üzerinde, ve etkileşimli anın çerçevesi olarak tam boyda. Kaydırmada kendini çizer
(`stroke-dasharray` ve `stroke-dashoffset`).

Yüksek sesli mi testi: bu öğe kaldırılsa sayfa anlamlı biçimde değişir mi? Evet.
Kadraj köşeleri sayfanın kimliği; kalan her şey sessiz kalır ki bu okunsun.

**Diğer katmanlar:**

- **Tarama çizgisi bölücü.** Bölümler arasında soldan sağa kendini çizen ince yatay çizgi.
  Kamera taraması hissi. `--accent-muted` renginde.
- **Sabit ortam katmanı.** Her şeyin arkasında tek bir katman: çok yavaş sürüklenen
  kehribar ve camgöbeği yumuşak parıltı, üzerinde ince grain. 90 saniyelik döngü,
  negatif gecikme ile ilk boyamada döngünün ortasında. Sayfa böylece üst üste
  yığılmış bölümler değil, tek bir mekan gibi gezilir.
- **Fısıltı seviyesinde parçacıklar.** Sadece 6.5 imza bölümünde, ışık tozu hissi.
  Bölüm ekran dışındayken IntersectionObserver ile durur.

Hepsi azaltılmış hareket tercihini eksiksiz onurlandırır: çizgiler çizilmiş görünür,
sayaçlar hedefte durur, sürücüler durur, ve tercih oturum ortasında açılıp kapanırsa
her iki yönde de doğru davranır.

---

## 8. Mühendislik listesi

Yapım bu standardı yarım hatırlayamaz. Tamamı `scrub-pipeline.md` içinde.

- Videoyu Blob olarak indir. 8 MB üzerindeyse akış halinde, dürüst bir yükleme
  halkasıyla, 20 saniyelik ilerleme gözcüsüyle.
- Poster JavaScript'ten atanır, videoyu yükleyen aynı kapılı kod yolunun içinde.
  Telefonlar hiçbirini indirmez.
- Gösterilen zamanı lerp et, `dt` ile 60fps'e normalize edilmiş, yakınsayınca dinlenen
  rAF döngüsü.
- Seek'leri kapıla. Çakışan seek yok, en yeniye daralt, `error` olayında kilidi aç.
- DOM'a sadece değişimde yaz. Sınıflar, opaklık, sayaçlar, hepsi delta kapılı.
- Bantları vh cinsinden pace et, flick testiyle doğrula (120px, 240px, 360px).
- Dört katmanlı okunabilirlik sistemi: global taban perde, bant perdesi, üç katmanlı
  metin gölgesi, küçük metinler için chip. En kötü kare denetimi, her bantta en az 3.5:1.
- Beş sabit hero kapısı, CSS ve JS'te **birebir aynı** dizelerle, ve `change`
  dinleyicileriyle canlı tutulur.
- Video hiç yüklenmese bile sayfa eksiksiz ve güzel.
- Kalite tabanı: semantik yer imleri, `#main`'e atlama bağlantısı, gerçek başlık
  hiyerarşisi, `:focus-visible`, 44px dokunma hedefleri, `overflow-x: clip` hem
  `html` hem `body` üzerinde, gerçek `<title>` ve meta açıklama, satır içi SVG favicon.
- Video dekoratif: `aria-hidden="true"`, `tabindex="-1"`, `controls` yok.
- `og:image` ve `og:url` mutlak URL ister. `<!-- DEPLOY STEP -->` yorumu bırakılır ve
  yayın öncesi `https://btmedya.com.tr/` ile yamalanır. Yama editör aracıyla yapılır,
  kabuk tek satırıyla değil; UTF-8 Türkçe karakterler bozulmasın.
- Tüm site canlı: her bölümde fısıltı seviyesinde tek bir yaşayan öğe, her ana özgü
  bir giriş, her şeyde easing. Hiçbir şey ani değil.

---

## 9. Üretim istemleri

Faz 6'da kullanılacak. Her ikisi de üretimden önce `get_cost: true` ile fiyatlanır.
Ücretsizdir.

### Başlangıç karesi (görsel, 16:9, 2k)

```
Wet asphalt street at blue hour, seen from a low camera position looking down at the
road surface, composed as the first moment of a descent that will travel down into the
reflection and pass through the water surface. Warm amber shop light and a cold cyan
screen glow reflect on the wet ground in long soft streaks. The scene fills the frame
edge to edge as one continuous street: the left third is a calm expanse of smooth wet
asphalt in soft shadow receding into depth, and the reflections and detail gather
toward the right. Fine rain haze hangs in the air. Deep blue-black tones with amber
and cyan light. Cinematic, photorealistic, shallow depth of field, 16:9.
No text, no logos, no lettering anywhere.
```

Sol üçtebir bilerek "sakin ıslak asfalt" olarak tarif edildi, "boşluk" ya da "karanlık"
olarak değil. Beceri bu tuzağı açıkça uyarıyor: boşluk isteyince model gerçek siyah
panel çiziyor ve bir tekrar yakıyor.

### Video (image-to-video, 1080p, 6 saniye, standard, sessiz)

```
One continuous shot, no cuts. The camera descends steadily straight down toward the
wet asphalt and the reflections on it, moving at an even speed along a single vertical
trajectory. The scene stays alive: fine rain drifts through the air, the amber and cyan
reflections ripple and shift on the water, distant light flickers. The camera passes
through the water surface: a splash breaks across the lens, droplets cling to the glass,
and a short beat of blur follows. Below the surface the camera continues down into a
calm volume of soft cyan and amber light with slow drifting particles. The shot ends at
rest: the camera settles facing a wide calm field of layered light, the amber warmth low
and the cyan glow above it, particles drifting slowly, nothing moving in the center of
frame, generous calm space across the whole image.
No text or lettering anywhere.
```

Son kare bilerek tam sayfa ışık dokusu. Kanun 4'ün kırpma sorununu tamamen dolaşır:
kırpılacak bir ürün kenarı yok, her ekran oranında metne uygun.

### Destek görselleri

Video kapıyı geçtikten sonra, hepsi aynı dünyada, aynı palet ve aynı ışıkla:

1. "Nasıl çalışıyoruz" 01, konuşma anı
2. "Nasıl çalışıyoruz" 02, çekim anı
3. "Nasıl çalışıyoruz" 03, teslim anı
4. İmza bölümü için geniş kadraj görseli (etkileşimli anın üzerinde durduğu görsel)

Üçü de eşit muamele görür. Bir adımın görseli eksik kalırsa ziyaretçi bunu delik
olarak okur.

**Marka tutarlılığı denetimi.** Her üretilen görsel şunlara karşı denetlenir:
gerçek marka işaretleri sızmış mı, anatomi bozuk mu, palet BTMEDYA'nın kendi
renklerinde mi, ve kompozisyon metin alanını koruyor mu.

---

## 9b. Depoda hazır bulunan ve kullanılacak altyapı

Bu paket yazıldıktan sonra `main` dalı birleştirildi ve aşağıdakiler doğrulandı.
Yeniden yazılmayacak, mevcut olan kullanılacak.

| Uç / sayfa | Durum | Anasayfada kullanımı |
|---|---|---|
| `POST /api/contact` | Canlı, doğrulandı | 6.7'deki formun gittiği yer |
| `contact_messages` D1 tablosu | Üretimde mevcut, doğrulandı | Formun deposu |
| `GET /api/news` | Canlı | Haber bölümü canlı veriyle beslenir |
| `/hakkimizda/` | Yayında | 6.1'den bağlantı verilir |
| `/iletisim/` | Yayında | 6.7'nin uzun hali |

**Ayrıca not, kapatıldı:** `migrations/` altında iki dosya da `0003` numarasını
taşıyordu. `0003_social_posts.sql` dosyası `0006_social_posts.sql` olarak
yeniden numaralandırıldı. (Önce `0004` seçilmişti; `main` bu arada
`0004_vault_routing.sql` ve `0005_video_library.sql` eklediği için birleştirme
sırasında `0006`ya çekildi.)

Üretim veritabanındaki `d1_migrations` kaydı yalnızca `0001` ve `0002`'yi
uygulanmış gösteriyor, yani `social_posts` ve `contact_messages` tabloları
migration sisteminin dışında oluşturulmuş. İkisi de `CREATE TABLE IF NOT EXISTS`
kullandığı için yeniden numaralama üretimi etkilemiyor; dosyalar bir gün
uygulanırsa mevcut tabloların üstüne zararsız çalışır. Doğrulandı: üretimde
`news`, `media`, `contact_messages` ve `social_posts` tabloları mevcut.

---

## 10. Metin kapısı

Yukarıdaki her ziyaretçiye görünen satır **birebir** siteye girer.

Yayın öncesi `index.html` üzerinde zorunlu tarama:

- Uzun tire (—) sayısı sıfır olmalı.
- Şu kelimeler sıfır olmalı: leverage, seamless, empower, unlock, robust,
  actionable, data-driven, solutions.
- Türkçe klişe taraması: "sadece X değil, aynı zamanda Y", "uzmanlara göre",
  "geleceğe yön veren", "çözüm ortağınız", "360 derece", "anahtar teslim",
  "fark yaratan", "dijital dönüşüm yolculuğu".
- Tarama tüm dosyada çalışır, sadece hero'da değil. Kayma alt bölümlerde olur.

Bu pakette bilerek kurulmuş marka aygıtları kalır, çünkü onlar zanaat:
"Fikir sizden. Kadraj bizden." ve "Arada tampon yok." uydurma değil, tasarlanmış.
