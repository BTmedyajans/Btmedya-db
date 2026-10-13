// Sosyal otomasyon birim testi: ayar dogrulama, saat yuvasi (UTC+3), paylasim metni.
// Calistir: node tools/sosyal-otomasyon-testi.mjs
import { sonrakiYuva, altyazi, ayarlariOku, ayarlariYaz, platformSluglari } from '../src/sosyal-otomasyon.js';
import assert from 'node:assert/strict';
// Dolu yuvalar: sahte D1, BETWEEN sorgusunu dizide arar.
const dolu=[];
const DB={prepare:(sql)=>({bind:(...a)=>({first:async()=>dolu.some(t=>t>=a[0]&&t<=a[1])?{1:1}:null})})};
const kv=new Map(); const KV={get:async k=>kv.get(k)??null,put:async(k,v)=>kv.set(k,v)};
const env={DB,KV};
let a=await ayarlariOku(env);
// Varsayilan: native dogrudan yayin hedefleri (Instagram, Facebook, TikTok, YouTube).
assert.deepEqual(a.aglar,['instagram','facebook','tiktok','youtube']); assert.equal(a.otomatikPlanla,true);
a=await ayarlariYaz(env,{aglar:['tiktok','youtube','x','TikTok'],saatler:['18:00','9:5','10:00','25:00'],otomatikPlanla:true,tazelikSaat:-3});
assert.deepEqual(a.aglar,['tiktok','youtube']); assert.deepEqual(a.saatler,['10:00','18:00']); assert.equal(a.tazelikSaat,72);
assert.deepEqual(platformSluglari(a),['tiktok','youtube']);
// 29 Eylul 02:30 Istanbul (= 28 Eylul 23:30Z): ilk yuva 29 Eylul 10:00 TR = 07:00Z
const simdi=new Date('2026-09-28T23:30:00Z');
let y=await sonrakiYuva(env,a,simdi); assert.equal(y,'2026-09-29T07:00:00.000Z');
dolu.push(y); y=await sonrakiYuva(env,a,simdi); assert.equal(y,'2026-09-29T15:00:00.000Z');
dolu.push(y); y=await sonrakiYuva(env,a,simdi); assert.equal(y,'2026-09-30T07:00:00.000Z');
// 09:50 TR iken 10:00 yuvasi 20 dk esiginin icinde: atlanir.
dolu.length=0; y=await sonrakiYuva(env,a,new Date('2026-09-29T06:50:00Z')); assert.equal(y,'2026-09-29T15:00:00.000Z');
const m=altyazi({slug:'x',title:'Balıkesir itfaiyesi',excerpt:'  Spot   metni ',category:'Yerel'},'temsili fotoğraf — ustung / Flickr, CC BY 2.0');
assert.match(m,/#BTMEDYA #Balıkesir #BalıkesirHaber #Gündem/); assert.match(m,/btmedya.com.tr\/haberler\/x/);
const eski=altyazi({slug:'y',title:'Güneş koruyucu',excerpt:'s',category:'Sağlık · Bakım',published_at:'2024-08-07T09:00:00Z'},'',new Date('2026-09-29T00:00:00Z'));
assert.match(eski,/📌 Arşiv haberi · Ağustos 2024/); assert.match(eski,/#Sağlık/);
const taze=altyazi({slug:'z',title:'t',excerpt:'s',category:'Spor',published_at:'2026-09-28T09:00:00Z'},'',new Date('2026-09-29T00:00:00Z'));
assert.doesNotMatch(taze,/Arşiv/);
// Ortak marka şablonu (11 Ekim): varsayılan iskelet, panelden değişen alanlar,
// geçersiz etiketin düşmesi ve AI karesinin metinde beyanı.
assert.match(m,/Haberin tamamı: btmedya\.com\.tr\/haberler\/x/);
assert.match(m,/BTMEDYA · Hikâyeleri yaşatıyoruz\n\n#BTMEDYA/, 'imza etiketlerden hemen önce');
assert.doesNotMatch(m,/AI ÜRETİMİ/, 'AI bilgisi yoksa beyan basılmaz');
const sb=(await ayarlariYaz(env,{sablon:{cta:'  Devamı  :',imza:'X',sabitEtiketler:['BTMEDYA','#Balıkesir Haber','#a','#Haber_Merkezi'],konuEtiketleri:false,aiBeyani:true}})).sablon;
assert.deepEqual(sb.sabitEtiketler,['#BTMEDYA','#Haber_Merkezi'], 'boşluklu ve tek harfli etiket düşer, # eklenir');
assert.equal(sb.cta,'Devamı :');
const ozel=altyazi({slug:'q',title:'Balıkesir yangını',excerpt:'s',category:'Gündem'},'',new Date(),sb,true);
assert.match(ozel,/Devamı : btmedya\.com\.tr\/haberler\/q/); assert.match(ozel,/Görsel: AI ÜRETİMİ/);
assert.doesNotMatch(ozel,/#Gündem|#Balıkesir\b/, 'konu etiketleri kapalıyken eklenmez');
assert.equal((await ayarlariOku(env)).sablon.imza,'X', 'şablon KV\'de kalıcı');
console.log('TUM TESTLER GECTI');
