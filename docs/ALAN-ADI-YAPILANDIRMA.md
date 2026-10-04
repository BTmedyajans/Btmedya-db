# Alan Adı Yapılandırması — btmedya.com.tr ve btmedyaajans.com

GitHub ve Cloudflare tarafında iki alan adının nasıl kurulduğu, ne durumda
olduğu ve geriye ne kaldığı.

**Ölçüm tarihi: 4 Ekim 2026.** Aşağıdaki "mevcut durum" tablosu tahmin değil,
o gün yapılan sorguların sonucudur. Alan adı ve DNS durumu değişebilir;
komutlar her bölümün altında, yeniden ölçmek için duruyor.

---

## 1. Mevcut durum (ölçülmüş)

| Adres | Ölçüm | Sonuç |
|---|---|---|
| `btmedya.com.tr` | HTTP | **200** — canlı, Cloudflare üzerinden servis ediliyor |
| `www.btmedya.com.tr` | HTTP | **301** → `https://btmedya.com.tr/` — doğru çalışıyor |
| `btmedyaajans.com` | DNS | **Kayıt yok** — hiçbir adrese çözülmüyor |
| `btmedyaajans.com` | Registry (Verisign RDAP) | **404 — alan adı TESCİLLİ DEĞİL** |
| Cloudflare Workers | Hesapta | Tek Worker: `btmedya-db` (oluşturma 6 Eylül 2026) |

### Kritik bulgu

**`btmedyaajans.com` henüz satın alınmamış.** `.com` kayıtlarının yetkili
kaynağı olan Verisign RDAP servisi bu alan adı için 404 dönüyor; aynı sorgu
tescilli bir alan adı için (`example.com`) 200 dönüyor, yani sorgu yolu
çalışıyor. Alan adı tescilli olsaydı 200 ve tescil bilgisi dönerdi.

Sonuç: `btmedyaajans.com` için Cloudflare tarafında yapılacak hiçbir işlem
yok, çünkü yapılandırılacak bir alan adı yok. **Önce satın alınması gerekiyor.**
Bu, kod tarafında yapılabilecekleri engellemiyor; depo o alan adı bağlandığı
anda çalışacak şekilde hazırlandı (bkz. bölüm 3).

```bash
# Yeniden ölçmek için:
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://btmedya.com.tr/
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.btmedya.com.tr/
getent hosts btmedyaajans.com || echo "DNS kaydı yok"
curl -sL -o /dev/null -w "registry: %{http_code}\n" \
  https://rdap.verisign.com/com/v1/domain/btmedyaajans.com   # 404 = tescilli değil
```

---

## 2. Karar: ikinci alan adı ne yapacak?

İki seçenek var ve bu bir strateji kararı, teknik bir karar değil.

| | A — 301 yönlendirme *(varsayılan)* | B — ayrı ajans sitesi |
|---|---|---|
| `btmedyaajans.com` | `btmedya.com.tr`'ye 301 | Kendi içeriğiyle yayın |
| Arama motoru | Tek güçlü adres | İki adres, sinyal bölünür |
| İçerik yükü | Yok | Ayrı içerik üretimi şart |
| Maliyet | Yalnızca alan adı | Alan adı + içerik + bakım |

**Bu paket A seçeneğine göre kuruldu.** Gerekçe: aynı içeriği iki adreste
yayınlamak yinelenen içeriktir; arama motoru hangisini göstereceğini kendi
seçer ve iki adres birbirinin sinyalini böler. `btmedya.com.tr` zaten
indekslenmiş ve haber arşivi orada.

**Bu bir varsayım.** B isteniyorsa — haber markası `btmedya.com.tr`'de, ajans
tanıtımı `btmedyaajans.com`'da gibi gerçek bir ayrım kurulacaksa — söyleyin;
A'dan B'ye geçiş, bölüm 3'teki tablodan tek satır çıkarmak ve ikinci bir
Worker kurmaktır, zor değil. Ama o zaman ajans sitesinin içeriği de
üretilmelidir; boş bir ikinci site A'dan kötüdür.

---

## 3. Kod tarafı — yapıldı

Alan adı satın alınmadan da yapılabilecek her şey bu dalda tamamlandı.

