const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadNews(){
 const el=document.querySelector('#news');
 if(!el)return;
 try{
  const r=await fetch('/api/news?limit=9',{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const d=await r.json();
  const items=Array.isArray(d)?d:(Array.isArray(d.items)?d.items:Array.isArray(d.news)?d.news:[]);
  if(!items.length)throw new Error('empty');
  el.innerHTML=items.slice(0,9).map((n,i)=>{
   const title=n.title||n.baslik||'BTMEDYA haber arşivi';
   const url=n.url||(n.slug?('/haberler/'+encodeURIComponent(n.slug)).replace(/\/$/,''):'/haberler/');
   const image=n.image||n.cover||n.image_url||n.cover_url||'';
   return '<a class="card '+(i===0?'featured':'')+'" href="'+esc(url)+'">'+(image?'<img src="'+esc(image)+'" alt="'+esc(title)+'" loading="lazy">':'')+'<div><small>'+esc(n.category||n.kategori||'HABER')+'</small><h3>'+esc(title)+'</h3><p>'+esc(n.excerpt||n.ozet||n.description||'Kaynaklı BTMEDYA haber kaydı.')+'</p></div></a>';
  }).join('');
 }catch(e){
  el.innerHTML='<div class="loading">Haber akışı okunamadı. <a href="/haberler/">Arşivi aç ↗</a></div>';
 }
}
async function loadMedia(){
 const el=document.querySelector('#mediaGrid');
 if(!el)return;
 try{
  const r=await fetch('/api/public/media?limit=30',{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const d=await r.json();
  const items=(Array.isArray(d.items)?d.items:[]).filter(x=>x&&!x.ai_generated&&x.vitrin!==false).slice(0,9);
  if(!items.length)throw new Error('empty');
  el.innerHTML=items.map(x=>{
   const title=x.title||x.original_name||x.key||'BTMEDYA arşivi';
   const url=x.url||'';
   const video=/^video\//i.test(x.mime||'');
   const media=video?'<video muted loop playsinline preload="metadata" src="'+esc(url)+'"></video>':'<img loading="lazy" src="'+esc(url)+'" alt="'+esc(title)+'">';
   return '<article class="media-card">'+media+'<div class="media-copy"><b>'+esc(x.ai_generated===false?'GERÇEK ÇEKİM':'AI ÜRETİMİ')+' · '+esc(x.category||'ARŞİV')+'</b><strong>'+esc(title)+'</strong><span>BTMEDYA Media Vault</span></div></article>';
  }).join('');
  el.querySelectorAll('video').forEach(v=>{
   const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?v.play().catch(()=>{}):v.pause()),{rootMargin:'100px'});
   io.observe(v);
  });
 }catch(e){
  // Media Vault API geçici olarak erişilemiyorsa gerçek repository arşivini göster.
  const fallback=[
   ['/assets/media/portfoy/buse-tuncay-saha-roportaj.webp','GERÇEK ÇEKİM · SAHA','Saha röportajı — BTMEDYA mikrofonu'],
   ['/assets/media/portfoy/buse-tuncay-kamera-arkasi.webp','GERÇEK ÇEKİM · PRODÜKSİYON','Kamera arkası — etkinlik çekimi'],
   ['/assets/media/portfoy/poster-btmedya-saha-showreel.webp','GERÇEK ÇEKİM · VIDEO','BTMEDYA saha prodüksiyon showreel'],
   ['/assets/media/portfoy/buse-tuncay-yesil-perde-studyo.webp','GERÇEK ÇEKİM · STÜDYO','Yeşil perde stüdyosu — prodüksiyon']
  ];
  el.innerHTML=fallback.map(x=>'<article class="media-card"><img loading="lazy" src="'+esc(x[0])+'" alt="'+esc(x[2])+'"><div class="media-copy"><b>'+esc(x[1])+'</b><strong>'+esc(x[2])+'</strong><span>BTMEDYA gerçek arşivi · Portföy</span></div></article>').join('');
 }
}
loadNews();
loadMedia();
