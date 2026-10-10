# BTMEDYA Haber Yazım Stili

Ulusal ölçekte ödüllü haber dili + Balıkesir'in yerel gücü. Bu kılavuz hem insan editör için hem otomatik yazıcı (`src/sabah-masasi.js` → `yonerge()`) için tek kaynaktır; ikisi değiştiğinde birlikte güncellenir.

## 1. Değişmez kural: doğruluk

- Yalnız kaynakta açıkça yazan bilgi yazılır. Rakam, tarih, isim, unvan, kurum, alıntı: kaynağı yoksa üretilmez.
- Rakamlar kaynaktaki biçimle (`108 bin 321`, `yüzde 24`); yuvarlama, hesaplama, yazıya çevirme yok.
- Bir adı/bilgiyi kaynakta bağlı olduğundan başka kişi/kurum/zamana bağlamak uydurmadır.
- İddia/kulis/tek kaynaklı bilgi → başlıkta ve ilk paragrafta kaynağa atfedilir ("… haberine göre", "iddiaya göre").
- Doğrulanmış bilgi ile yorum/çıkarım ayrılır. Yorum eklenmez; gövde kaynaktaki bilgi bitince biter.

## 2. Haber açısı (ulusal standart)

- **Ters piramit:** en sonuç doğuran olgu en başa. Kronolojiyle başlama.
- **İlk cümle somut:** özne + güçlü fiil + en çarpıcı olgu/rakam. Isınma cümlesi yok.
- **"Neden önemli" paragrafı:** 2-3. paragrafta, gelişmenin okura/Balıkesir ekonomisine/günlük yaşama etkisi — yalnız kaynaktaki olgularla.
- **Yerel öncelik:** Balıkesir/gündem haberinde il ve varsa ilçe/mahalle öne; olayın somut sonucu (ulaşım, fiyat, hizmet, iş, güvenlik) gösterilir. Ulusal/dünya haberinde yerel bağ ancak kaynakta varsa kurulur, zorlanmaz.

## 3. Dil ve biçim

- Etken çatı, somut fiil: "gerçekleştirildi/hayata geçirildi" → "yapıldı/açıldı/başladı".
- **Yasak klişe/PR dili:** "dikkat çekti", "yoğun ilgi gördü", "göz doldurdu", "renkli görüntüler", "start aldı", "hayata geçirildi", "bir hayli", "vatandaşlar tarafından", "adeta", "tam anlamıyla", "bilindiği gibi". Sıfat yığını ve abartı yok.
- Türkçe ekler doğru: özel adlara kesmeyle (`Balıkesir'de`, `TRT'nin`); skorlar `4-1'lik`; sayı ekleri okunuşa göre (`3'te`, `1990'lı`). Belirli tarih veren ay/gün adları büyük: `30 Eylül`, `4 Ekim Cuma`.

## 4. Alan uzunlukları

| Alan | Kural |
|---|---|
| Başlık | 55-95 karakter, yüklemli tam cümle, özne + ne oldu + varsa rakam. Cümle düzeni (yalnız ilk harf + özel ad büyük). Ünlem/soru/"şok"/"flaş" yok. |
| Spot | 140-260 karakter, 1-2 cümle; başlığı tekrarlamaz, ikinci önemli bilgiyi ekler. |
| Gövde | 4-6 paragraf, her biri 2-4 cümle, tek fikir. İlk paragraf 5N1K. |

**İyi başlık:** `Balıkesir'de tarım fuarı dört günde 108 bin ziyaretçiyi ağırladı`
**Kötü başlık:** `Okula Uyumu` / `Balıkesir'de Şok Gelişme!`

## 5. Rakip kıyası (neden daha iyi)

| Zayıf yerel gazetecilik | BTMEDYA |
|---|---|
| Kaynak metni kopyala-yapıştır | Özgün yeniden kurma + doğrulama |
| Klişe PR dili ("göz doldurdu") | Somut fiil + olgu |
| Kronolojik, gömülü haber değeri | Ters piramit, ilk cümlede değer |
| Rakamsız, bağlamsız | Kaynaklı rakam + "neden önemli" |
| Tık tuzağı başlık | Merak + dürüstlük |

## 6. Otomatik denetim (yazıcıya bağlı)

Her taslak üç denetimden geçer, geçemezse modele geri verilip en fazla 3 kez yazdırılır (`src/sabah-masasi.js`):
- **rakamDenetimi** — taslaktaki her rakam kaynakta var mı.
- **adDenetimi** — kişi/kurum adları kaynakta geçiyor mu.
- **iddiaDenetimi** (ikinci model çağrısı) — olguların birbirine bağlanışı kaynakla tutarlı mı.

Geçemeyen haber yayına değil taslağa düşer; yayın kararı editördedir.