| Dosya | Değişiklik |
|---|---|
| `src/worker.js` | `KANONIK_HOST` / `IKINCIL_HOSTLAR` tablosu + `kanonikHedef()` |
| `wrangler.toml` | İkincil alan adının neden buraya bağlanmadığının gerekçesi |
| `tools/dogrula.mjs` | 6 yapılandırma kontrolü (yeni) |
| `.github/workflows/dogrulama.yml` | Kontrolleri her PR'da çalıştırır (yeni) |
| `public/robots.txt` | `/social-studio/` indekslemeye kapatıldı |

### Yönlendirme tablosu

`src/worker.js` içinde, tek kaynak:

```js
const KANONIK_HOST = 'btmedya.com.tr';
const IKINCIL_HOSTLAR = new Set(['btmedyaajans.com']);
```

Davranışı doğrulandı (`node tools/dogrula.mjs`, kontrol 6):

| Gelen host | Sonuç |
|---|---|
| `btmedya.com.tr` | yönlendirme yok |
| `www.btmedya.com.tr` | 301 → `btmedya.com.tr` |
| `btmedyaajans.com` | 301 → `btmedya.com.tr` |
| `www.btmedyaajans.com` | 301 → `btmedya.com.tr` — **tek adımda**, zincir yok |
| `BTMedyaAjans.COM` | 301 → `btmedya.com.tr` (büyük/küçük harf farketmez) |
| `btmedya-db.*.workers.dev` | yönlendirme yok (önizleme adresi korunur) |

Yol ve sorgu dizesi korunur: `btmedyaajans.com/haberler/x` → `btmedya.com.tr/haberler/x`.
Böylece ikincil adrese verilmiş bir bağlantı anasayfaya değil kendi sayfasına düşer.

**Bu kodun sınırı:** Worker yalnızca `wrangler.toml > run_worker_first`
listesindeki yollarda çalışır. Kapsam dışı bir yol ikincil adreste istenirse
Worker hiç devreye girmez. Bu yüzden kod tek başına yeterli değil; asıl çözüm
bölüm 5'teki Redirect Rule.

### Doğrulama kontrolleri

`node tools/dogrula.mjs` — altı kontrol, hepsi AGENTS.md'de yazılı gerçek
tuzaklara karşılık geliyor:

1. **Tek kanonik adres** — sitemap, robots.txt ve sayfa içi `canonical`
   etiketleri aynı hostu gösteriyor mu.
2. **`run_worker_first` kapsamı** — sitemap'teki her yol kapsamda mı. Kapsam
   dışı bir sayfa hem `www` hem apex adresinde 200 döner (yinelenen içerik);
   bu hata bu depoda daha önce gerçekten yaşandı.
3. **CSP** — kapsanan sayfalarda nonce'suz satır içi `<script>` ya da `onclick`
   var mı. Böyle bir kod konsolda hata bile vermeden çalışmaz.
   `application/ld+json` hariç: tarayıcı onu çalıştırmaz, CSP engellemez.
4. **Migration numaraları** — tekrar ve boşluk kontrolü.
5. **`routes` kapalı mı** — açılırsa wrangler paneldeki Custom Domain
   bağlantılarını ezer.
6. **Yönlendirme tablosu** — `kanonikHedef` kaynaktan çıkarılıp 6 host vakasıyla
   sürülür. Kopya tutulmaz; test ettiği şey gerçek koddur.

Her kontrol kasıtlı hata enjekte edilerek sürüldü; altısı da yakaladı.

---

## 4. GitHub tarafı

### Yapıldı

`.github/workflows/dogrulama.yml` — her pull request'te ve main'e her push'ta:
JavaScript sözdizimi, altı yapılandırma kontrolü, `public/` altına backend
dosyası sızmadığı kontrolü. npm kullanılmaz, bağımlılık kurulmaz
(AGENTS.md > Kod stili).

### Kalan: dal koruması (panelden, 2 dakika)

**Bu önemli.** `main` dalına push, Cloudflare Workers Builds üzerinden
doğrudan canlı siteyi günceller. CI tek başına bunu engelleyemez: Workers
Builds, CI sonucuna bakmadan gelen her push'u yayına alır. Gerçek kapı
GitHub'da kurulur.

Settings > Branches > Add branch ruleset:

