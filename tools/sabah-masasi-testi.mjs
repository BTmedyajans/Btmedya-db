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
console.log('SABAH MASASI TESTLERİ GEÇTİ');
