# Sinematik Scroll Sitesi, Devir Notu

Bu not, `10k-websites` becerisiyle yapılacak sinematik scroll sitesi çalışmasının
nereden devam edeceğini anlatır. Bulut oturumunda hazırlandı, masaüstü Claude Code
oturumunda devam edilecek.

Tarih: 2026-09-07
Dal: `claude/new-session-onanb3`

---

## 1. Neden masaüstüne taşındı

Beceri üç araca dayanıyor: Claude Code siteyi kurar, Higgsfield tüm görsel ve
videoyu üretir, Hostinger yayına alır.

Bulut oturumunda Higgsfield araçları yanıt vermedi. Hesaba bağlı tüm konektörler
listelendi; Higgsfield hesap seviyesinde kayıtlı değil. Konektör masaüstü
uygulamasına eklenmişse bulut konteynerine ulaşmaz. Bu yüzden iş masaüstüne alındı.

Ek sebep: bulut konteyneri geçici. Üretilen ham video ve görseller push edilmezse
oturum kapandığında kaybolur. Masaüstünde dosyalar kalıcı, önizleme sunucusu da
kendi tarayıcınızda açılıyor.

## 2. Kurulum durumu (Faz 1)

| Araç | Durum | Not |
|---|---|---|
| ffmpeg | Bulutta kuruldu, 6.1.1 | **Masaüstünde ayrıca doğrulanmalı.** Bu kurulum konteynere aitti, sizin makinenize değil. |
| Node.js | Bulutta v22.22.2 | Aynı şekilde masaüstünde doğrulanmalı. |
| Higgsfield | Doğrulanmadı | Masaüstü oturumunda ilk iş: araçların yanıt verdiğini ve kredi bakiyesini teyit etmek. |
| Hostinger | Bağlı değil | Faz 10'a kadar gündeme gelmez. Aşağıdaki 4. maddeye bakın. |

Masaüstünde Faz 1 taraması sıfırdan tekrar çalıştırılmalı. "Bulutta kurulmuştu"
bir doğrulama değildir.

## 3. Bu oturumda yapılanlar

- Beceri depoya kalıcı olarak kuruldu: `.claude/skills/10k-websites/`
  (SKILL.md + altı referans dosyası). Masaüstü oturumu bu klasörü otomatik yükler,
  yani beceriyi tekrar sohbete sürüklemeye gerek yok.
- Mevcut sitenin marka ve teknik envanteri çıkarıldı (aşağıda).
- Hiçbir kredi harcanmadı. Hiçbir görsel veya video üretilmedi.

## 4. Kararlar (kapandı)

Her iki açık karar da kullanıcı tarafından verildi.

**a) Yayın yeri: Cloudflare.** Sayfa bu depoya `public/` altına girer ve mevcut
Cloudflare Workers akışıyla yayınlanır. Alan adı yerinde kalır, ek maliyet yok.
Becerinin Faz 10 Hostinger adımı **uygulanmaz.** Bu bilinçli bir sapmadır ve tasarım
paketinin 0. bölümünde kayıt altındadır.

**b) Kapsam: BTMEDYA'nın yeni anasayfası.**

Faz 2, 3, 4 ve 5 bulut oturumunda tamamlandı. Çıktı:
**`docs/10K-TASARIM-PAKETI.md`**, masaüstü oturumunun doğrudan girdisi.

Paket şunları içerir: marka önermesi, ölçülmüş kontrast oranlarıyla palet token'ları,
yazı tipi üçlüsü, dört bantlık bant haritası ve birebir metinler, sabit hero metni,
sekiz kıvrım altı bölümün tamamı birebir metinleriyle, imza öğesi ve vektör katmanı
planı, mühendislik listesi, hazır üretim istemleri ve metin kapısı.

Alınan yaratıcı kararlar: hero konsepti **A, Sokaktan ekrana** (ıslak kaldırımdan
su yüzeyinden geçerek ışığa iniş), Tier 1 tek çekim, hero'da kurucu yüzü yok,
gerçek fotoğraf "Kim yapıyor" bölümünde.

**Onay bekleyen tek metin kararı:** oturma başlığı için önerilen
"Fikir sizden. Kadraj bizden." satırı, mevcut "Dijitalde Fikir Sizden, Gerisi Bizden."
marka satırının keskinleştirilmiş hali. Marka satırını değiştirmek kullanıcının kararı.

## 4b. Araştırmada çıkan mevzuat bulgusu

Faz 3 araştırması sırasında doğrulandı, birincil kaynaklı ve BTMEDYA'yı doğrudan
ilgilendiriyor.

Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği 1 Temmuz 2026 tarihli ve 33297
sayılı Resmî Gazete ile değişti, **1 Ağustos 2026'da yürürlüğe girdi.** İki hüküm:

- Reklamlarda tüketicinin ekonomik davranışını önemli ölçüde etkileyecek şekilde yapay
  zekâ kullanılması ya da insandan ayırt edilemeyen dijital karakterlere yer verilmesi
  halinde bunun açık, anlaşılır ve ayırt edilebilir şekilde belirtilmesi zorunlu.
