/* BTMEDYA Agency OS · social status + quick actions */
(function(){
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  async function load(){
    const box=document.querySelector('#socialCommand');
    if(!box)return;
    const names={instagram:{label:'Instagram',handle:'@busetuncayy10',url:'https://www.instagram.com/busetuncayy10/'},facebook:{label:'Facebook',handle:'sağlanan profil bağlantısı',url:'https://www.facebook.com/share/1HhRrPuq4u/'},youtube:{label:'YouTube',handle:'@BTmedyaAjans',url:'https://www.youtube.com/@BTmedyaAjans'},tiktok:{label:'TikTok',handle:'@btmedya1010',url:'https://www.tiktok.com/@btmedya1010'}};
    let data=null;
    try{
      const r=await fetch('/api/admin/control-center',{credentials:'same-origin',cache:'no-store'});
      if(r.ok)data=await r.json();
    }catch(e){}
    const social=data?.social||{};
    const status=(key)=>{
      const s=social[key]||{};
      if(s.configured)return ['ok','BAĞLI + YAYINA HAZIR'];
      if(s.connected)return ['pending','HESAP BAĞLI · WORKER BEKLİYOR'];
      return ['warn','DOĞRULAMA BEKLİYOR'];
    };
    const cards=['instagram','facebook','youtube','tiktok'].map(k=>{
      const n=names[k], st=status(k);
      return `<article class="social-card ${st[0]}"><b>${n.label}</b><small>${n.handle}</small><span class="social-status">${st[1]}</span>${n.url?`<a href="${n.url}" target="_blank" rel="noopener">Profili aç ↗</a>`:''}</article>`;
    }).join('');
    box.innerHTML=`<div class="social-grid">${cards}</div><p class="social-note">Metricool Brand 6858384 · Europe/Istanbul. Instagram @busetuncayy10 ve sağlanan Facebook bağlantısı panelde görünür; yayın durumu yalnızca Metricool/Worker doğrulamasına göre “BAĞLI + YAYINA HAZIR” olur. BTMEDYA marka Instagramı @btmedyajans ayrıca profilde korunur. Gizli token veya şifre burada gösterilmez.</p>`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  setInterval(load,60000);
})();
