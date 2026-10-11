/* BTMEDYA kategori sistemi v3 · 10 Ekim 2026 — TEK KAYNAK.

   Neden: kategori listesi dört-beş yerde ayrı ayrı yazılıydı (worker,
   haberler-akisi.js, Sabah Masası, kapak aracı, menü) ve sınıflandırma iki
   farklı algoritmayla yapılıyordu. Sunucu açık kategori adını önce, yerel
   sinyali sonra okurken site tersini yapıyordu; sunucu "pazar, belediye,
   ulaşım" gibi genel kelimeleri de Balıkesir sayıyordu (6 Ekim'de sitede
   düzeltilmiş, sunucuda kalmış hata). Aynı haber /haberler/ekonomi/ HTML'inde
   bir kategoride, JS ile çizilen listede başka kategoride görünebiliyordu.

   v3 modeli (ulusal yayıncı kurgusu):
   - ana       : haberin tek bölümü (kart etiketi, ana sayfa bloğu, kapak plakası)
   - ikincil   : haberin ayrıca listelendiği bölümler. Balıkesir'deki bir
                 ekonomi haberi Balıkesir bölümünde kalır, Ekonomi sayfasında da
                 görünür. Ana sayfa blokları yalnız ana bölümü kullanır;
                 böylece bir haber ana sayfada iki kez görünmez.
   - alt       : bölüm içi konu (ilçe adı ya da "Ekonomi · Emlak" yazımındaki
                 "Emlak"). Kategori sayfasındaki konu çipleri bundan üretilir.

   Sınıflandırma sırası, haber-portali-testi.mjs'teki kabul örnekleriyle
   sabittir: yer adı → açık kategori alanı → konu kuralları → Gündem.

   Bu dosyadan public/data/kategoriler.json üretilir (Python kapak aracı ve
   tarayıcı yedeği okur): node tools/kategori-sistemi.mjs --yaz
   CI aynı komutu --kontrol ile çalıştırır; dosyalar ayrışırsa PR kırmızıdır. */

export const KATEGORI_SURUMU = '2026-10-11.1';

export const KATEGORILER = [
  { anahtar: 'balikesir', ad: 'Balıkesir', renk: '#64e4ff', grup: 'yerel',
    ozet: 'Şehir ve ilçe gündemi',
    aciklama: 'Balıkesir merkez ve ilçelerinden güncel haberler, belediye hizmetleri, ulaşım, ekonomi ve kent yaşamı.' },
  { anahtar: 'turkiye', ad: 'Türkiye', renk: '#ffa24c', grup: 'haber',
    ozet: 'Ulusal gündem',
    aciklama: 'Türkiye genelindeki ulusal gündem, kamu, siyaset, toplum ve kentlerden gelişmeler.' },
  { anahtar: 'dunya', ad: 'Dünya', renk: '#9fb4ff', grup: 'haber',
    ozet: 'Uluslararası gelişmeler',
    aciklama: 'Dünyadan Türkiye’yi ve bölgeyi ilgilendiren gelişmeler, uluslararası gündem ve dış politika.' },
  { anahtar: 'gundem', ad: 'Gündem', renk: '#ff4038', grup: 'konu',
    ozet: 'Güncel olaylar ve kamu',
    aciklama: 'Güvenlik, afet, yangın, kamu hizmetleri ve Balıkesir gündemindeki önemli gelişmeleri kaynaklarıyla takip edin.' },
  { anahtar: 'ekonomi', ad: 'Ekonomi', renk: '#f2c14e', grup: 'konu',
    ozet: 'Para, piyasa ve iş dünyası',
    aciklama: 'Balıkesir ekonomisi, esnaf, tarım, fiyatlar, emlak, istihdam ve yerel iş dünyasındaki gelişmeler.' },
  { anahtar: 'kultur', ad: 'Kültür Sanat', renk: '#c77dff', grup: 'konu',
    ozet: 'Kültür, sanat ve etkinlik',
    aciklama: 'Balıkesir kültür sanat gündemi: tiyatro, sinema, gastronomi, etkinlikler ve kentin hafızasını yaşatan hikâyeler.' },
  { anahtar: 'egitim', ad: 'Eğitim', renk: '#50d6c8', grup: 'konu',
    ozet: 'Okul, üniversite ve sınav',
    aciklama: 'Okullar, üniversiteler, sınavlar ve öğrencilerin gündemindeki gelişmeleri BTMEDYA kaynaklarıyla izleyin.' },
  { anahtar: 'saglik', ad: 'Sağlık', renk: '#ff7a6b', grup: 'konu',
    ozet: 'Sağlık hizmetleri',
    aciklama: 'Sağlık hizmetleri, uzman görüşleri ve günlük yaşamı ilgilendiren sağlık gelişmelerini kaynaklarıyla takip edin.' },
  { anahtar: 'spor', ad: 'Spor', renk: '#65e6a4', grup: 'konu',
    ozet: 'Takımlar, maçlar ve sporcular',
    aciklama: 'Balıkesir ve Türkiye sporundan sonuçlar, takımlar, sporcular, karşılaşmalar ve etkinliklerden güncel haberler.' },
  { anahtar: 'teknoloji', ad: 'Teknoloji', renk: '#5ca8ff', grup: 'konu',
    ozet: 'Dijital dünya ve yapay zekâ',
    aciklama: 'Teknoloji, yapay zekâ, dijital dönüşüm ve yeni ürün ve hizmetleri anlaşılır haberler ve kaynaklarla takip edin.' },
  { anahtar: 'yasam', ad: 'Yaşam', renk: '#ff8fc7', grup: 'konu',
    ozet: 'Günlük yaşam ve insan hikâyeleri',
    aciklama: 'Günlük yaşam, aile, moda, etkinlik, insan hikâyeleri ve şehir yaşamına dair haberler.' }
];