- Gerçek bir kişinin yapay zekâ ile üretilmiş dijital kopyasının bir ürünü gerçeğe
  aykırı biçimde kullanmış ya da tavsiye etmiş gibi gösterilmesi yasak.

Sonuçları: AI etiketlemesi artık tercih değil uyum konusu; bu bir satış argümanı olarak
sitede imza bölümü haline getirildi; ve hero'da kurucu yüzünün üretilmemesi kararının
gerekçelerinden biri bu.

Kaynak: Resmî Gazete 1/7/2026 sayı 33297 · mevzuat.gov.tr güncel metin ·
Ticaret Bakanlığı duyurusu · AA Teyit Hattı.

Hukuki görüş değildir. Ticari işlerde kendi hukuk danışmanınıza teyit ettirin.

## 5. Mevcut sitenin envanteri (Faz 2 ve 3 için girdi)

### Marka değerleri (public/styles.css içinden)

```
--bg:#02070d   --bg2:#07111c   --ink:#eaf2f8   --muted:#8da0b2
--cyan:#35d6ff  --blue:#2a7fff  --gold:#d6a84a  --champagne:#f2d27a
```

Yazı tipleri: Space Grotesk (başlık), Manrope (gövde), Inter (yüklü ama başlıkta
kullanılmıyor).

Beceri kuralı hatırlatması: Inter ve Roboto başlık yüzü olarak yasak. Space Grotesk
başlık olarak sorun değil. Ancak koyu lacivert zemin + camgöbeği vurgu kombinasyonu
teknoloji sitelerinde çok yaygın; beceri "yapay zekâ yapmış gibi duran" görünümlere
karşı uyarıyor. Yeni sayfanın paleti, üretilecek görüntünün kendi dünyasından
örneklenmeli. Mevcut palet bir başlangıç noktası, bağlayıcı bir kural değil.

### Mevcut hero yapısı

Anasayfada zaten scroll ile ilerleyen bir hero var: `.hero-scroll` 620vh yükseklik,
içinde `.hero-sticky` sabit sahne. Yani sayfa mimarisi tanıdık. Fark şu: mevcut
kurulum scroll ile videoyu **kare kare sarmıyor**, sadece katmanları hareket
ettiriyor ve durum videolarını değiştiriyor.

### Mevcut video varlıkları

`public/assets/media/web/` altında yedi mp4, toplam ~10.5 MB.
`hero-bg.mp4`: 1280x720, 13.4 saniye, 3.1 MB, h264.

**Önemli teknik tespit:** bu videoların anahtar kare aralığı ölçüldü, yaklaşık 30
karede bir. Scrub için gereken değer 8. Yani mevcut videolar scroll ile sarmalı
kullanılırsa takılır. Kullanılacaklarsa `ffmpeg-recipes.md` içindeki scrub
encode komutuyla `-g 8 -keyint_min 8` ile yeniden kodlanmalı. Bu kredi
gerektirmez, sadece ffmpeg işidir.

## 6. Masaüstünde ilk adımlar

Faz 1 dışındaki tüm hazırlık bitti. Masaüstü oturumu doğrudan Faz 6'ya, yani üretime
girebilir.

1. Depoyu çekin, `claude/new-session-onanb3` dalına geçin.
2. Claude Code'u proje klasöründe açın. Beceri `.claude/skills/` altından
   otomatik yüklenir.
3. Faz 1 taramasını baştan çalıştırın: ffmpeg, Node.js, Higgsfield araçları,
   Higgsfield kredi bakiyesi. Her birini çalıştırarak doğrulayın.
4. Kredi bakiyesi görüldükten sonra dürüst maliyet konuşması yapılır.
5. `docs/10K-TASARIM-PAKETI.md` okunur. Faz 2, 3, 4 ve 5 orada tamamlanmış durumda,
   tekrar sorulmaz.
6. Faz 6: paketin 9. bölümündeki başlangıç karesi istemi `get_cost: true` ile
   fiyatlanır, kullanıcıya söylenir, sonra üretilir ve incelenir.
7. Kare onaylandıktan sonra video modeli seçimi, sonra video, sonra video kapısı.

Yaratıcı işe kredi bakiyesi görülmeden başlanmaz. Video kapısını geçmemiş
görüntünün etrafına site kurulmaz.

## 7. Bulut oturumunda yapılamayanlar

Dürüstlük için: aşağıdakiler yapılmadı, çünkü Higgsfield olmadan yapılamaz.

- Hiçbir görsel veya video üretilmedi. Hiç kredi harcanmadı.
- Palet token değerleri onaylanmış görüntüden örneklenmedi; paketteki değerler
  konseptten türetilmiş başlangıç değerleridir.
- Bant aralıkları flick testinden geçmedi; başlangıç değeridir.
- `index.html` yazılmadı. Beceri, onaylanmamış görüntünün etrafına site kurmayı
  yasaklıyor.
