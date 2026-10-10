import fs from "node:fs";
import path from "node:path";

const root=path.resolve("video/hyperframes/release");
const htmlPath=path.join(root,"index.html");
let html=fs.readFileSync(htmlPath,"utf8");
const baslik=String(process.env.BTMEDYA_VIDEO_TITLE||"Yeni üretim kaydı").trim().slice(0,110);
const sha=String(process.env.BTMEDYA_COMMIT||"unknown").trim().slice(0,12);
const tarih=String(process.env.BTMEDYA_DATE||new Date().toISOString()).trim();
const tarihMetni=new Date(tarih).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"medium",timeStyle:"short"});
const esc=(s)=>s.replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
html=html.replace("Yeni üretim kaydı",esc(baslik)).replace("BTMEDYA otomasyon hattı",esc(`Commit ${sha} • ${tarihMetni}`));
fs.writeFileSync(htmlPath,html);
console.log(JSON.stringify({ok:true,htmlPath,title:baslik,commit:sha,date:tarih}));