export const KATEGORI_ANAHTARLARI = KATEGORILER.map(k => k.anahtar);
const KATEGORI_MAP = Object.fromEntries(KATEGORILER.map(k => [k.anahtar, k]));

export const BALIKESIR_ILCELERI = {
  altieylul: 'Altıeylül', karesi: 'Karesi', ayvalik: 'Ayvalık', balya: 'Balya', bandirma: 'Bandırma', bigadic: 'Bigadiç',
  burhaniye: 'Burhaniye', dursunbey: 'Dursunbey', edremit: 'Edremit', erdek: 'Erdek', gomec: 'Gömeç', gonen: 'Gönen',
  havran: 'Havran', ivrindi: 'İvrindi', kepsut: 'Kepsut', manyas: 'Manyas', marmara: 'Marmara', savastepe: 'Savaştepe',
  sindirgi: 'Sındırgı', susurluk: 'Susurluk'
};

/* Açık kategori alanındaki yazımlar. Panel, Sabah Masası ve eski arşiv farklı
   adlar yazdı ("Yerel", "Yapay Zekâ", "Kültür · Sanat"); hepsi tek anahtara iner. */
const ESLER = {
  balikesir: 'balikesir', yerel: 'balikesir',
  turkiye: 'turkiye', ulusal: 'turkiye',
  dunya: 'dunya', uluslararasi: 'dunya',
  gundem: 'gundem',
  ekonomi: 'ekonomi',
  kultur: 'kultur', 'kultur sanat': 'kultur',
  egitim: 'egitim',
  saglik: 'saglik',
  spor: 'spor',
  teknoloji: 'teknoloji', 'yapay zeka': 'teknoloji', 'teknoloji ai': 'teknoloji',
  yasam: 'yasam'
};

/* Yalnız yer adları. "pazar, belediye, ulaşım" gibi genel kelimeler başka
   şehrin belediyesini ya da "pazar günü"nü Balıkesir sayıyordu (6 Ekim).
   "marmara" bilerek yok: Marmara Bölgesi/Denizi haberlerini yerel sayardı. */
const YER = /\b(balikesir|altieylul|karesi|bandirma|edremit|ayvalik|burhaniye|gonen|susurluk|dursunbey|savastepe|bigadic|ivrindi|manyas|havran|gomec|erdek|balya|sindirgi|kepsut)\b/;

