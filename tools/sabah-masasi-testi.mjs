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
const cagrilar = [];
const env = { AI: { run: async (model, girdi) => {
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

// Model ayarlarda saklansa bile koddaki model kullanılır; boş kategori listesi "hepsi" demektir.
const kv = new Map([['sabah:ayarlar', JSON.stringify({ model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', kategoriler: [] })]]);
const ayar = await M.sabahAyarlari({ KV: { get: async k => kv.get(k) || null } });
assert.equal(ayar.model, '@cf/openai/gpt-oss-120b');
assert.equal(ayar.kategoriler.length, 8);
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
