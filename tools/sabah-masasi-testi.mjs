// Sabah Masası birim testi: ağ ve yapay zekâ gerektirmeyen denetimler.
// Çalıştır: node tools/sabah-masasi-testi.mjs
import * as M from '../src/sabah-masasi.js';
import assert from 'node:assert/strict';

// Rakam denetimi: binlik ve ondalık yazımlar eşleşir, kaynakta olmayan sayı yakalanır.
assert.equal(M.rakamDenetimi('179.779 başvuru, yüzde 24', 'bu yıl 179 bin 779 başvuru; 179.779; yüzde 24').gecti, true);
assert.deepEqual(M.rakamDenetimi('1.284 poliklinik ve 999 kişi', '1284 yeni poliklinik').eksik, ['999']);
assert.equal(M.rakamDenetimi('yüzde 18,9', 'yüzde 18,9 oranında').gecti, true);

// Özel ad denetimi: kaynakta geçmeyen ad yayını durdurur.
assert.equal(M.adDenetimi("Barış Alper Yılmaz golü attı. Bursa'da oynandı.", 'barış alper yılmaz bursa').gecti, true);
assert.deepEqual(M.adDenetimi('Mehmet Kaya konuştu.', 'başka bir metin').eksik, ['Mehmet', 'Kaya']);

// Hassas konular otomatik akışa girmez.
assert.equal(M.hassasMi('CHP il başkanı istifa etti'), true);
assert.equal(M.hassasMi('Şüpheliler gözaltına alındı'), true);
assert.equal(M.hassasMi('Sigara bırakma polikliniklerine başvuru arttı'), false);

// Trend puanı: güncel ve trendle eşleşen haber önde; genel kelimeler sayılmaz.
const w = M.trendAgirliklari([{ sorgu: 'türkiye italya', trafik: 50000, basliklar: ['Türkiye İtalya maç sonucu'] }]);
const simdi = Date.parse('2026-09-29T08:00:00Z');
const a = M.puanla({ baslik: 'İtalya maçında tribünden tepki', ozet: '', tarih: 'Mon, 28 Sep 2026 21:00:00 +0300' }, w, simdi);
const b = M.puanla({ baslik: "Türkiye'nin ilk tarama gemisi", ozet: '', tarih: 'Mon, 28 Sep 2026 21:00:00 +0300' }, w, simdi);
assert.ok(a.puan > b.puan, 'trend eşleşmesi öne geçmeli');
assert.ok(!b.eslesen.includes('turkiye'), '"türkiye" genel kelime sayılmalı');

assert.equal(M.slugUret("Türkiye, İtalya'ya 1-4 yenildi"), 'turkiye-italya-ya-1-4-yenildi');

// Ölüm/yaralanma haberleri otomatik akışa girmez; "olumlu" gibi kelimeler takılmaz.
assert.equal(M.hassasMi('Kazada 2 kişi hayatını kaybetti'), true);
assert.equal(M.hassasMi('Yaralılar hastaneye kaldırıldı'), true);
assert.equal(M.hassasMi('Görüşmeler olumlu geçti, olumsuz hava etkisini yitirdi'), false);

// Yanıt biçimleri: eski { response }, Chat Completions ve Responses.
assert.equal(M.yanitMetni({ response: '{"a":1}' }), '{"a":1}');
assert.equal(M.yanitMetni({ choices: [{ message: { content: 'x' } }] }), 'x');
assert.equal(M.yanitMetni({ output: [{ type: 'reasoning', content: [{ text: 'düşünce' }] }, { type: 'message', content: [{ type: 'output_text', text: 'metin' }] }] }), 'metin');
assert.deepEqual(M.jsonAyikla('```json\n{"baslik":"x"}\n```'), { baslik: 'x' });
assert.equal(M.jsonAyikla('yanıt yok'), null);

