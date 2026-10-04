# Alan Adı Yapılandırması — btmedya.com.tr ve btmedyaajans.com

**Ölçüm tarihi: 4 Ekim 2026.** Aşağıdaki durum tablosu tahmin değil, o gün
yapılan sorguların sonucudur; her bölümün altında yeniden ölçmek için komut var.

`btmedya.com.tr` tarafındaki DNS, sitemap ve Search Console denetiminin
geçmişi: [`DOMAIN-DNS-SEARCH-CONSOLE-AUDIT-2026-09-28.md`](DOMAIN-DNS-SEARCH-CONSOLE-AUDIT-2026-09-28.md).
Bu belge onun üstüne iki şey ekliyor: ikinci alan adının nasıl kurulacağı ve
canlıda bulunan bir yinelenen içerik hatasının düzeltilmesi.

---

## 1. Mevcut durum (ölçülmüş)

| Adres | Ölçüm | Sonuç |
|---|---|---|
| `btmedya.com.tr` | HTTP | **200** — canlı |
| `www.btmedya.com.tr` | HTTP | **301** → apex, doğru |
| `btmedyaajans.com` | DNS | **kayıt yok** — hiçbir adrese çözülmüyor |
| `btmedyaajans.com` | Verisign RDAP | **404 — TESCİLLİ DEĞİL** |
| Cloudflare Workers | hesapta | tek Worker: `btmedya-db` |
| `wrangler.toml` rotaları | Custom Domain | `btmedya.com.tr`, `www.btmedya.com.tr` |

### Kritik bulgu: alan adı henüz satın alınmamış

`.com` kayıtlarının yetkili kaynağı Verisign RDAP, `btmedyaajans.com` için 404
dönüyor. Aynı sorgu tescilli bir alan adı için (`example.com`) 200 dönüyor,
yani sorgu yolu çalışıyor. Tescilli olsaydı 200 ve tescil bilgisi gelirdi.

Sonuç: Cloudflare tarafında `btmedyaajans.com` için yapılacak hiçbir işlem yok,
çünkü yapılandırılacak bir alan adı yok. **Önce satın alınması gerekiyor.** Kod
tarafı, alan adı bağlandığı anda çalışacak şekilde hazırlandı (bölüm 3).

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://btmedya.com.tr/
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.btmedya.com.tr/
getent hosts btmedyaajans.com || echo "DNS kaydı yok"
curl -sL -o /dev/null -w "registry: %{http_code}\n" \
  https://rdap.verisign.com/com/v1/domain/btmedyaajans.com   # 404 = tescilli değil
curl -sL -o /dev/null -w "kontrol: %{http_code}\n" \
  https://rdap.verisign.com/com/v1/domain/example.com        # 200 = sorgu yolu çalışıyor
