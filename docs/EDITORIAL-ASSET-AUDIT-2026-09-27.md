# BTMEDYA Editorial Asset Audit — 27 Eylül 2026

## Amaç
GitHub production deposundaki haber, medya ve video varlıklarını BTMEDYA'nın canlı yayın mantığına göre sınıflandırmak.

## Kullanılacak kaynaklar
- D1/CMS yayın kayıtları: canlı haber akışı için kanonik yapı.
- `public/data/haberler.json`: arşiv haberleri ve kaynak/orijinal tarih bilgileri.
- `public/data/haber-kapak-kaynagi.json`: kapak kaynağının gerçek/temsili/arşiv ayrımı.
- `public/data/medya-ozel.json`: gerçek çekim listesi, vitrin sırası, poster ve kasadan hariç tutulan dosyalar.
- `public/data/youtube-portfoy.json`: Buse Tuncay / BTMEDYA YouTube portföy kayıtları.
- `public/media/**` ve `public/assets/**`: production medya.
- `BTMEDYA Kaynak Masası`: üçüncü taraf kaynaklarda kaynak URL'si, lisans, tarih ve atıf kaydının korunması.

## Editorial karar
Üçüncü taraf bir haber sitesinin metinleri, fotoğrafları veya marka varlıkları BTMEDYA production içine kopyalanmaz. Referans sitenin bilgi mimarisi kullanılabilir; BTMEDYA kendi haber metni, kendi fotoğrafı/video arşivi ve doğrulanmış kaynak künyesiyle yayın yapar.

## Gerçek medya
`public/data/medya-ozel.json` içindeki `gercek` listesi BTMEDYA'nın gerçek çekim havuzu olarak kabul edilir. AI üretimleri gerçek arşive karıştırılmaz.

## Vitrin dışı / hariç
`vitrinDisi` ve `haric` kayıtları silinmedi. Bunlar kasada bulunan fakat ana vitrinde gösterilmemesi istenen üretim varlıklarıdır. Önce arşiv/legacy statüsü doğrulanmadan fiziksel silme yapılmayacak.

## Haber kapakları
`haber-kapak-kaynagi.json` içindeki `gercek` kayıtlar gerçek çekim, `arsiv` tarihsel arşiv, `temsili` ise temsilî görsel olarak işaretlenir. Bu ayrım yayın arayüzünde korunmalıdır.

## Video / podcast
Production reposunda "Siyah Oda" kategorisi ve podcast tasarım niyeti mevcut; ancak denetlenen production medya ağacında açıkça adlandırılmış bir Siyah Oda ham podcast videosu bulunmadı. Mevcut video varlıkları arasında saha showreel, portföy videoları ve web hero videoları var.

Bu nedenle siyah oda podcast kurgusu, kaynağı belirsiz bir video seçilerek otomatik başlatılmadı. Ham podcast kaydı geldiğinde:
1. uzun bölüm,
2. 16:9 YouTube ana video,
3. 9:16 kısa kesitler,
4. fragman/teaser,
5. site video kartı,
6. YouTube/Metricool yayın kaydı
olarak zincire alınacak.

## Silme politikası
Bu denetimde doğrulanmış kullanılmayan dosya ile kasıtlı olarak vitrinden çıkarılmış dosya birbirinden ayrılmadığı için production binary dosyaları silinmedi. Önce kayıt/bağlantı/rights kontrolü yapılacak.