| Ayar | Değer |
|---|---|
| Target branches | `main` |
| Require a pull request before merging | Açık |
| Required approvals | 0 (tek kişilik ekip; onay değil, kapı amaçlanıyor) |
| Require status checks to pass | Açık → `dogrula` seçili |
| Require branches to be up to date | Açık |
| Block force pushes | Açık |

Bundan sonra doğrulamadan geçmeyen bir değişiklik canlıya çıkamaz.

### Kalan: Workers Builds bağlantısını teyit

Cloudflare paneli > Workers & Pages > `btmedya-db` > Settings > Build:

- Repository: `BTmedyajans/Btmedya-Ajans`
- Production branch: `main`
- Build command: boş (derleme adımı yok)
- Deploy command: `npx wrangler deploy`

Production branch `main` dışında bir şeyse, bu daldaki değişiklikler canlıya
çıkmaz ve bu sessizce olur.

---

## 5. Cloudflare tarafı — btmedyaajans.com satın alındıktan sonra

Sıra önemli. Her adımda ne beklendiği yazılı; beklenen çıkmazsa sonraki adıma
geçmeyin.

### Adım 1 — Alan adını satın al

`btmedyaajans.com` bir `.com`, yani kısıtsız: herhangi bir kayıt kuruluşundan
alınabilir, belge istenmez. (Karşılaştırma: `btmedya.com.tr` bir `.com.tr` ve
tescil belgesi gerektirir — o zaten alınmış.)

Cloudflare Registrar'dan almak işi kolaylaştırır: alan adı doğrudan hesaba
düşer, nameserver adımı atlanır. Başka bir kayıt kuruluşundan alınırsa adım 2
gerekir.

### Adım 2 — Zone'u Cloudflare'e ekle

Cloudflare paneli > Add a site > `btmedyaajans.com` > Free plan.

Cloudflare iki nameserver verir. Kayıt kuruluşunun panelinde alan adının
nameserver'larını bunlarla değiştirin.

```bash
# Yayılmayı bekleyin (dakikalar, bazen saatler):
curl -s "https://dns.google/resolve?name=btmedyaajans.com&type=NS" | python3 -m json.tool
```

Cloudflare'in nameserver'ları görünene kadar devam etmeyin. Zone "Active"
olmadan Redirect Rule çalışmaz.

### Adım 3 — DNS kaydı (yönlendirme için yer tutucu)

Yönlendirme için gerçek bir sunucuya ihtiyaç yok, ama Cloudflare'in isteği
karşılayabilmesi için **proxy açık** bir kayıt şart. Standart yöntem,
yönlendirme amaçlı ayrılmış bir adrese proxy'li kayıt açmaktır:

| Tip | Ad | İçerik | Proxy |
|---|---|---|---|
| `AAAA` | `@` | `100::` | **Turuncu bulut (açık)** |
| `AAAA` | `www` | `100::` | **Turuncu bulut (açık)** |

`100::` IPv6 "discard" adresidir: hiçbir yere gitmez. IPv4 tercih edilirse
karşılığı `A` kaydıyla `192.0.2.0`. İkisi de Cloudflare'in origin'siz kurulum
için ayırdığı yer tutucu adreslerdir; gerçek bir sunucuya işaret etmemeleri
kasıtlıdır, yoksa sahibi olmadığınız bir altyapıya trafik gidebilir.

Proxy açık olduğu için istek hiç oraya ulaşmaz; Cloudflare kendi kenarında
Redirect Rule ile karşılar. Proxy kapalı (gri bulut) olursa istek gerçekten
`100::`'e gider ve site açılmaz — **bu adımda en sık yapılan hata budur.**
Cloudflare'in kendi ifadesiyle: Redirect Rule'un uygulanabilmesi için
yönlendirilen host'un proxy'li bir DNS kaydı olması şarttır.

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
| Preserve query string | **Açık** |

"All incoming requests" seçilir çünkü bu zone'da yönlendirilmeyecek hiçbir
adres yok; tüm alan adı tek hedefe gidiyor. Host'a göre filtre gereksiz.

`www` için ayrı kural gerekmez: her iki DNS kaydı da aynı zone'da, kural ikisini
de karşılar ve **tek adımda** `btmedya.com.tr`'ye gönderir. Zincir oluşmaz.

### Adım 5 — Doğrula

