# BTMEDYA Kaydırmalı Hero: Tasarım Paketi

Bu belge, kaydırmayla oynayan sinematik hero için **üretimden önce** alınmış
bütün kararları taşır. Higgsfield bağlandığı an buradaki promptlar doğrudan
çalıştırılır, sonra Faz 8 bu belgeyi girdi olarak alıp sayfayı kurar.

**Durum:** üretim bekliyor. Higgsfield bu oturumda bağlı değil, hiçbir kredi
harcanmadı. Buradaki her fiyat, üretimden önce `get_cost` ile doğrulanacak
(o çağrı ücretsizdir); aşağıdaki rakamlar referans, taahhüt değil.

---

## 1. Marka önermesi

**Yayınlanmış iş.**

BTMEDYA sunum yapan bir ajans değil, çalışan bir yayın odası. Her hafta gerçek
haber çıkıyor, gerçek çekim yapılıyor, gerçek kurgu masasından geçiyor. Sitedeki
her iddianın arkasında tıklanabilir bir kanıt var: 27 yayınlanmış haber, portföy,
showreel.

Bu önerme, araştırmada çıkan üç itirazın üçünü birden karşılıyor:

| Alıcının söylediği | Önermenin cevabı |
|---|---|
| "Başta konuşulan tutar sonra değişti." | Paket seçici ve açık fiyat, teklif WhatsApp'ta yazılı gidiyor. |
| "Kısa sürede viral olursunuz dediler, olmadı." | Vaat yok, yayınlanmış iş var. Arşiv ortada. |
| "Her markaya aynı içeriği basıyorlar." | Haber odası olmak şablonla çalışmayı imkânsız kılar. |

