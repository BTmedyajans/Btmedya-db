const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadNews(){
 const el=document.querySelector('#news');
 try{
  const r=await fetch('/api/news',{headers:{accept:'application/json'}});
  const d=await r.json();
  const items=Array.isArray(d)?d:(d.items||d.news||[]);
  if(!items.length) throw new Error();
  el.innerHTML=items.slice(0,9).map((n,i)=>{
   const title=n.title||n.baslik||'BTMEDYA haber arşivi';
   const url=n.url||n.slug?('/haberler/'+(n.slug||'')).replace(/\/$/,''): '/haberler/';
   const image=n.image||n.cover||n.image_url||'';
   return '<a class="card '+(i===0?'featured':'')+'" href="'+esc(url)+'">'+(image?'<img src="'+esc(image)+'" alt="'+esc(title)+'" loading="lazy">':'')+'<div><small>'+esc(n.category||n.kategori||'HABER')+'</small><h3>'+esc(title)+'</h3><p>'+esc(n.excerpt||n.ozet||n.description||'Kaynaklı BTMEDYA haber kaydı.')+'</p></div></a>';
  }).join('');
 }catch(e){el.innerHTML='<div class="loading">Haber akışı okunamadı. <a href="/haberler/">Arşivi aç ↗</a></div>'}
}
async function loadMedia(){
 const el=document.querySelector('#mediaGrid');
 try{
  const r=await fetch('/api/public/media?limit=30',{headers:{accept:'application/json'}});
  const d=await r.json();
  const items=(d.items||[]).filter(x=>x&&!x.ai_generated&&x.vitrin!==false).slice(0,9);
  if(!items.length) throw new Error();
  el.innerHTML=items.map((x,i)=>{
   const title=x.title||x.original_name||x.key||'BTMEDYA arşivi';
   const url=x.url||'';
   const video=/^video\//i.test(x.mime||'');
   const media=video?'<video muted loop playsinline preload="metadata" src="'+esc(url)+'"></video>':'<img loading="lazy" src="'+esc(url)+'" alt="'+esc(title)+'">';
   return '<article class="media-card">'+media+'<div class="media-copy"><b>'+esc(x.ai_generated===false?'GERÇEK ÇEKİM':'AI ÜRETİMİ')+' · '+esc(x.category||'ARŞİV')+'</b><strong>'+esc(title)+'</strong><span>BTMEDYA Media Vault</span></div></article>';
  }).join('');
  el.querySelectorAll('video').forEach(v=>{const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?v.play().catch(()=>{}):v.pause()),{rootMargin:'100px'});io.observe(v)});
 }catch(e){el.innerHTML='<div class="loading">Gerçek medya arşivi şu anda okunamadı. <a href="/admin/">Media Vault ↗</a></div>'}
}
loadNews();loadMedia();