/* Konu kuralları; sıra anlamlıdır (ilk eşleşen kazanır). */
const KURALLAR = [
  ['teknoloji', /(yapay zeka|teknoloji|yazilim|dijital|\bai\b|teknofest|uygulama|platform)/],
  ['yasam', /(yasam|gundelik|aile|kadin|cocuk|magazin|moda|evlilik|dugun)/],
  ['dunya', /(dunya|abd|amerika|avrupa|almanya|fransa|ingiltere|rusya|ukrayna|israil|filistin|iran|cina|japonya|nato|birlesmis milletler|dis politika|uluslararasi)/],
  ['turkiye', /(turkiye|ankara|istanbul|izmir|adana|antalya|bursa|konya|meclis|bakanlik|cumhurbaskani|tbmm|yurt geneli|ulusal)/],
  ['egitim', /(egitim|universite|okul|sinav|ogrenci|kampus|\byok\b)/],
  ['saglik', /(saglik|beslenme|hastane|doktor|tedavi|epilasyon|obezite|kalp)/],
  ['spor', /(spor|futbol|basketbol|turnuva|atletizm|pehlivan|muay thai|sporcu)/],
  ['kultur', /(kultur|zanaat|sanat|gastronomi|turizm|insan hikayesi|moda|etkinlik|tiyatro|sinema|festival)/],
  ['ekonomi', /(ekonomi|emlak|esnaf|tarim|ticaret|fiyat|piyasa|maas|istihdam|satis|konut)/],
  ['gundem', /(gundem|asayis|yangin|afet|guvenlik|trafik|itfaiye|emniyet|polis|kaza|kamu)/]
];

/* Alt konu olarak gösterilmeyen biçim sözcükleri. */
const BICIM = new Set(['video', 'foto', 'galeri', 'haber']);