// Kalite denetimi: llama denemesindeki kusurlar yakalanır, düzgün haber geçer.
const iyi = {
  baslik: "Balıkesir'de tarım fuarı dört günde 108 bin ziyaretçiyi ağırladı",
  spot: "Ali Hikmet Paşa Tesisleri'nde düzenlenen 3. Balıkesir Tarım ve Hayvancılık Fuarı, belediye verilerine göre dört günde 108 bin 321 kişiyi ağırladı.",
  paragraflar: [
    'Balıkesir Büyükşehir Belediyesi tarafından düzenlenen fuar 24-27 Eylül tarihleri arasında kapılarını açtı ve bölgenin üreticilerini bir araya getirdi.',
    'Belediyenin açıkladığı verilere göre dört gün boyunca 108 bin 321 kişi fuarı gezdi; alanda 135 firma ve 350 marka yer aldı.',
    'Fransa ve Bulgaristan’dan sektör temsilcileri ile Sierra Leone’den alıcılar da fuara katılarak üreticilerle görüştü.',
    'Organizasyon, tarım makinelerinden hayvancılık ekipmanlarına kadar geniş bir ürün yelpazesini ziyaretçilerle buluşturdu.',
    'Fuar süresince üreticiler yeni ürünlerini tanıttı, ziyaretçiler de makineleri yakından inceleme fırsatı buldu. Belediye, fuarın önümüzdeki yıl da aynı alanda düzenlenmesini planlıyor.'
  ]
};
const kq = M.kaliteDenetimi(iyi, 'tamamen farklı bir kaynak metni');
assert.equal(kq.gecti, true, kq.sorun.join('; '));
assert.equal(M.kaliteDenetimi({ ...iyi, baslik: 'Okula Uyumu' }).gecti, false);
assert.ok(M.kaliteDenetimi({ ...iyi, baslik: 'Balıkesir Tarım Ve Hayvancılık Fuarı Dört Günde Büyük İlgi Gördü' }).sorun.some(x => x.includes('Her Kelimesi')));
assert.ok(M.kaliteDenetimi({ ...iyi, paragraflar: iyi.paragraflar.slice(0, 2) }).sorun.some(x => x.includes('3 paragraf')));
assert.ok(M.kaliteDenetimi(iyi, iyi.paragraflar.join(' ')).sorun.some(x => x.includes('aynen')), 'kaynaktan kopya yakalanmalı');

// Canlı denemeden: doğru skor eki geçer, yanlışı yakalanır.
assert.equal(M.skorEkiHatasi("İtalya'ya 4-1'lik mağlubiyet"), '');
assert.equal(M.skorEkiHatasi("2-0'lık galibiyet, 3-9'luk seri"), '');
assert.ok(M.skorEkiHatasi("4-1'lık mağlubiyet").includes("4-1'lik"));
// Cümle başındaki sıradan sözcük ad sayılmaz; çok sözcüklü ad yine denetlenir.
assert.equal(M.adDenetimi('Aynı grup içinde oran arttı. Maçta gösterilen performans zayıftı.', 'grup oran performans').gecti, true);
assert.deepEqual(M.adDenetimi('Toplantıda Ayşe Demir konuştu.', 'toplantida konustu').eksik, ['Ayşe', 'Demir']);
assert.deepEqual(M.adDenetimi("Konya'da fuar açıldı.", 'fuar acildi').eksik, ["Konya'da"]);
// Gövdede tekrar eden ifade (canlı Gündem taslağı).
assert.ok(M.tekrarEdenIfade([
  'Rüzgar kuzeyli yönlerden orta, yağışla birlikte zaman zaman 40-60 km/saat hızla esecek.',
  'Rüzgarın, kuzeyli yönlerden orta, yağışla birlikte zaman zaman 40-60 km/saat hızla eseceği tahmin ediliyor.'
]));
assert.equal(M.tekrarEdenIfade(iyi.paragraflar), '');