Kaynaklar: [Şikayetvar ajans ve medya şikayetleri](https://www.sikayetvar.com/ajans/medya),
[MediaCat: etkili bir sosyal medya ajansı seçerken](https://mediacat.com/etkili-bir-sosyal-medya-ajansi-secerken-nelere-dikkat-edilmeli/),
[Setup34: ajans seçerken 10 madde](https://setup34.com.tr/sosyal-medya-ajansi-secerken-dikkat-etmeniz-gereken-10-madde/)

---

## 2. Konsept

Üç konsept değerlendirildi, biri öneriliyor.

### A. Stüdyoya iniş (ÖNERİLEN, kullanıcının set fotoğrafına göre güncellendi)

Kamera karanlık bir prodüksiyon platosunda yavaşça ve düz aşağı iner. Solda
camgöbeği bir ışık duvarı, ıslak zeminde uzun bir yansıma, arkada tek bir sıcak
tungsten lamba, havada pus. Kamera indikçe yansıma uzar ve keskinleşir, yolun
ortasında yoğun bir pus bandından geçerken lens bir an parlar. Son karede kamera
zeminin hemen üstünde dinlenir: camgöbeği yansıma alt üçte birde dümdüz uzanır,
sıcak lamba onun merkezinde küçük bir altın nokta olarak durur.

**Neden bu:** soyut dünya AI'ın en güvenli bölgesi. Kırılacak anatomi yok, tanıdık
nesne yok, dolayısıyla ilk denemede tutma olasılığı en yüksek konsept bu. Dikey
eksen kaydırma eksenine birebir oturuyor, aşağı kaydırmak aşağı inmek gibi
hissettiriyor. Metin için ayrılacak sakin bölge kompozisyonun kendi parçası
olarak yazılabiliyor. İleride Tier 2'ye (zincirli yolculuk) büyütmek de en kolay
bu konseptte.

### B. Sokaktan stüdyoya iniş

Kamera Balıkesir'in üstünden süzülür, bir cam yüzeyden geçer (yansıma kayar, bir
an bulanıklık), içeride kurgu odasına iner. Yerellik ve prodüksiyon hikayesi çok
güçlü. Riski yüksek: şehir dokusu ve iç mekân detayı AI'ın hata verdiği yer, sınır
geçişi çok iyi yazılmazsa sahte duruyor. Bütçe rahatsa ikinci tur için iyi aday.

### C. Kadrajdan kadraja tünel

Işıklı bir kadraj kameraya yaklaşır, içinden geçilir, arkasında yenisi belirir.
Güvenli ama jenerik. İmza değeri düşük olduğu için önerilmiyor.

### Kanun kontrolü (A konsepti)

| Kanun | Durum |
|---|---|
| Hareket kaydırmayla aynı yöne gider | Düz aşağı iniş |
| Tek özne, tek kesintisiz hareket, kesme yok | Tek iniş, tek dünya |
| Yolu kilitle, gövdeyi serbest bırak | Yörünge sabit, parçacıklar ve pus canlı |
| Sonu önce planla | Alt üçte bir'de dinlenen yatay ışık düzlemi |
| Bağışlayıcı özne seç | Işık, parçacık, pus: en bağışlayıcı üçlü |
| Dikey eksen | Evet |
| Düzen için kompozisyon | Sol üçte bir sakin, metin orada yaşar |
| Sınır geçişini sat | Pus katmanından geçişte lens parlaması ve bir an odak kaybı |
| Metin okunurluğunu hak eder | Dört katmanlı perde sistemi, en kötü kare denetimi |
| Metni kaydırma mesafesiyle tempola | Bant haritası vh cinsinden, flick testiyle doğrulanacak |
| Duran nöbetçiler | Her iki promptta "no text, no logos, no lettering" |

---

## 3. Derinlik kademesi

**Tier 1: tek 6 saniyelik çekim.** Başlangıç için önerilen. Tek üretim, tek kapı,
ucuz yeniden deneme.

**Tier 2 (sonraki tur):** üç segmentlik zincir, yaklaşık 18 saniye. BTMEDYA'nın üç
sütunu segmentlere birebir oturuyor: iniş (haber alanı), orta kat (prodüksiyon
ışıkları), dip (yapay zekâ hattı ve dinlenme). Soyut dünyalar zincirlemede en
güvenilir olanlar, o yüzden bu büyütme risksiz. Maliyet segment sayısıyla çarpılır.

---

## 4. Higgsfield promptları

Doğrudan kopyalanıp çalıştırılacak hâlleriyle.

### 4.1 Başlangıç karesi (image, 16:9, 2k)

Kullanıcının gönderdiği set fotoğrafı bu kareyi yeniden yazdırdı. O fotoğrafta
konseptin tam dili var: soğuk camgöbeği ışık duvarı, tek sıcak tungsten lamba,
ıslak zemindeki yansıma, havada pus, kenarda dolly rayı. Soyut ışık inişi yerine
artık BTMEDYA'nın kendi dünyası: bir prodüksiyon platosu. Hem daha özgün, hem de
ajansın ne yaptığını ilk karede söylüyor.

```
A dark film studio stage seen from slightly above, composed as the first moment
of a slow downward camera move. A tall wall of cool cyan light stands left of
centre, its glow curving down onto a polished wet floor that reflects it as a
long vertical streak. A single warm tungsten lamp on a stand burns further back
on the right, small and golden against the dark. Fine atmospheric haze hangs in
the air and catches both lights. The right half of the frame recedes into soft
studio darkness where the walls fall away, one continuous space filling the
frame edge to edge. Cold cyan key light, one warm gold accent, deep navy black
shadows, polished floor, brushed metal. Cinematic, photorealistic, 16:9.
No text, no logos, no lettering anywhere.
```

Negatif alan yine sahnenin parçası olarak yazıldı: sağ yarı "boşluk" değil,
duvarların çekildiği yumuşak stüdyo karanlığı. Metin orada yaşayacak.
Kamera ve dolly rayı bilerek çıkarıldı: yakın plan ekipman anatomisi AI'ın
hata verdiği yer ve kadrajda gereksiz kalabalık yapıyor.

### 4.2 Video (image-to-video, 1080p, 6 sn, standart mod, sessiz)

```
One continuous shot, no cuts. The camera descends slowly and steadily straight
down through the dark studio air, from high above the stage to floor level,
travelling past the tall wall of cyan light as it falls. The haze stays alive
throughout: it drifts and curls, and the light shifts across it. The reflection
on the wet floor stretches and sharpens as the camera comes down. Halfway down
the camera passes through a denser band of haze and there is a physical lens
moment: a brief bloom of the cyan light across the lens and a beat of soft
focus. The shot ends at rest: the camera settled just above the polished floor,
the cyan light laid out as one long still reflection across the lower third of
the frame, the single warm tungsten lamp resting as a small golden point near
its centre, the air above open and calm, nothing moving. No text or lettering
anywhere.
```

Yolculuk tek eksende ve aşağı doğru, yani kaydırma yönüyle birebir. Son kare
dinleniyor ve üstte geniş bir açıklık bırakıyor: sitenin sabit başlığı oraya
oturuyor, "Hikâyeleri yaşatıyoruz." satırı da o açıklıkta kuruluyor. Kırpılacak
ürün yok, yani her ekran oranında güvenli.

### 4.3 Denetim listesi (üretimden sonra, kullanıcıya göstermeden önce)

- Kareyi ffmpeg ile baştan, ortadan ve sondan çıkar, tek tek bak.
- Sızmış marka işareti, logo veya yazı var mı.
- Son kare gerçekten dinleniyor mu, yoksa hareket devam mı ediyor.
- Palet BTMEDYA'nın dünyasıyla aynı mı: lacivert siyah zemin, camgöbeği ışık,
  tek sıcak altın vurgu.
- Sol üçte bir metin için gerçekten sakin mi.

---

## 5. Palet

Sitede zaten yürürlükte olan tokenlar. Konsept bu paletten türetildi, yani
görüntü ve sayfa aynı dünyada olacak. Onaylanan görüntüden sonra son ayar yapılır.

Renk yönü kararı: **altın ajansın, camgöbeği makinenin.** Basılı katalog,
wordmark, amblem ve uygulama simgesi altın olduğu için marka mobilyası
(etiket, bağ, CTA, odak, kenarlık, başlık vurgusu) altına taşındı.
Camgöbeği yalnızca yapay zekâ vurgusunda ve hero'nun atmosfer katmanlarında
kaldı. Böylece iki renk de bir işe yarıyor.

```css
:root{
  --bg:#02070d;          /* zemin, saf siyah değil, görüntünün grade'ine çalıyor */
  --bg2:#07111c;         /* kartlar ve yükseltilmiş yüzeyler */
  --accent:#d6a84a;      /* marka aksanı: CTA dolgusu, odak, kenarlık */
  --accent-text:#e8c06a;  /* küçük etiket ve başlık vurgusu, zeminde 11.72:1 */
  --accent-ink:#120b00;  /* altın dolgu üstündeki koyu metin */
  --cyan:#35d6ff;        /* YALNIZCA yapay zekâ vurgusu ve hero atmosferi */
  --blue:#2a7fff;        /* derinlik ve ışık düzlemi */
  --ink:#eaf2f8;         /* birincil metin */
  --muted:#8da0b2;       /* ikincil metin */
}
```

Videonun paleti de bu karara uyar: hero'nun soğuk camgöbeği dünyası korunur,
son karedeki tek sıcak nokta altındır. Makine soğuk, marka sıcak.

## 6. Tipografi

Sitede yürürlükte, yerel olarak servis ediliyor, ek yükleme gerekmiyor.

| Rol | Yüz | Ağırlık |
|---|---|---|
| Başlık | Space Grotesk | 500, 700 |
| Gövde | Manrope | 400, 700, 800 |

---

## 7. Bant haritası

Hero yüksekliği **700vh** (kaydırma menzili 600vh). Aralıklar başlangıç değeridir,
flick testiyle doğrulanacak. Her bant yaklaşık 108vh, kenarlarda 12vh yumuşak
giriş ve çıkış.

| Bant | Aralık | Görüntüde ne oluyor | Metin (aynen yayınlanır) | Giriş |
|---|---|---|---|---|
| 1 | 0.00 - 0.18 | Yüksekte dağınık parçacık alanı, iniş yeni başlıyor | "Balıkesir'den yayında." | Scatter: karakterler dağınıktan toplanır, parçacıklarla aynı hareket |
| 2 | 0.20 - 0.38 | Kamera iniyor, çizgiler yukarı doğru akıyor | "Her hafta gerçek haber." | Drift-down: kelimeler yukarıdan yerine iner |
| 3 | 0.40 - 0.58 | Pus katmanı, lens parlaması ve bir an odak kaybı | "Çekim bizden. Kurgu bizden." | Blur-to-sharp: yumuşak kopya keskin kopyaya geçer, lens anıyla aynı beat |
| 4 | 0.60 - 0.78 | Işık çizgileri hizalanmaya başlıyor | "Yapay zekâ süs değil, üretim hattı." | Grid snap-align: karakterler okuma sırasında yerine kayar |
| 5 | 0.80 - 1.00 | Yatay ışık düzlemi oturur, altın nokta merkezde dinlenir | "Hikâyeleri yaşatıyoruz." | Word-by-word rise, sonra alt satır, sonra CTA: üç varış, tek bant |

**Bant 5 alt satır:** "Dijitalde fikir sizden, gerisi bizden. Haber, prodüksiyon ve
yapay zekâyı tek ekipte topluyoruz."

**Bant 5 CTA:** "TEKLİF AL" (WhatsApp) ve "İŞLERİMİZ" (portföy çapası).

Bant 1 açılışta yerleşmiş gelir: kaydırma başlamadan bir kerelik zamanla süren
giriş rampasıyla kurulur, sonra kaydırmaya devredilir. Diğer bantların hepsi
kaydırmayla geri sarılabilir.

---

## 8. Statik hero metni

Telefon, dikey tablet, yan yatan telefon ve azaltılmış hareket tercihinde
gösterilir. Bu bir mazeret değil, tasarlanmış bir düzen: son karenin poster hâli
üzerine yerleşmiş metin.

- **Başlık:** "Hikâyeleri yaşatıyoruz."
- **Alt satır:** "Balıkesir'den yayında. Haber, prodüksiyon ve yapay zekâ, tek ekipten."
- **CTA:** "TEKLİF AL"

---

## 9. Hero'nun altı

Sayfanın alt bölümleri zaten yayında ve önermeye hizmet ediyor. Kaydırmalı hero
geldiğinde değişecek olanlar:

- **Kanıt öne alınır.** Haber şeridi ("Her hafta gerçek haber" bandının karşılığı)
  hero'dan hemen sonra gelir. Önerme kanıtla buluşmadan kaydırma devam etmemeli.
- **Portföy ve showreel** ikinci sırada: yayınlanmış işin görünen hâli.
- **SSS bölümü eklenir**, araştırmadaki üç itiraza doğrudan cevap veren üç soruyla:
  fiyat nasıl belirleniyor, ne kadar sürede iş çıkıyor, işi kim yapıyor.
- **Tek CTA:** her bölüm WhatsApp teklif akışına çıkar. Paket seçici zaten bunu
  yapıyor, korunur.

---

## 10. Vektör katmanı

- Bant 5'te ışık düzlemiyle hizalanan, kendini çizen ince yatay SVG çizgi.
- Bölüm başlıklarında whisper seviyesinde parçacık katmanı, görüntünün dünyasından.
- Hepsi azaltılmış harekette son hâlinde donar, sürücüler durur.

---

## 11. Mühendislik listesi

Faz 8 bunları yarım hatırlamasın diye tam liste:

- Videoyu Blob olarak indir (host Range desteklemiyorsa arama sıfıra kırpılır).
  8 MB üstüyse akışlı indirme ve dürüst yükleme halkası.
- Gösterilen zamanı lerp et, kare hızından bağımsız (dt normalizasyonu), yakınsayınca
  ve hero ekran dışındayken döngü dinlensin.
- Aramaları kapıla, kilitlenmeye karşı `error` olayında bayrağı sıfırla.
- DOM'a yalnızca değer değiştiğinde yaz.
- Bantları vh cinsinden tempola, flick testiyle (120px, 240px, 360px) doğrula.
- Dört katmanlı okunurluk sistemi ve en kötü kare denetimi, her bant en az 3.5:1.
- Beş statik hero kapısı, CSS ve JS'te birebir aynı, `change` dinleyicileriyle canlı.
  **Bu kapılar sitede zaten kurulu** (PR #6), kaydırmalı hero aynı kapılara bağlanır.
- Video hiç gelmese bile sayfa eksiksiz.
- Video `aria-hidden`, `tabindex="-1"`, kontrolsüz: dekoratif.
- Kaydırma videosunu `-g 8 -keyint_min 8` ile yeniden kodla, yoksa scrub takılır.
- Ham dosyalar ve inceleme kopyaları `public/` dışında kalır, asla yayına çıkmaz.

---

## 12. Maliyet ön kontrolü

Üretimden önce, para hareket etmeden:

1. Planlanan başlangıç karesinin fiyatı `get_cost: true` ile sorulur ve kullanıcıya
   söylenir. Referans: yaklaşık 2 kredi.
2. Kare onaylandıktan sonra **aynı** video için en üst iki veya üç model
   ön kontrolden geçirilir ve gerçek fiyatlar yan yana sunulur. Referans aralık:
   yaklaşık 10 ile 55 kredi arası. Model seçimi kullanıcınındır.
3. Alt bölümler için 2 ile 4 destek görseli aynı toplama katılır.
4. Tier 2'ye geçilirse zincirin tamamı segment segment ön kontrolden geçirilir ve
   toplam önceden söylenir.

Buradaki hiçbir rakam taahhüt değil. Gerçek fiyat `get_cost` çıktısıdır.

---

## 13. Metin kapısı

Bu paketteki her yayına gidecek satır **aynen** yayınlanır. Kurulan sayfa,
kullanıcıya gösterilmeden önce metin denetiminden geçer: sıfır uzun tire, sıfır
şablon kelime, ve gövde metninde AI izlerinin taranması. Bu belgede bilinçli
seçilmiş marka aygıtları (üçlü ritim, kısa vuruşlu cümleler) zanaattır, kalır.