```

---

## 2. Canlıda bulunan hata: dört sayfa iki adreste birden yayındaydı

Yapılandırma denetlenirken, sitemap'te olduğu halde `run_worker_first`
listesinde olmayan dört sayfa bulundu:

`/marka-kiti/` · `/ai-lab/` · `/reklam-ve-sponsorluk/` · `/en/`

Statik dosyalar Worker'dan önce servis edilir. Bu dört adreste Worker hiç
çalışmıyordu, dolayısıyla `www` → apex 301'i de çalışmıyordu. Canlı ölçüm:

| Sayfa | apex | www | |
|---|---|---|---|
| `/` | 200 | **301** | kapsamda, doğru |
| `/hizmetler/` | 200 | **301** | kapsamda, doğru |
| `/basin-kiti/` | 200 | **301** | kapsamda, doğru |
| `/marka-kiti/` | 200 | **200** | kapsam dışı — yinelenen içerik |
| `/ai-lab/` | 200 | **200** | kapsam dışı — yinelenen içerik |
| `/reklam-ve-sponsorluk/` | 200 | **200** | kapsam dışı — yinelenen içerik |
| `/en/` | 200 | **200** | kapsam dışı — yinelenen içerik |

Dördü de indekslenen sayfa. Arama motoru aynı içeriği iki ayrı adreste
görüyordu; hangisini göstereceğini kendi seçer ve iki adres birbirinin
sinyalini böler. Aynı sayfalar `X-Robots-Tag` ve güvenlik başlıklarını da
alamıyordu, çünkü o başlıkları Worker basıyor.

**Düzeltildi:** dört desen `wrangler.toml > run_worker_first` listesine eklendi
(`/marka-kiti*`, `/ai-lab*`, `/reklam-ve-sponsorluk*`, `/en` + `/en/*`).
Deploy sonrası dördü de `www` adresinde 301 dönmeli:

```bash
for p in marka-kiti ai-lab reklam-ve-sponsorluk en; do
  printf "%-24s " "$p"
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://www.btmedya.com.tr/$p/"
done
```

Bu boşluğun bir daha açılmaması için `tools/alan-adi-denetimi.mjs` eklendi
(bölüm 4). Yeni bir üst düzey sayfa sitemap'e girip listeye girmezse PR
kırmızıya düşer.

---

## 3. Karar: ikinci alan adı ne yapacak?

İki seçenek var; bu bir strateji kararı, teknik bir karar değil.

| | A — 301 yönlendirme *(varsayılan)* | B — ayrı ajans sitesi |
|---|---|---|
| `btmedyaajans.com` | `btmedya.com.tr`'ye 301 | kendi içeriğiyle yayın |
| Arama motoru | tek güçlü adres | iki adres, sinyal bölünür |
| İçerik yükü | yok | ayrı içerik üretimi şart |
| Maliyet | yalnızca alan adı | alan adı + içerik + bakım |

**Bu paket A'ya göre kuruldu.** Gerekçe bölüm 2'de ölçülen şeyin aynısı: aynı
içerik iki adreste 200 dönerse yinelenen içerik olur. `btmedya.com.tr` zaten
indekslenmiş, haber arşivi ve hizmet sayfaları orada.

**Bu bir varsayım.** B isteniyorsa — haber markası `btmedya.com.tr`'de, ajans
tanıtımı `btmedyaajans.com`'da gibi gerçek bir ayrım kurulacaksa — A'dan B'ye
geçiş `src/worker.js` içindeki `IKINCIL_HOSTLAR` kümesinden tek satır çıkarmak
ve ikinci bir Worker kurmaktır. Ama o zaman ajans sitesinin içeriği de
üretilmelidir; boş ya da kopya içerikli bir ikinci site A'dan kötüdür.

---

## 4. Kod tarafı — yapıldı

Alan adı satın alınmadan yapılabilecek her şey tamamlandı.

| Dosya | Değişiklik |
|---|---|
| `src/worker.js` | `KANONIK_HOST` / `IKINCIL_HOSTLAR` tablosu + `kanonikHedef()` |
| `wrangler.toml` | 4 eksik desen eklendi; ikincil alan adının neden route olmadığı |
| `tools/alan-adi-denetimi.mjs` | 4 kontrol (yeni) |
| `.github/workflows/pr-validation.yml` | denetimi her PR'da çalıştırır |

### Yönlendirme tablosu

`src/worker.js` içinde, tek kaynak:

```js
const KANONIK_HOST = 'btmedya.com.tr';
const IKINCIL_HOSTLAR = new Set(['btmedyaajans.com']);
```

Önceki kod yalnızca `www.` ön ekini kırpıyordu. Bu, `www.btmedyaajans.com`
isteğini `btmedyaajans.com` adresine yönlendirirdi — yani kanonik olmayan bir
adrese. Yeni tablo ikisini tek yerde çözüyor:

| Gelen host | Sonuç |
|---|---|
| `btmedya.com.tr` | yönlendirme yok |
| `www.btmedya.com.tr` | 301 → apex (önceki davranış korundu) |
| `btmedyaajans.com` | 301 → kanonik |
| `www.btmedyaajans.com` | 301 → kanonik, **tek adımda** — zincir yok |
| `BTMedyaAjans.COM` | 301 → kanonik (büyük/küçük harf farketmez) |
| `btmedya-db.*.workers.dev` | yönlendirme yok (önizleme adresi korunur) |

Yol ve sorgu korunuyor: `btmedyaajans.com/haberler/x` → `btmedya.com.tr/haberler/x`.
Böylece ikincil adrese verilmiş bir bağlantı anasayfaya değil kendi sayfasına düşer.

**Bu kodun sınırı:** Worker yalnızca `run_worker_first` desenlerinde çalışır.
Kapsam dışı kalan `/styles.css`, `/assets/*` gibi dosyalar ikincil adreste 200
dönmeye devam eder. Bu yüzden kod tek başına yeterli değil; alan adı genelinde
kesin çözüm bölüm 5'teki Redirect Rule, kod onun yedeği.

### Denetim

`node tools/alan-adi-denetimi.mjs` — dört kontrol:

1. **Tek kanonik adres** — `sitemap.xml`, `news-sitemap.xml`, `robots.txt` ve
   sayfa içi `canonical` etiketleri aynı hostu gösteriyor mu.
2. **`run_worker_first` kapsamı** — sitemap'teki her yol kapsamda mı.
   Bölüm 2'deki hatayı bulan kontrol bu.
3. **İkincil alan adı route değil** — `wrangler.toml` içine Custom Domain
   olarak eklenmiş mi (eklenmemeli; gerekçe bölüm 5).
4. **Yönlendirme tablosu** — `kanonikHedef` kaynaktan olduğu gibi çıkarılıp 6
   host vakasıyla sürülür. Kopya tutulmaz; test ettiği şey gerçek koddur.

Dört kontrol de kasıtlı hata enjekte edilerek sürüldü, dördü de yakaladı.
Kapsam bilerek dar: erişilebilirlik, CSS, bağlantı ve mobil kontrolleri
`a11y-denetimi.mjs`, `css-denetimi.mjs`, `link-denetimi.mjs` ve
`mobile-regression-gate.mjs` içinde.

---

## 5. Cloudflare tarafı — alan adı satın alındıktan sonra

Sıra önemli. Her adımda ne beklendiği yazılı; beklenen çıkmazsa sonraki adıma
geçmeyin.

### Adım 1 — Satın al

`btmedyaajans.com` bir `.com`, yani kısıtsız: herhangi bir kayıt kuruluşundan
belge istenmeden alınabilir. (`btmedya.com.tr` bir `.com.tr` ve tescil belgesi
gerektirir; o zaten alınmış.)

Cloudflare Registrar'dan alınırsa alan adı doğrudan hesaba düşer ve adım 2
atlanır.

### Adım 2 — Zone'u Cloudflare'e ekle

Panel > Add a site > `btmedyaajans.com` > Free plan. Cloudflare iki nameserver
verir; kayıt kuruluşunun panelinde alan adının nameserver'larını bunlarla
değiştirin.

```bash
curl -s "https://dns.google/resolve?name=btmedyaajans.com&type=NS" | python3 -m json.tool
```

Cloudflare'in nameserver'ları görünene kadar devam etmeyin. Zone "Active"
olmadan Redirect Rule çalışmaz.

### Adım 3 — Yer tutucu DNS kaydı

Yönlendirme için gerçek bir sunucu gerekmez, ama Cloudflare'in isteği
karşılayabilmesi için **proxy açık** bir kayıt şart:

| Tip | Ad | İçerik | Proxy |
|---|---|---|---|
| `AAAA` | `@` | `100::` | **turuncu bulut (açık)** |
| `AAAA` | `www` | `100::` | **turuncu bulut (açık)** |

`100::` IPv6 discard adresi; IPv4 karşılığı `A` kaydıyla `192.0.2.0`. İkisi de
Cloudflare'in origin'siz kurulum için ayırdığı yer tutuculardır. Gerçek bir
sunucuya işaret etmemeleri kasıtlı: yoksa sahibi olmadığınız bir altyapıya
trafik gider.

Proxy açık olduğu için istek hiç oraya ulaşmaz, Cloudflare kendi kenarında
Redirect Rule ile karşılar. **Proxy kapalıysa (gri bulut) istek gerçekten
`100::`'e gider ve site açılmaz; bu adımda en sık yapılan hata budur.**
Cloudflare'in kendi ifadesiyle: Redirect Rule'un uygulanabilmesi için
yönlendirilen host'un proxy'li bir DNS kaydı olması gerekir.

Kaynak: [Cloudflare — Custom Domains, www/root yönlendirmesi](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

### Adım 4 — Redirect Rule

Alan adı seçili > Rules > Redirect Rules > Create rule.

| Alan | Değer |
|---|---|
| Rule name | `btmedyaajans.com -> btmedya.com.tr` |
| When incoming requests match | **All incoming requests** |
| Type | Dynamic |
| Expression | `concat("https://btmedya.com.tr", http.request.uri.path)` |
| Status code | **301** (kalıcı) |
| Preserve query string | **açık** |

"All incoming requests" seçilir çünkü bu zone'da yönlendirilmeyecek adres yok.
`www` için ayrı kural gerekmez: iki DNS kaydı da aynı zone'da, kural ikisini de
karşılar ve tek adımda gönderir.

**Neden Worker'a Custom Domain olarak bağlanmıyor?** İki neden: her istek
ücretli bir Worker çağrısına dönerdi, ve yönlendirme yine yalnızca
`run_worker_first` kapsamındaki yollarda çalışırdı — bölüm 2'de canlıda ölçülen
hatanın aynısı. Redirect Rule Worker'dan önce çalışır, her yolu kapsar ve
ücretsizdir. `tools/alan-adi-denetimi.mjs` kontrol 3 bu kararı koruyor.

### Adım 5 — Doğrula

```bash
for h in btmedyaajans.com www.btmedyaajans.com; do
  echo "=== $h ==="
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://$h/"
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://$h/haberler/"
done
curl -sIL --max-time 15 https://www.btmedyaajans.com/ | grep -i "^HTTP/\|^location:"
```

Beklenen: dört istekte de **301**, hedefler `https://btmedya.com.tr/` ve
`https://btmedya.com.tr/haberler/`. Son komutta tek bir `301` satırı ve ardından
`200` görünmeli.

- Yol korunmuyorsa Expression yanlış.
- 200 dönüyorsa DNS proxy'si kapalı (adım 3).
- İki `301` üst üste görünüyorsa zincir var; sebebi genellikle `www` için
  ayrıca eklenmiş gereksiz bir kuraldır.

### Adım 6 — SSL

Zone > SSL/TLS > Overview > **Full (strict)**. Edge Certificates altında
"Always Use HTTPS" açık olmalı. Yeni zone'da sertifika birkaç dakikada çıkar;
o süre içinde `https://` isteklerinde sertifika hatası görülebilir, normaldir.

### Adım 7 — Search Console

Yeni alan adı için ayrı property **açılmaz.** Tamamı 301 ile kanonik adrese
gittiği için kendi içeriği yok; ayrı property açmak iki ayrı içerik kaynağı
izlemek demek olur. Mevcut `btmedya.com.tr` property'si yeterli.

---

## 6. btmedya.com.tr — bakım notu

`www` → apex 301'i hâlâ Worker'a bağlı ve yalnızca `run_worker_first`
kapsamındaki yollarda çalışıyor. Bölüm 2'deki düzeltme indekslenen sayfaları
kapsama aldı; `/styles.css`, `/assets/*` gibi varlıklar hâlâ `www` üzerinden de
200 döner. Arama motoru açısından sorun değil (indekslenen sayfa değiller), ama
alan adı genelinde tek adımda çözüm isteniyorsa bu zone'a da bir Redirect Rule
eklenebilir:

| Alan | Değer |
|---|---|
| When | `http.host eq "www.btmedya.com.tr"` |
| Then | `concat("https://btmedya.com.tr", http.request.uri.path)` |
| Status | 301, Preserve query string açık |

Bu kural Worker'dan önce çalışır, hiç Worker çağrısı üretmez ve
`run_worker_first` listesine bağımlı olmaz. Eklenirse `src/worker.js`'teki
yönlendirme ölü koda dönüşmez, yedek olarak kalır.

**Yeni üst düzey sayfa eklerken** `run_worker_first` listesini de güncelleyin.
`tools/alan-adi-denetimi.mjs` sayfa sitemap'e girdiği sürece bunu yakalar.

---

## 7. GitHub tarafı

### Yapıldı

`tools/alan-adi-denetimi.mjs`, mevcut `pr-validation.yml` iş akışına eklendi;
her pull request'te diğer denetim araçlarıyla birlikte çalışıyor. Ayrı bir iş
akışı açılmadı — o iş akışı zaten sözdizimi, erişilebilirlik, CSS, bağlantı,
mobil ve `wrangler deploy --dry-run` kontrollerini yapıyor.

### Kalan: dal koruması (panelden, 2 dakika)

`main` dalına push, Cloudflare Workers Builds üzerinden doğrudan canlı siteyi
günceller. **CI tek başına bunu engelleyemez:** Workers Builds, CI sonucuna
bakmadan gelen her push'u yayına alır. Gerçek kapı GitHub'da kurulur.

Settings > Rules > Rulesets > New branch ruleset:

| Ayar | Değer |
|---|---|
| Target branches | `main` |
| Require a pull request before merging | açık |
| Required approvals | 0 (tek kişilik ekip; onay değil, kapı amaçlanıyor) |
| Require status checks to pass | açık → `validate` (BTMEDYA PR Validation) |
| Require branches to be up to date | açık |
| Block force pushes | açık |

### Kalan: Workers Builds bağlantısını teyit

Panel > Workers & Pages > `btmedya-db` > Settings > Build:

- Repository: `BTmedyajans/Btmedya-db`
- Production branch: `main`
- Deploy command: `npx wrangler deploy`

Production branch `main` dışında bir şeyse bu daldaki değişiklikler canlıya
çıkmaz ve bu sessizce olur.

---

## 8. Geriye kalanlar

| # | İş | Kim | Engel |
|---|---|---|---|
| 1 | `btmedyaajans.com` satın al | hesap sahibi | — |
| 2 | Zone'u ekle, nameserver değiştir | hesap sahibi | #1 |
| 3 | Proxy'li DNS kaydı + Redirect Rule | hesap sahibi | #2 |
| 4 | GitHub dal koruması | hesap sahibi | — |
| 5 | Workers Builds production branch teyidi | hesap sahibi | — |
| 6 | Kod, denetim, CI, yinelenen içerik düzeltmesi | **yapıldı** | — |

1-5 hesap yetkisi gerektiriyor; bu oturumda o yetki yok. Bölüm 3'teki A/B
kararı verilmeden 1. adımı atmak yanlış olmaz, alan adı her iki durumda da
gerekli.