// Yazım: denetimden kalan ilk taslak, sorunlar geri verilerek yeniden yazdırılır.
// Kaynak aynı bilgileri farklı sözcük sırasıyla taşır: taslak kopya sayılmasın.
const kaynak = { baslik: 'Fuar', tarih: '', kaynakAd: 'Balıkesir Büyükşehir Belediyesi', metin: [iyi.spot, ...iyi.paragraflar].map(p => p.split(' ').reverse().join(' ')).join('\n') };
const cagrilar = [], dogrulamalar = [];
const env = { AI: { run: async (model, girdi) => {
  // Doğrulayıcı çağrısı ayrı sayılır: yazım denemeleri cagrilar'da kalır.
  if (girdi.messages[0].content === M.DOGRULAMA_YONERGESI) { dogrulamalar.push(girdi); return { response: '{"desteksiz":[]}' }; }
  cagrilar.push({ model, n: girdi.messages.length });
  if (cagrilar.length === 1) return { choices: [{ message: { content: JSON.stringify({ baslik: 'Okula Uyumu', spot: 'kısa', paragraflar: ['çok kısa bir paragraf burada duruyor.'] }) } }] };
  return { response: JSON.stringify({ ...iyi, paragraflar: iyi.paragraflar, gorsel_anahtar: 'agricultural fair' }) };
} } };
const y = await M.yaz(env, { model: '@cf/openai/gpt-oss-120b' }, kaynak, 'Yerel');
assert.equal(cagrilar.length, 2, 'ikinci deneme yapılmalı');
assert.ok(cagrilar[1].n > cagrilar[0].n, 'sorunlar modele geri verilmeli');
assert.equal(y.deneme, 2);
assert.equal(y.baslik, iyi.baslik);
assert.equal(y.denetim.rakam.gecti, true, y.denetim.rakam.eksik.join(','));
assert.equal(dogrulamalar.length, 1, 'yalnız deterministik denetimden geçen taslak doğrulanmalı');
assert.equal(y.denetim.iddia.gecti, true);

// İddia doğrulaması (6 Ekim, Fenerbahçe/Ethan Mbappe): ad kaynakta geçtiği
// için ad denetimi ilişki hatasını göremez; doğrulayıcı yakalar, taslak
// sorunla birlikte yeniden yazdırılır.
{
  const mbKaynak = "Real Madrid'in dünyaca ünlü Fransız yıldızı Kylian Mbappe'nin kardeşi olan 19 yaşındaki futbolcu Ethan Mbappe, Lille formasını giyiyor. Futbola PSG alt yapısında başlayan Mbappe, 2024 yazında bedelsiz olarak Lille'e transfer olmuştu.";
  const yanlis = 'Ethan Mbappe, 19 yaşında ve Real Madrid altyapısında futbol hayatına başlayan bir oyuncu.';
  assert.equal(M.adDenetimi(yanlis, mbKaynak).gecti, true, 'ad denetimi bu hatayı tek başına göremez (doğrulayıcının gerekçesi)');
  const dogru = 'Ethan Mbappe, 19 yaşında ve PSG altyapısında futbol hayatına başlayan bir oyuncu.';
  const taslak = p => ({ ...iyi, paragraflar: [p + ' ' + iyi.paragraflar[0], ...iyi.paragraflar.slice(1)], gorsel_anahtar: 'football pitch' });
  const yazimlar = [], dogrulama = [];
  const e2 = { AI: { run: async (model, girdi) => {
    if (girdi.messages[0].content === M.DOGRULAMA_YONERGESI) {
      dogrulama.push(girdi.messages[1].content);
      const ilk = dogrulama.length === 1;
      return { response: JSON.stringify({ desteksiz: ilk ? [{ ifade: 'Real Madrid altyapısında', neden: 'kaynakta altyapı PSG; Real Madrid ağabeyin kulübü' }] : [] }) };
    }
    yazimlar.push(girdi.messages);
    return { response: JSON.stringify(taslak(yazimlar.length === 1 ? yanlis : dogru)) };
  } } };
  const k = { baslik: 'Fuar', tarih: '', kaynakAd: '', metin: kaynak.metin + '\n' + mbKaynak };
  const y2 = await M.yaz(e2, { model: '@cf/openai/gpt-oss-120b' }, k, 'Spor');
  assert.equal(yazimlar.length, 2, 'desteksiz ifade yeniden yazdırmalı');
  assert.match(yazimlar[1].at(-1).content, /kaynakla desteklenmeyen ifade: "Real Madrid altyapısında"/);
  assert.ok(dogrulama[0].includes('KAYNAK METİN') && dogrulama[0].includes(yanlis), 'doğrulayıcı kaynağı ve taslağı birlikte görmeli');
  assert.equal(y2.denetim.iddia.gecti, true);
  assert.ok(y2.paragraflar[0].includes('PSG'));

  // Doğrulayıcı hata verirse ya da biçimsiz yanıt dönerse haber geçmiş sayılmaz.
  const e3 = { AI: { run: async (model, girdi) => {
    if (girdi.messages[0].content === M.DOGRULAMA_YONERGESI) throw new Error('3040 model kapasitesi');
    return { response: JSON.stringify(taslak(dogru)) };
  } } };
  const y3 = await M.yaz(e3, { model: '@cf/openai/gpt-oss-120b' }, k, 'Spor');
  assert.equal(y3.denetim.iddia.gecti, false);
  assert.match(y3.denetim.iddia.hata, /doğrulayıcı çalışmadı/);
  const bicimsiz = await M.iddiaDenetimi({ AI: { run: async () => ({ response: 'Sorun yok.' }) } }, 'm', taslak(dogru), mbKaynak);
  assert.equal(bicimsiz.gecti, false);
  // Yayın kararı doğrulamayı da şart koşar.
  const src = (await import('node:fs')).readFileSync(new URL('../src/sabah-masasi.js', import.meta.url), 'utf8');
  assert.match(src, /const denetimTamam = [^;]*iddia\.gecti/, 'yayın kararı iddia doğrulamasını içermeli');
}

