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

  const esc = s => String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  
  /* Haber niteliğine göre 5 kapak dili.
     Marka sabitleri aynı kalır; yalnızca bilgi hiyerarşisi değişir. */
  function coverTemplate(card,title){
    const scope = String([
      title||'',
      card?.textContent||'',
      card?.closest('.news-card,.story-card,.editorial-special-card,.latest-item,.article-page')?.textContent||''
    ].join(' ')).toLocaleLowerCase('tr-TR');
    const cat = norm(categoryText(card||document.body));
    if (/(son dakika|acil|flaş|flash|son gelisme|son gelişme|yangin|yangın|kaza|deprem|afet|saldiri|saldırı|patlama|gozalt|gözalt)/.test(scope)) return '01-impact';
    if (/(ekonomi|fiyat|zam|enflasyon|piyasa|dolar|euro|altin|altın|maas|maaş|ücret|satış|satis|tarim|tarım)/.test(scope) || /\d+\s*(tl|₺|%|milyon|milyar)/i.test(scope)) return '04-data';
    if (/(kultur|kültür|sanat|edebiyat|sinema|müzik|muzik|tiyatro|turizm|gastronomi|etkinlik|egitim|eğitim|üniversite|universite|okul)/.test(scope)) return '03-magazine';
    if (/(teknoloji|yapay zek|yazilim|yazılım|dijital|ai|spor|futbol|basketbol|voleybol|tenis)/.test(scope)) return '05-minimal';
    if (/(canli|canlı|saha|röportaj|roportaj|muhabir|buse tuncay|video haber)/.test(scope) || card?.matches('.story-card,.editorial-special-card')) return '02-field';
    return '01-impact';
  }


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
      card.querySelector('.news-body>small')?.textContent,
      card.querySelector('.story-card-copy>small')?.textContent,
      card.querySelector('.editorial-special-copy>small')?.textContent,
      card.querySelector('.latest-metin>small:not(.story-format)')?.textContent,
      card.querySelector('.news-source-badge')?.textContent,
      card.querySelector('.news-kaynak')?.textContent
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
    if(card.matches('.article-cover-wrap')) return {
      node:card,
      title:card.closest('.article-page')?.querySelector('h1')?.textContent?.trim(),
      compact:false,
      article:true
    };
    return null;
  }

  function decorate(node,title,compact){
    /* 4 Ekim 2026: kapaklar artik basligi kendisi tasiyan manset gorselleri
       (tools/haber-kapagi.py). Bu katman ayni basligi gorselin ustune ikinci,
       kartin HTML basligiyla birlikte ucuncu kez basiyordu. Kapali. */
    if(!window.BT_KAPAK_KATMANI) return;
    if(!node || !title || node.querySelector(':scope>.bt-cover-ui'))return;
    node.classList.add('bt-cover-enhanced');
    const template=coverTemplate(node.closest('.news-card,.latest-item,.story-card,.editorial-special-card,.article-page')||node,title);
    node.dataset.coverTemplate=template;
    const kicker=compact?categoryText(node.closest('.news-card,.latest-item,.story-card,.editorial-special-card')||node):categoryText(node);
    const meta=sourceText(node.closest('.news-card,.latest-item,.story-card,.editorial-special-card')||node);
    const ui=document.createElement('div');
    ui.className='bt-cover-ui';
    ui.setAttribute('aria-hidden','true');
    ui.innerHTML =
      '<span class="bt-cover-kicker">' + esc(kicker || 'HABER') + '</span>' +
      '<span class="bt-cover-headline">' + headlineHtml(title) + '</span>' +
      '<span class="bt-cover-meta">' + esc(meta) + '</span>';
    const style={
      "01-impact":["#e5232e","#d4a52c","Arial Narrow,Arial,sans-serif"],
      "02-field":["#050505","#d4a52c","Arial Narrow,Arial,sans-serif"],
      "03-magazine":["#d4a52c","#d4a52c","Georgia,serif"],
      "04-data":["#050505","#d4a52c","Arial Narrow,Arial,sans-serif"],
      "05-minimal":["rgba(5,5,5,.82)","#d4a52c","Arial,sans-serif"]
    }[template]||["#050505","#d4a52c","Arial,sans-serif"];
    const k=ui.querySelector('.bt-cover-kicker'),h=ui.querySelector('.bt-cover-headline'),m=ui.querySelector('.bt-cover-meta');
    k.style.background=style[0]; k.style.color=template==='03-magazine'?'#050505':style[1]; k.style.borderLeft='3px solid '+style[1];
    h.style.fontFamily=style[2]; h.style.fontWeight='800';
    h.style.fontSize='clamp(24px,4vw,58px)'; h.style.lineHeight='.92';
    h.style.textShadow='0 3px 18px rgba(0,0,0,.55)';
    if(template==='03-magazine'){ui.style.color='#111';h.style.color='#111';h.style.textShadow='none';h.style.borderBottom='3px solid '+style[1];}
    if(template==='05-minimal'){h.style.color=style[1];h.style.textShadow='none';}
    node.appendChild(ui);
  }

  function scan(root=document){
    root.querySelectorAll('.news-media,.story-card,.editorial-special-card,.latest-kapak,.article-cover-wrap').forEach(el=>{
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

  function injectEditorialContent(){
    if(document.getElementById('bt-editorial-layer')) return;
    // Yalniz anasayfa: haber sayfasinda ve portalda bu bolumun stili yok,
    // blok haberin ustunde bicimsiz duz metin olarak gorunuyordu.
    if(!document.querySelector('.cinematic-hero')) return;
    const hero=document.querySelector('.hero,.cinematic-hero');
    const main=document.querySelector('main');
    if(!main) return;
    const section=document.createElement('section');
    section.id='bt-editorial-layer';
    section.className='bt-editorial-layer';
    section.setAttribute('aria-labelledby','bt-editorial-title');
    section.innerHTML=`
      <div class="bt-editorial-head">
        <div><p class="bt-editorial-kicker">BTMEDYA / EDITORIAL DESK</p><h2 id="bt-editorial-title">SAHADAN<br><span>YAYINA.</span></h2></div>
        <p>Gerçek çekim, doğrulanabilir kaynak ve güçlü anlatı. Haber ile marka içeriğini ayırıyor; AI üretimlerini açıkça AI LAB olarak işaretliyoruz.</p>
      </div>
      <div class="bt-editorial-grid">
        <a class="bt-editorial-card bt-editorial-news" href="/haberler/"><small>01 / HABER</small><strong>Bugünün sahasını keşfet</strong><span>Balıkesir ve çevresinden kaynaklı haber, röportaj ve özel dosyalar.</span><b>Haber akışına git ↗</b></a>
        <a class="bt-editorial-card" href="/kaynaklar/"><small>02 / KAYNAK</small><strong>Kaynağı gör, hikâyeyi anla</strong><span>Resmî kaynaklar, açık veri ve saha notlarıyla içerik zincirini takip et.</span><b>Kaynak Masası ↗</b></a>
        <a class="bt-editorial-card" href="/video-produksiyon/"><small>03 / STUDIO</small><strong>Fikirden çekime, çekimden yayına</strong><span>Düğün klibi, tanıtım, röportaj, belgesel, kısa film, reklam ve sosyal içerik.</span><b>Studio'yu keşfet ↗</b></a>
        <a class="bt-editorial-card" href="/sosyal-medya/"><small>04 / SOCIAL</small><strong>İçerik sadece üretilmez, dağıtılır</strong><span>Platforma uygun kısa video, kapak, metin ve yayın akışıyla markanın görünürlüğünü destekle.</span><b>Sosyal medya ↗</b></a>
        <a class="bt-editorial-card" href="/ai-lab/"><small>05 / AI LAB</small><strong>Yapay zekâ, etiketiyle.</strong><span>AI destekli görsel, video, web ve otomasyon deneyleri ana editoryal akıştan ayrı tutulur.</span><b>AI LAB ↗</b></a>
        <a class="bt-editorial-card" href="/vaka-calismalari/"><small>06 / VAKA</small><strong>İşin sonucunu göster</strong><span>Marka hikâyeleri, prodüksiyon süreçleri ve yayın sonrası çıktılar tek yerde.</span><b>Vaka çalışmalarını gör ↗</b></a>
      </div>
      <div class="bt-editorial-strip"><span>EDITORYAL KURAL</span><strong>GERÇEK SAHA ÖNCE · KAYNAK AÇIK · AI ETİKETLİ · SPONSORLU İÇERİK AYRI</strong><a href="/kaynaklar/">Nasıl çalışıyoruz? ↗</a></div>`;
    if(hero && hero.parentNode===main) hero.insertAdjacentElement('afterend',section); else main.insertBefore(section,main.firstElementChild?.nextElementSibling||main.firstChild);
  }

  function init(){
    scan();
    fixMobileSaha();
    injectEditorialContent();
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