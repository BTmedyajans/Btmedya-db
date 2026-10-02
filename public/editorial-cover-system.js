/* BTMEDYA Editorial Cover System v1 */
(()=> {
  'use strict';

  const STOP = new Set(("ve veya ile için icin de da bir bu şu su o olan olanın olanin olarak daha çok cok çoktan çoklu gibi ileden " +
    "için icin üzerinde altinda altında arasında arasinda sonra önce once kadar göre gore neden nasıl nasil hangi " +
    "nedeniyle tarafından tarafindan açıklamasını aciklamasini açıkladı acikladi duyurdu yaptı yapti başladı basladi " +
    "devam ediyor edildi edildiği oldugu olduğunu oldugunu bugün bugun yarın yarin gece saat tarihinde yılında yilinda " +
    "haber haberleri haberler merkez merkezden btmmedya").split(/\s+/).filter(Boolean));

  const norm = s => String(s||'').toLocaleLowerCase('tr-TR')
    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  const esc = s => String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  const cleanToken = s => norm(String(s||'').replace(/^[^0-9a-zA-ZçğıöşüÇĞİÖŞÜ]+|[^0-9a-zA-ZçğıöşüÇĞİÖŞÜ]+$/g,''));

  function highlightToken(title){
    const raw=String(title||'').trim();
    const tokens=raw.split(/(\s+)/);
    const scored=[];
    tokens.forEach((t,i)=>{
      if(/^\s+$/.test(t))return;
      const clean=cleanToken(t);
      if(!clean || clean.length<4 || STOP.has(clean)) return;
      let score=clean.length;
      if(/\d/.test(clean))score+=18;
      if(/[A-ZÇĞİÖŞÜ]{3,}/.test(t))score+=5;
      if(/(iddia|şok|sok|yangin|yangın|kaza|zam|fiyat|satış|satis|rekor|başlıyor|basliyor|kriz|uyusturucu|uyuşturucu)/i.test(t))score+=10;
      scored.push({i,t,score});
    });
    if(!scored.length)return null;
    scored.sort((a,b)=>b.score-a.score||b.t.length-a.t.length||a.i-b.i);
    return norm(scored[0].t);
  }

  function headlineHtml(title){
    const target=highlightToken(title);
    return String(title||'').split(/(\s+)/).map(part=>{
      if(!target || /^\s+$/.test(part)) return esc(part);
      return cleanToken(part)===target ? '<span class="bt-cover-highlight">'+esc(part)+'</span>' : esc(part);
    }).join('');
  }

  function categoryText(card){
    const candidates=[
      card.querySelector('.news-kaynak')?.textContent,
      card.querySelector('.news-source-badge')?.textContent,
      card.querySelector('.news-body>small')?.textContent,
      card.querySelector('.story-card-copy>small')?.textContent,
      card.querySelector('.editorial-special-copy>small')?.textContent
    ].filter(Boolean);
    const raw=String(candidates.find(Boolean)||'HABER').replace(/\s+/g,' ').trim();
    return raw.split(/[·|/]/)[0].trim() || 'HABER';
  }

  function sourceText(card){
    const n=card.querySelector('.news-kaynak')?.textContent?.trim();
    if(n)return n;
    const b=card.querySelector('.news-source-badge')?.textContent?.replace(/\s+/g,' ').trim();
    if(b)return b;
    return card.matches('.story-card,.editorial-special-card') ? 'BTMEDYA / SAHA' : 'BTMEDYA';
  }

  function findTarget(card){
    if(card.matches('.news-media')) return {
      node:card,
      title:card.parentElement?.querySelector('.news-body h2,.news-body h3')?.textContent?.trim(),
      compact:!card.closest('.news-card.featured')
    };
    if(card.matches('.story-card')) return {
      node:card,
      title:card.querySelector('.story-card-copy h3')?.textContent?.trim(),
      compact:false
    };
    if(card.matches('.editorial-special-card')) return {
      node:card,
      title:card.querySelector('.editorial-special-copy h3')?.textContent?.trim(),
      compact:false
    };
    if(card.matches('.latest-kapak')) return {
      node:card,
      title:card.parentElement?.querySelector('.latest-metin h3')?.textContent?.trim(),
      compact:true
    };
    return null;
  }

  function decorate(node,title,compact){
    if(!node || !title || node.querySelector(':scope>.bt-cover-ui'))return;
    node.classList.add('bt-cover-enhanced');
    const kicker=compact?categoryText(node.closest('.news-card,.latest-item,.story-card,.editorial-special-card')||node):categoryText(node);
    const meta=sourceText(node.closest('.news-card,.latest-item,.story-card,.editorial-special-card')||node);
    const ui=document.createElement('div');
    ui.className='bt-cover-ui';
    ui.setAttribute('aria-hidden','true');
    ui.innerHTML=
      '<span class="bt-cover-kicker">'+esc(kicker||'HABER')+'</span>'+
      '<span class="bt-cover-headline">'+headlineHtml(title)+'</span>'+
      '<span class="bt-cover-meta">'+esc(meta)+'</span>';
    node.appendChild(ui);
  }

  function scan(root=document){
    root.querySelectorAll('.news-media,.story-card,.editorial-special-card,.latest-kapak').forEach(el=>{
      const info=findTarget(el);
      if(info)decorate(info.node,info.title,info.compact);
    });
  }

  function fixMobileSaha(){
    if(window.innerWidth>720)return;
    document.querySelectorAll('.story-card-side').forEach(card=>{
      card.removeAttribute('aria-hidden');
      card.removeAttribute('inert');
    });
  }

  function init(){
    scan();
    fixMobileSaha();
    const mo=new MutationObserver(muts=>{
      let changed=false;
      muts.forEach(m=>{ if(m.addedNodes?.length)changed=true; });
      if(changed){scan();fixMobileSaha();}
    });
    mo.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',fixMobileSaha,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();