// Model ayarlarda saklansa bile koddaki model kullanılır; boş kategori listesi "hepsi" demektir.
const kv = new Map([['sabah:ayarlar', JSON.stringify({ model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', kategoriler: [] })]]);
const ayar = await M.sabahAyarlari({ KV: { get: async k => kv.get(k) || null } });
assert.equal(ayar.model, '@cf/openai/gpt-oss-120b');
// 6 Ekim: Dünya ve Yaşam eklendi (ulusal haber sitesi bölümleri).
// 10 Ekim: Türkiye eklendi (site gösteriyordu, otomasyon beslemiyordu).
assert.equal(ayar.kategoriler.length, 11);
assert.ok(M.KATEGORILER.some(k => k.anahtar === 'turkiye'), 'Türkiye kategorisi otomasyonda olmalı');
// Kapak: alakası doğrulanmamış Openverse fotoğrafı varsayılan olarak kapak
// yapılmaz (3 Ekim denetimi: yanlış spor, yanlış şehir, tanınabilir kişiler).
{
  const kaynak = (await import('node:fs')).readFileSync(new URL('../src/sabah-masasi.js', import.meta.url), 'utf8');
  const cagri = kaynak.match(/const gorsel = [^\n]*/)[0];
  assert.match(cagri, /env\.SABAH_FOTOGRAF === 'acik' \? await gorselBul/, 'fotoğraf araması bayraksız çalışmamalı');
  assert.match(kaynak, /`\/assets\/kategori-kapak\/\$\{kat\.anahtar\}\.webp`/, 'fotoğrafsız haber kategori grafiğine düşmeli');
}
console.log('SABAH MASASI TESTLERİ GEÇTİ');

// Kategori işçisi ayrı çağrıda çalışır: düz girdi/çıktı, aday yoksa kayıt yazmaz.
const bos = await M.kategoriIsle({ DB: null }, { kat: M.KATEGORILER[0], adaylar: [], ayar: {}, sonBasliklar: [] });
assert.deepEqual(bos.secilen, [{ kategori: 'Yerel', anahtar: 'balikesir', durum: 'uygun-kaynak-yok' }]);
assert.equal(bos.yayinlanan + bos.taslak, 0);
assert.doesNotThrow(() => structuredClone(bos), 'RPC dönüşü klonlanabilir olmalı');
// Ay adı: belirli tarih büyük harfle.
assert.equal(M.kucukAyAdi("Şanlıurfa, 30 eylül-4 ekim TEKNOFEST"), '30 eylül');
assert.equal(M.kucukAyAdi('30 Eylül-4 Ekim tarihleri arasında'), '');
assert.equal(M.kucukAyAdi('mart ayında 3 martı gördük'), '');
// Konu tekrarı sözcük köküyle: 29 Eylül'de ikinci kez giren fuar haberi.
const eski = [M.kokler('Balıkesir Tarım ve Hayvancılık Fuarı dört günde 108 bin ziyaretçiyi ağırladı')];
assert.equal(M.benzerBaslik('Balıkesir’de tarım ve hayvancılığın büyük buluşmasına 108 bin 321 ziyaretçi katıldı', eski), true);
assert.equal(M.benzerBaslik("Balıkesir'de 3. Tarım ve Hayvancılık Fuarı dört günde 108 bin 321 ziyaretçiyi karşıladı", eski), true);
assert.equal(M.benzerBaslik('Balıkesir Büyükşehir kütüphaneleri tek dijital portalda toplandı', eski), false);
// Tanıtım: özel hastane tanıtımı otomatik akışa girmez; kamu hastanesi haberi girer.
assert.equal(M.tanitimMi("Göz kapağı estetiği... Dünyagöz Etiler Hastanesi'nden Prof. Dr."), true);
assert.equal(M.tanitimMi('Özel Balıkesir Park Hastanesi yeni bölüm açtı'), true);
assert.equal(M.tanitimMi('Balıkesir Atatürk Şehir Hastanesi yeni poliklinik açtı'), false);
// 11 Ekim: bahis platformu bülteni haber diye yayına girdi.
assert.equal(M.tanitimMi("Misli üyesi Bursa Hipodromu'nda 90 TL'ye 60.225 TL kazandı, 25,80 ganyanla sürpriz galip"), true);
assert.equal(M.tanitimMi("Bir platform üyesi 50 TL'ye 1.250.000 TL kazandı"), true);
assert.equal(M.tanitimMi('Gazi Koşusu\'nu 2,05 ganyanla favori at kazandı'), false);
assert.equal(M.tanitimMi('Balıkesirspor deplasmanda 2-1 kazandı'), false);
// Kulis: canlıdaki Spor taslağı atıfsızdı; atıflı hâli geçer.
const kulisKaynak = "Fenerbahçe'de devre arası 50 milyon euroluk golcü operasyonu! Sarı-lacivertliler Balogun'u kadrosuna katmak istiyor.";
const atifsiz = { ...iyi, baslik: "Fenerbahçe, Lukaku performans düşerse Balogun transferi hedefliyor", spot: 'Fenerbahçe, ocak ayında Monaco forveti Folarin Balogun için hamle yapmayı planlıyor; oyuncunun piyasa değeri 50 milyon euro olarak gösteriliyor ve sözleşmesi iki yıl daha sürüyor.' };
assert.ok(M.kaliteDenetimi(atifsiz, '', kulisKaynak).sorun.some(x => x.includes('atıf')));
const atifli = { ...atifsiz, baslik: "Hürriyet: Fenerbahçe, Lukaku istenen seviyeye gelmezse Balogun'u istiyor", spot: "Hürriyet'in haberine göre " + atifsiz.spot };
assert.ok(!M.kaliteDenetimi(atifli, '', kulisKaynak).sorun.some(x => x.includes('atıf')));
// İddia kaynaklı haberde başlık kesinlik bildiremez (Kökçü, 3 Ekim). Gövdedeki
// "bildirildi" atıf sayılsa bile başlık kendi başına yakalanmalı.
const iddiaKaynak = "Orkun Kökçü için olay iddia! Belçika maçında oynamama sebebi ortaya çıktı.";
const kesin = { ...iyi, baslik: "Orkun Kökçü'nün Belçika maçı aday kadrosundan çıkarılma nedeni ortaya çıktı", paragraflar: ["Çıkışının gerekçesi ayak parmağındaki çatlak olarak bildirildi.", ...iyi.paragraflar.slice(1)] };
assert.ok(M.kaliteDenetimi(kesin, '', iddiaKaynak).sorun.some(x => x.includes('kesinleşmiş')), 'iddia başlıkta kesinlik olarak sunulmamalı');
const atifliKesin = { ...kesin, baslik: "Hürriyet: Orkun Kökçü'nün Belçika maçında oynamama nedeni ortaya çıktı" };
assert.ok(!M.kaliteDenetimi(atifliKesin, '', iddiaKaynak).sorun.some(x => x.includes('kesinleşmiş')));
const yumusak = { ...kesin, baslik: "Orkun Kökçü, Belçika maçının aday kadrosundan çıkarıldı" };
assert.ok(!M.kaliteDenetimi(yumusak, '', iddiaKaynak).sorun.some(x => x.includes('kesinleşmiş')));
// Sıradan haber kulis sayılmaz.
assert.equal(M.kulisMi("Valilik vatandaşların dikkatli olmasını istiyor; yaz transfer döneminde"), false);
console.log('SABAH MASASI KATEGORI ISCISI TESTI GECTI');

// Kapak metni (11 Ekim): kaynakta olmayan sayı taşıyan alan atılır, haber düşmez.
{
  const kaynakKapak = 'Fuar 24-27 Eylül tarihlerinde 350 markayı ağırladı.';
  const suz = M.kapakMetniSuz({ ust: "Ali Hikmet Paşa'da 24-27 Eylül", kanca: '350 marka', ana: 'Tarım Fuarı', vurgu: '500 marka katıldı' }, kaynakKapak);
  assert.deepEqual(suz, { ust: "Ali Hikmet Paşa'da 24-27 Eylül", kanca: '350 marka', ana: 'Tarım Fuarı' });
  assert.deepEqual(M.kapakMetniSuz(null, kaynakKapak), {});
  const tablo = new Map();
  const DB = { prepare(sql) { const q = { args: [], bind(...a) { q.args = a; return q; },
    async run() { if (/INSERT OR REPLACE/.test(sql)) tablo.set(q.args[0], q.args[1]); return {}; },
    async all() { return { results: [...tablo].map(([slug, metin]) => ({ slug, metin })) }; } }; return q; } };
  await M.kapakMetniKaydet({ DB }, 'fuar', suz);
  await M.kapakMetniKaydet({ DB }, 'bos', {});
  assert.deepEqual(await M.kapakMetinleriOku({ DB }), { fuar: suz });
  assert.deepEqual(await M.kapakMetinleriOku({ DB: { prepare() { return { all: async () => { throw new Error('no such table'); } }; } } }), {});
  console.log('SABAH MASASI KAPAK METNI TESTI GECTI');
}

// Günlük bölüm döngüsü (11 Ekim): 11 bölüm, azami 8. Balıkesir her gün var,
// her bölüm iki gün içinde en az bir kez çalışır; azami yetiyorsa liste aynen.
{
  const gun0 = M.gununKategorileri(M.KATEGORILER, 8, 0).map(k => k.anahtar);
  const gun1 = M.gununKategorileri(M.KATEGORILER, 8, 1).map(k => k.anahtar);
  assert.equal(gun0.length, 8); assert.equal(gun1.length, 8);
  assert.equal(gun0[0], 'balikesir'); assert.equal(gun1[0], 'balikesir');
  const iki = new Set([...gun0, ...gun1]);
  for (const k of M.KATEGORILER) assert.ok(iki.has(k.anahtar), k.anahtar + ' iki günde bir kez bile çalışmıyor');
  assert.deepEqual(M.gununKategorileri(M.KATEGORILER.slice(0, 3), 8, 5).map(k => k.anahtar), M.KATEGORILER.slice(0, 3).map(k => k.anahtar));
  // Eski kayıtlı liste sonradan eklenen bölümleri dışarıda bırakmaz; kayıttan
  // sonra bilerek çıkarılan bölüme dokunulmaz.
  const kv = deger => ({ KV: { get: async () => JSON.stringify(deger) } });
  const eski = await M.sabahAyarlari(kv({ kategoriler: ['balikesir', 'gundem', 'teknoloji'] }));
  for (const k of ['dunya', 'yasam', 'turkiye']) assert.ok(eski.kategoriler.includes(k), k + ' eski kayda eklenmeli');
  const yeni = await M.sabahAyarlari(kv({ kategoriler: ['balikesir', 'gundem'], kayitTarihi: '2026-10-11T00:00:00Z' }));
  assert.deepEqual(yeni.kategoriler, ['balikesir', 'gundem']);
  console.log('SABAH MASASI BOLUM DONGUSU TESTI GECTI');
}