export function kategoriNormal(s) {
  return String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

export function kategoriBul(anahtar) {
  return KATEGORI_MAP[anahtar] || null;
}

export function kategoriAdi(anahtar) {
  return KATEGORI_MAP[anahtar]?.ad || '';
}

function haberMetni(n) {
  const govde = Array.isArray(n?.body) ? n.body.slice(0, 2).join(' ') : '';
  return kategoriNormal([n?.category, n?.title, n?.excerpt, govde].filter(Boolean).join(' '));
}

function parcalar(category) {
  return String(category || '').split('·').map(p => p.trim()).filter(Boolean);
}

/* Yer adı dışındaki konu: önce açık kategori alanı, sonra kurallar. */
function konuBul(category, metin) {
  const acik = ESLER[kategoriNormal(parcalar(category)[0] || '')];
  if (acik) return acik;
  for (const [anahtar, re] of KURALLAR) if (re.test(metin)) return anahtar;
  return '';
}

function ilceBul(metin) {
  for (const [anahtar, ad] of Object.entries(BALIKESIR_ILCELERI)) {
    if (anahtar === 'marmara') continue;
    if (new RegExp('\\b' + anahtar + '\\b').test(metin)) return { anahtar, ad };
  }
  return null;
}

/* Ulusal / yabancı işaretleri (11 Ekim). Türkiye ve Dünya bölümleri yalnız
   ana kategori olarak doluyordu ve hiçbir haber ana bölüm olarak
   "Türkiye" almadığı için /haberler/turkiye/ 0 haberdi. Yerel olmayan haber,
   konu bölümünde kalır; ayrıca Türkiye işareti taşıyorsa Türkiye, yalnız
   yabancı işaret taşıyorsa Dünya bölümünde de listelenir. İşaret yoksa
   (ör. yabancı şirketin teknoloji haberi, ülke adı geçmiyorsa) eklenmez. */
const ULUSAL = /\b(turkiye|turk|turkler|tbmm|cumhurbaskan\w*|bakan\w*|valilik|valiligi|valisi|belediye\w*|mudurlugu|tuik|osym|yuksekogretim|meb|diyanet|sgk|toki|tigem|teknofest|odtu|trt|aselsan|tusas|bayraktar|tubitak|super lig|galatasaray|fenerbahce|besiktas|trabzonspor|a milli|milli takim|milliler|tcmb|merkez bankasi|bist|borsa istanbul|thy|turk hava yollari|anayasa mahkemesi|meteoroloji|ak parti|chp|mhp|dmm|dezenformasyonla mucadele|adana|adiyaman|afyon|afyonkarahisar|amasya|ankara|antalya|artvin|aydin|bilecik|bingol|bitlis|bolu|burdur|bursa|canakkale|cankiri|corum|denizli|diyarbakir|edirne|elazig|erzincan|erzurum|eskisehir|gaziantep|giresun|gumushane|hakkari|hatay|isparta|mersin|istanbul|izmir|kars|kastamonu|kayseri|kirklareli|kirsehir|kocaeli|konya|kutahya|malatya|manisa|kahramanmaras|mardin|mugla|mus|nevsehir|nigde|ordu|rize|sakarya|samsun|siirt|sinop|sivas|tekirdag|tokat|trabzon|tunceli|sanliurfa|usak|van|yozgat|zonguldak|aksaray|bayburt|karaman|kirikkale|batman|sirnak|bartin|ardahan|igdir|yalova|karabuk|kilis|osmaniye|duzce|kadikoy|uskudar|umraniye|buyukcekmece|galata|beyoglu|bodrum|kumluca|adrasan|gokceada|bozcaada|kapadokya)\b/;
const YABANCI = /\b(abd|amerika|avustralya|kanada|cin|kazakistan|ingiltere|fransa|almanya|italya|ispanya|rusya|ukrayna|israil|filistin|gazze|iran|japonya|kore|hindistan|brezilya|bm|birlesmis milletler|avrupa birligi|nato|premier lig|manchester|barcelona|real madrid|bayern|trump|beyaz saray|google|openai|meta|anthropic|microsoft|apple|nvidia|spacex|bnp paribas|bloombergnef|penn state)\b/;

/* Haberin kategori kimliği. Girdi: {category,title,excerpt,body?}. */
export function kategoriCoz(n) {
  const metin = haberMetni(n);
  const yerel = YER.test(metin);
  const konu = konuBul(n?.category, metin);
  const ana = yerel ? 'balikesir' : (konu || 'gundem');
  const ikincil = [];
  if (konu && konu !== ana) ikincil.push(konu);
  if (!yerel && ana !== 'turkiye' && ana !== 'dunya') {
    if (ULUSAL.test(metin)) ikincil.push('turkiye');
    else if (YABANCI.test(metin) && !ikincil.includes('dunya')) ikincil.push('dunya');
  }

  let alt = '';
  const ilce = yerel ? ilceBul(metin) : null;
  if (ilce) alt = ilce.ad;
  else {
    for (const p of parcalar(n?.category).slice(1)) {
      const pn = kategoriNormal(p);
      if (!pn || BICIM.has(pn) || ESLER[pn]) continue;
      alt = p.charAt(0).toLocaleUpperCase('tr-TR') + p.slice(1);
      break;
    }
  }
  return { ana, ad: kategoriAdi(ana), ikincil, alt, ilce: ilce ? ilce.anahtar : '' };
}

/* Geriye uyumlu tek anahtar (eski haberKategoriAnahtari). */
export function kategoriAnahtari(n) {
  return kategoriCoz(n).ana;
}

/* Bir haber bu bölümün listesinde yer alır mı (ana ya da ikincil)? */
export function kategoridenMi(n, anahtar, coz = kategoriCoz(n)) {
  return coz.ana === anahtar || coz.ikincil.includes(anahtar);
}

/* API ve istemci için haber üstüne eklenen alanlar. */
export function kategoriAlanlari(n) {
  const c = kategoriCoz(n);
  return { kategori_anahtari: c.ana, kategori_adi: c.ad, kategori_ikincil: c.ikincil, kategori_alt: c.alt };
}

/* public/data/kategoriler.json içeriği (Python ve tarayıcı yedeği). */
export function kategoriVerisi() {
  return {
    surum: KATEGORI_SURUMU,
    kaynak: 'src/kategori-sistemi.js',
    kategoriler: KATEGORILER.map(k => ({ ...k, adres: '/haberler/' + k.anahtar + '/' })),
    ilceler: Object.entries(BALIKESIR_ILCELERI).map(([anahtar, ad]) => ({ anahtar, ad, adres: '/haberler/balikesir/' + anahtar + '/' })),
    esler: ESLER
  };
}
