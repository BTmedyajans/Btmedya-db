/* BTMEDYA Halkın Merak Radarı
 * Google Trends + arama önerileri + BTMEDYA yayın geçmişi + Metricool bağlantı
 * durumu üzerinden "hangi soru büyüyor?" sinyali üretir.
 *
 * Sinyal kamuoyunun tamamını temsil etmez. Araştırma önceliği belirler.
 * Yayın kararı için kaynak, tarih, belge ve editör kontrolü korunur.
 */
const TRENDS_URL = "https://trends.google.com/trending/rss?geo=TR";
const SUGGEST_URL = "https://suggestqueries.google.com/complete/search?client=firefox&hl=tr&q=";
const SORU_EKLERI = ["neden","niçin","ne oldu","son durum","fiyatı ne","ne zaman","nasıl","kim etkileniyor","değişti mi","hangi ilçelerde"];
const SORU_SINYALI = /(neden|niçin|ne oldu|son durum|fiyat|ne zaman|nasıl|kim|hangi|değişti|başvuru|zam|kaldırıldı|yasaklandı)/i;

function duzelt(s){
  return String(s||"").toLocaleLowerCase("tr-TR").replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function temiz(s){
  return String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/<!\[CDATA\[|\]\]>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,"\"").replace(/&#39;|&apos;/g,"'").replace(/\s+/g," ").trim();
}
function rss(xml){
  return Array.from(String(xml||"").matchAll(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)).map(function(m){
    var b=m[0];
    var pick=function(t){ var x=b.match(new RegExp("<"+t+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+t+">","i")); return x?temiz(x[1]):""; };
    var link=pick("link");
    if(!link){ var x=b.match(/<link[^>]+href=["']([^"']+)["']/i); link=x?x[1]:""; }
    return {title:pick("title"),description:pick("description")||pick("summary")||pick("content"),link:link,date:pick("pubDate")||pick("published")||pick("updated")};
  }).filter(function(x){return x.title;});
}
async function al(url){
  var r=await fetch(url,{headers:{accept:"application/rss+xml, application/xml, text/xml, text/html","user-agent":"BTMEDYA-Merak-Radari/1.0 (+https://btmedya.com.tr)"},redirect:"follow",signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.text();
}
async function jsonAl(url){
  var r=await fetch(url,{headers:{accept:"application/json","user-agent":"BTMEDYA-Merak-Radari/1.0"},redirect:"follow",signal:AbortSignal.timeout(8000)});
  if(!r.ok) throw new Error("HTTP "+r.status);
  return r.json();
}
function anahtarlar(metin){ return Array.from(new Set(duzelt(metin).split(/[^a-z0-9]+/).filter(function(x){return x.length>3;}))); }
function kategori(t){
  var s=duzelt(t);
  if(/balikesir|edremit|bandirma|ayvalik|karesi|altieylul|gonen|burhaniye|susurluk|sindirgi|bigadic|erdek|havran/.test(s)) return "Balıkesir";
  if(/dolar|euro|altin|fiyat|zam|enflasyon|ihracat|ithalat|faiz|kredi|konut|otomobil|akaryakit|tarim|zeytin/.test(s)) return "Ekonomi";
  if(/futbol|basketbol|mac|spor|lig|transfer/.test(s)) return "Spor";
  if(/yapay zeka|ai|yazilim|telefon|teknoloji|robot|siber/.test(s)) return "Teknoloji & Yapay Zeka";
  if(/okul|universite|sinav|ogrenci|egitim|yurt|burs/.test(s)) return "Eğitim";
  if(/saglik|hastane|doktor|ilac|hastalik/.test(s)) return "Sağlık";
  if(/deprem|yangin|sel|firtina|hava/.test(s)) return "Afet / Hava";
  return "Gündem";
}
function anahtarMerak(konu){
  var s=duzelt(konu);
  if(/fiyat|zam|ucret|maas|emekli|kira|akaryakit|zeytin/.test(s)) return "fiyatı ne";
  if(/yangin|deprem|kaza|ulasim|trafik/.test(s)) return "son durum";
  if(/belediye|proje|hat|yol|altyapi/.test(s)) return "neden değişti";
  return "neden";
}
function soruUret(konu,oneri){
  var a=[]; if(oneri) a.push(oneri);
  for(var i=0;i<SORU_EKLERI.length;i++) a.push(SORU_EKLERI[i]);
  return Array.from(new Set(a.map(function(x){return String(x||"").trim();}).filter(function(x){return x.length>2;}))).slice(0,6);
}
function hassas(s){
  return /\b(siyaset|secim|milletvekili|parti|cumhurbaskani|tutuklan|gozalti|sorusturma|iddianame|sanik|cinayet|oldur|silah|taciz|istismar|intihar|teror|olum|olu|yarali|yaralan)\w*\b/i.test(duzelt(s));
}
async function kendiYayinlari(env){
  if(!env.DB) return [];
  var r=await env.DB.prepare("SELECT title,excerpt,category,published_at,slug FROM news WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT 160").all().catch(function(){return {results:[]};});
  return r.results||[];
}
async function ensureTables(env){
  if(!env.DB) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS merak_sinyalleri (id INTEGER PRIMARY KEY AUTOINCREMENT, konu TEXT NOT NULL, soru TEXT NOT NULL DEFAULT '', kategori TEXT NOT NULL DEFAULT 'Gündem', sinyal_kaynak TEXT NOT NULL DEFAULT '', kaynak_url TEXT NOT NULL DEFAULT '', google_sinyal INTEGER NOT NULL DEFAULT 0, arama_sinyal INTEGER NOT NULL DEFAULT 0, sosyal_sinyal INTEGER NOT NULL DEFAULT 0, btm_sinyal INTEGER NOT NULL DEFAULT 0, rakip_sinyal INTEGER NOT NULL DEFAULT 0, puan INTEGER NOT NULL DEFAULT 0, gerekce TEXT NOT NULL DEFAULT '', durum TEXT NOT NULL DEFAULT 'yeni', first_seen_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(konu,soru))").run().catch(function(){});
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS ozel_haber_firsatlari (id INTEGER PRIMARY KEY AUTOINCREMENT, konu TEXT NOT NULL, kategori TEXT NOT NULL DEFAULT 'Gündem', baslik TEXT NOT NULL DEFAULT '', neden TEXT NOT NULL DEFAULT '', ozgun_aci TEXT NOT NULL DEFAULT '', format TEXT NOT NULL DEFAULT 'araştırma haberi', konuk_profili TEXT NOT NULL DEFAULT '', sorular TEXT NOT NULL DEFAULT '[]', risk TEXT NOT NULL DEFAULT 'normal', durum TEXT NOT NULL DEFAULT 'önerildi', kaynaklar TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run().catch(function(){});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_merak_puan ON merak_sinyalleri(puan DESC,updated_at DESC)").run().catch(function(){});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_ozel_durum ON ozel_haber_firsatlari(durum,updated_at DESC)").run().catch(function(){});
}
async function autocomplete(konu){
  try{
    var d=await jsonAl(SUGGEST_URL+encodeURIComponent(konu));
    var a=Array.isArray(d&&d[1])?d[1]:[];
    return a.map(function(x){return String(x||"").trim();}).filter(Boolean).slice(0,8);
  }catch{return [];}
}
function puanla(g){
  var p=Number(g.google||0)+Number(g.search||0)+Number(g.social||0)+Number(g.btm||0)+Number(g.competitor||0)+(g.question?8:0)-(g.risk?28:0);
  return Math.max(0,Math.min(100,Math.round(p)));
}
export async function merakRadariCalistir(env,{limit=12}={}){
  await ensureTables(env);
  var now=new Date().toISOString();
  var result={ok:true,scanned:0,signals:0,opportunities:0,errors:[],items:[],programCandidates:[]};
  var own=await kendiYayinlari(env);
  var trends=[];
  try{ trends=rss(await al(TRENDS_URL)).slice(0,20); }catch(e){ result.errors.push("Google Trends: "+String(e&&e.message||e).slice(0,160)); }
  var trendKel=new Map();
  trends.forEach(function(x){ anahtarlar(x.title).forEach(function(k){ trendKel.set(k,(trendKel.get(k)||0)+1); }); });
  var candidates=[];
  for(var ti=0;ti<trends.length;ti++){
    var t=trends[ti], topic=t.title.trim(); if(!topic) continue;
    var related=await autocomplete(topic);
    var questions=Array.from(new Set(related.filter(function(q){return SORU_SINYALI.test(q);}).concat(soruUret(topic,related.find(function(q){return SORU_SINYALI.test(q);})||anahtarMerak(topic))))).slice(0,4);
    var base=anahtarlar(topic);
    var internalHits=own.filter(function(n){ var z=duzelt(n.title+" "+n.excerpt); return base.some(function(k){return z.indexOf(k)>=0;}); }).length;
    var socialHits=env.KV?await env.KV.get("merak-radari:sosyal:"+duzelt(topic)).then(function(x){return Number(x||0);}).catch(function(){return 0;}):0;
    var competitorHits=env.KV?await env.KV.get("merak-radari:rakip:"+duzelt(topic)).then(function(x){return Number(x||0);}).catch(function(){return 0;}):0;
    for(var qi=0;qi<questions.length;qi++){
      var soru=questions[qi], risk=hassas(topic+" "+soru);
      var google=Math.min(32,20+Math.min(12,(trendKel.get(base[0])||1)*4));
      var search=Math.min(25,8+(related.length*2));
      var social=Math.min(18,socialHits);
      var btm=Math.min(18,internalHits*3);
      var competitor=Math.min(12,competitorHits*3);
      var puan=puanla({google:google,search:search,social:social,btm:btm,competitor:competitor,question:true,risk:risk});
      candidates.push({konu:topic,soru:soru,kategori:kategori(topic),kaynak_url:t.link||TRENDS_URL,google:google,search:search,social:social,btm:btm,competitor:competitor,puan:puan,gerekce:"Google trend + arama soruları"+(internalHits?" · BTMEDYA'da "+internalHits+" ilgili yayın":"")+(competitorHits?" · rakip sinyali "+competitorHits:"")});
    }
  }
  candidates.sort(function(a,b){return b.puan-a.puan;});
  result.scanned=trends.length;
  var take=Math.max(12,Number(limit)||12);
  for(var ci=0;ci<Math.min(candidates.length,take);ci++){
    var x=candidates[ci];
    await env.DB.prepare("INSERT INTO merak_sinyalleri (konu,soru,kategori,sinyal_kaynak,kaynak_url,google_sinyal,arama_sinyal,sosyal_sinyal,btm_sinyal,rakip_sinyal,puan,gerekce,durum,first_seen_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(konu,soru) DO UPDATE SET kategori=excluded.kategori,kaynak_url=excluded.kaynak_url,google_sinyal=excluded.google_sinyal,arama_sinyal=excluded.arama_sinyal,sosyal_sinyal=excluded.sosyal_sinyal,btm_sinyal=excluded.btm_sinyal,rakip_sinyal=excluded.rakip_sinyal,puan=excluded.puan,gerekce=excluded.gerekce,updated_at=excluded.updated_at")
      .bind(x.konu,x.soru,x.kategori,"Google Trends + Google arama önerileri",x.kaynak_url,x.google,x.search,x.social,x.btm,x.competitor,x.puan,x.gerekce,"yeni",now,now).run().catch(function(e){result.errors.push("D1: "+String(e&&e.message||e).slice(0,100));});
    result.signals++;
  }
  var top=candidates.filter(function(x){return x.puan>=55;}).slice(0,6);
  for(var oi=0;oi<top.length;oi++){
    var o=top[oi], risk2=hassas(o.konu+" "+o.soru)?"editör kontrolü":"normal";
    var baslik=(o.kategori==="Balıkesir"?"Balıkesir'de ":"")+o.konu+": "+o.soru;
    var format=o.kategori==="Balıkesir"?"saha araştırması + özel haber":"araştırma haberi + veri görseli";
    var profil=o.kategori==="Balıkesir"?"konunun sahadaki muhatabı + ilgili uzman":"alanında uzman + resmi/kurumsal kaynak";
    var sorular=[o.soru,"Bu durumun nedeni nedir ve hangi veri/belge doğruluyor?","Vatandaş, esnaf veya sektör açısından somut etkisi nedir?","Son bir yıla göre ne değişti?","Önümüzdeki dönemde ne takip edilmeli?"];
    var exists=await env.DB.prepare("SELECT id FROM ozel_haber_firsatlari WHERE konu=? AND durum!='arsiv' ORDER BY id DESC LIMIT 1").bind(o.konu).first().catch(function(){return null;});
    if(exists) continue;
    await env.DB.prepare("INSERT INTO ozel_haber_firsatlari (konu,kategori,baslik,neden,ozgun_aci,format,konuk_profili,sorular,risk,durum,kaynaklar,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(o.konu,o.kategori,baslik,"Arama davranışında yükselen bir başlık ve cevaplanabilir alt soru bulundu. Sinyal puanı: "+o.puan+"/100.","Rakip başlığını tekrar etmek yerine eksik kalan veri, saha görüşü ve doğrulanabilir belge üzerinden özgün cevap üret.",format,profil,JSON.stringify(sorular),risk2,"önerildi",JSON.stringify([o.kaynak_url]),now,now).run().catch(function(e){result.errors.push("özel haber: "+String(e&&e.message||e).slice(0,120));});
    result.opportunities++;
  }
  if(env.KV) await env.KV.put("merak-radari:son",JSON.stringify({at:now,scanned:result.scanned,signals:result.signals,opportunities:result.opportunities}),{expirationTtl:86400}).catch(function(){});
  result.items=candidates.slice(0,take);
  result.programCandidates=top.map(function(x){return {konu:x.konu,kategori:x.kategori,soru:x.soru,puan:x.puan,program:x.kategori==="Balıkesir"?"Halk Röportajı":"Siyah Oda",format:x.kategori==="Balıkesir"?"saha / kısa sosyal":"uzman / 20-45 dk",öneri:x.kategori==="Balıkesir"?"Sokakta bu soruyu vatandaşlara sor.":"Uzman konuk + veri dosyasıyla derinleştir."};});
  return result;
}
export async function merakRadariDurumu(env){
  await ensureTables(env);
  if(!env.DB) return {ok:false,enabled:false,items:[],opportunities:[]};
  var items=(await env.DB.prepare("SELECT * FROM merak_sinyalleri WHERE durum='yeni' ORDER BY puan DESC,updated_at DESC LIMIT 40").all().catch(function(){return {results:[]};})).results||[];
  var opportunities=(await env.DB.prepare("SELECT * FROM ozel_haber_firsatlari WHERE durum IN ('önerildi','hazırlanıyor','çekim') ORDER BY id DESC LIMIT 20").all().catch(function(){return {results:[]};})).results||[];
  var matrix=(await env.DB.prepare("SELECT kategori,COUNT(*) toplam,MAX(puan) en_yuksek,SUM(CASE WHEN puan>=55 THEN 1 ELSE 0 END) yuksek FROM merak_sinyalleri WHERE updated_at>=? GROUP BY kategori ORDER BY en_yuksek DESC").bind(new Date(Date.now()-86400000).toISOString()).all().catch(function(){return {results:[]};})).results||[];
  var last=env.KV?await env.KV.get("merak-radari:son").catch(function(){return null;}):null;
  return {ok:true,enabled:true,items:items,opportunities:opportunities,matrix:matrix,last:last?JSON.parse(last):null,programs:[
    {name:"Halk Röportajı",days:"Haftada 1",rule:"Saha sorusu güçlü ve doğrudan vatandaşa sorulabilir olduğunda."},
    {name:"Siyah Oda",days:"Haftada 1-2",rule:"Uzmanlık, veri ve derinlemesine tartışma gerektiren güçlü konu olduğunda."}
  ]};
}


export async function ozelHaberPaketiUret(env,{id}={}){
  await ensureTables(env);
  if(!env.DB) return {ok:false,error:"D1 bağlı değil."};
  const row=await env.DB.prepare("SELECT * FROM ozel_haber_firsatlari WHERE id=?").bind(Number(id)).first().catch(()=>null);
  if(!row) return {ok:false,error:"Özel haber fırsatı bulunamadı."};
  var sorular=[]; var kaynaklar=[];
  try{sorular=JSON.parse(row.sorular||"[]");}catch{}
  try{kaynaklar=JSON.parse(row.kaynaklar||"[]");}catch{}
  const temel={konu:row.konu,kategori:row.kategori,baslik:row.baslik,neden:row.neden,ozgun_aci:row.ozgun_aci,format:row.format,konuk_profili:row.konuk_profili,sorular:sorular,kaynaklar:kaynaklar,risk:row.risk};
  if(!env.AI) return {ok:true,source:"şablon",paket:{...temel,baslik_alternatifleri:[row.baslik],spot_taslagi:"Kaynak ve saha verisi doğrulanmadan yayınlanmayacak.",kontrol_listesi:["Kaynağın güncelliğini doğrula","Resmî belge/veriyi bul","Karşı görüşleri ara","BTMEDYA arşivini kontrol et"],sosyal_metni:"Araştırma dosyası hazırlanıyor. Doğrulanmış gelişmeleri BTMEDYA'da takip edin.",video_script_60s:["Giriş: Soruyu tek cümlede sor.","Orta: doğrulanabilir veri ve saha görüşü.","Kapanış: kaynağı ve sonraki adımı belirt."]}};
  try{
    const prompt=["BTMEDYA Özel Haber Üretim Masası.","Aşağıdaki fırsatı yayınlanmış bir gerçek gibi kabul etme.","Yalnız araştırma paketi oluştur. Bilinmeyen hiçbir şeyi tamamlamadan VERIFY yaz.","Kaynak URL'lerini koru. Üçüncü taraf metinleri kopyalama.","JSON alanları: baslik_alternatifleri, spot_taslagi, arastirma_sorulari, veri_ve_belge_kontrolu, konuk_ve_saha_plani, sosyal_metni, video_script_60s, gorsel_plani, risk_notu.","Fırsat: "+JSON.stringify(temel)].join("\n");
    const ai=await env.AI.run("@cf/openai/gpt-oss-120b",{messages:[{role:"system",content:"Kaynaklı gazetecilik araştırma yardımcısısın. Uydurma bilgi verme. Eksik bilgiye VERIFY yaz. Kısa ve uygulanabilir Türkçe JSON üret."},{role:"user",content:prompt}],max_tokens:1800,temperature:0.1});
    var raw=String(ai&&ai.response||ai&&ai.output_text||"").trim();
    var m=raw.match(/\\{[\\s\\S]*\\}/);
    if(m) return {ok:true,source:"workers-ai",id:Number(row.id),paket:JSON.parse(m[0]),temel:temel};
  }catch(e){ return {ok:false,error:String(e&&e.message||e).slice(0,400),temel:temel}; }
  return {ok:true,source:"şablon",paket:temel};
}
