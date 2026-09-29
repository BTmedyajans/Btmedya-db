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
// Varsayilan: yalniz Metricool'da dogrulanmis ag (TikTok), otomatik planlama acik.
assert.deepEqual(a.aglar,['tiktok']); assert.equal(a.otomatikPlanla,true);
a=await ayarlariYaz(env,{aglar:['tiktok','x','TikTok'],saatler:['18:00','9:5','10:00','25:00'],otomatikPlanla:true,tazelikSaat:-3});
assert.deepEqual(a.aglar,['tiktok']); assert.deepEqual(a.saatler,['10:00','18:00']); assert.equal(a.tazelikSaat,72);
assert.deepEqual(platformSluglari(a),['tiktok']);
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
console.log('TUM TESTLER GECTI');