```bash
for h in btmedyaajans.com www.btmedyaajans.com; do
  echo "=== $h ==="
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://$h/"
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://$h/haberler/"
done
```

Beklenen: dördünde de **301**, hedefler sırasıyla `https://btmedya.com.tr/` ve
`https://btmedya.com.tr/haberler/`. Yol korunmuyorsa Expression yanlış; 200
dönüyorsa DNS proxy'si kapalı (adım 3).

Son olarak zincir olmadığını teyit edin:

```bash
curl -sIL --max-time 15 https://www.btmedyaajans.com/ | grep -i "^HTTP/\|^location:"
```

Beklenen: tek bir `301` satırı ve ardından `200`. İki `301` üst üste görünürse
zincir var; sebebi genellikle `www` için ayrıca eklenmiş gereksiz bir kuraldır.

### Adım 6 — SSL

Zone > SSL/TLS > Overview > **Full (strict)**. Edge Certificates altında
"Always Use HTTPS" açık olmalı. Yeni zone'da sertifika birkaç dakikada çıkar;
çıkmadan önce `https://` isteklerinde sertifika hatası görülebilir, bu normaldir.

---

## 6. btmedya.com.tr — bakım notları

Bu alan adı çalışıyor; aşağıdakiler sadece bilinsin diye.

**`www` yönlendirmesi Worker'a bağlı.** `www.btmedya.com.tr` → apex 301'i
`src/worker.js` içinde ve yalnızca `run_worker_first` kapsamındaki yollarda
çalışıyor. Görseller, `styles.css`, `script.js` ve `/assets/*` bu listede yok;
onlar `www` üzerinden de 200 döner. Arama motoru açısından sorun değil
(indekslenen sayfalar değil, varlıklar), ama alan adı genelinde kesin çözüm
isteniyorsa aynı Redirect Rule bu zone'a da eklenebilir:

| Alan | Değer |
|---|---|
| Expression (When) | `http.host eq "www.btmedya.com.tr"` |
| Expression (Then) | `concat("https://btmedya.com.tr", http.request.uri.path)` |
| Status | 301, Preserve query string açık |

Bu kural Worker'dan önce çalışır, hiç Worker çağrısı üretmez ve `run_worker_first`
listesine bağımlı olmaz. Eklenirse `src/worker.js`'teki yönlendirme ölü koda
dönüşmez, yedek olarak kalır.

**Yeni üst düzey sayfa eklerken** `wrangler.toml > run_worker_first` listesini
de güncelleyin. Unutulursa o sayfa hem `www` hem apex adresinde 200 döner.
`node tools/dogrula.mjs` bunu yakalar — sayfa sitemap'e eklendiği sürece.

---

## 7. Secret'lar

Kod tarafında secret değişikliği yok. Hatırlatma olarak, `/admin/` panelinin ve
imzalı medya bağlantılarının çalışması için üçü zorunlu:

| Secret | Ne için |
|---|---|
| `ADMIN_PASSWORD` | `/admin/` giriş şifresi |
| `ADMIN_SESSION_SECRET` | Oturum çerezi imzalama |
| `MEDIA_SIGNING_SECRET` | `/media/` imzalı bağlantı |

Panelden: Workers & Pages > `btmedya-db` > Settings > Variables and Secrets.
Ya da `npx wrangler secret put <AD>`. Ayrıntı: `docs/CANLIYA-ALMA.md`.

---

## 8. Geriye kalanlar — özet

| # | İş | Kim | Engel |
|---|---|---|---|
| 1 | `btmedyaajans.com` satın al | Siz | — |
| 2 | Zone'u Cloudflare'e ekle, nameserver değiştir | Siz | #1 |
| 3 | Proxy'li DNS kaydı + Redirect Rule | Siz | #2 |
| 4 | GitHub dal koruması (ruleset) | Siz | — |
| 5 | Workers Builds production branch teyidi | Siz | — |
| 6 | Kod + CI + doğrulama | **Yapıldı** | — |

1, 2, 3 ve 4 hesap yetkisi gerektiriyor; bu oturumda o yetki yok. 5 bir
okuma kontrolü ama panelde yapılıyor.

A yerine B isteniyorsa (ayrı ajans sitesi) bölüm 2'ye dönün; o karar verilmeden
1. adımı atmak yanlış olmaz, alan adı her iki durumda da gerekli.
