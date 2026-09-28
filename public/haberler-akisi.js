/* /haberler/ BTMEDYA live editorial flow v11.
   Third-party sites inform information architecture only. BTMEDYA serves its
   own reporting, archive records and licensed/owned media. */
(function () {
  'use strict';
  var grid=document.querySelector('#son-dakika');
  var yerelListe=document.querySelector('#balikesir .latest-list');
  var guncelListe=document.querySelector('#guncel-list');
  var guncelTarih=document.querySelector('#guncel-tarih');

  function loadCss(){
    if(document.querySelector('link[data-editorial-v11]')) return;
    var l=document.createElement('link');
    l.rel='stylesheet'; l.href='/haberler/editorial-v11.css'; l.dataset.editorialV11='1';
    document.head.appendChild(l);
  }
  function imgUrl(y){return String(y||'').replace(/(\/assets\/haber-kapak\/[^/]+)\.webp$/,'$1-foto.webp');}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});}
  function norm(s){return String(s||'').toLowerCase().replace(/ı/g,'i').normalize('NFD').replace(/[̀-ͯ]/g,'');}
  function local(n){return /(yerel|pazar|alisveris|altyapi|balikesir|gundem|asayis|yangin|afet)/.test(norm(n.category+' '+n.title));}
  function mainCat(n){return norm(String(n.category||'').split(/[·/]/)[0]).trim();}
  function source(n){try{return n.source_url?new URL(n.source_url).hostname.replace(/^www\./,''):'BTMEDYA';}catch(e){return 'BTMEDYA';}}
  function date(n){var t=n.published_at?new Date(n.published_at):null;return t&&!isNaN(t)?t.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'';}

  function row(n){
    var im=n.cover_url?'<span class="latest-kapak"><img src="'+esc(imgUrl(n.cover_url))+'" alt="" loading="lazy" decoding="async"></span>':'';
    return '<a class="latest-item'+(im?' kapakli':'')+'" href="/haberler/'+encodeURIComponent(n.slug)+'">'+im+
      '<span class="latest-metin"><small>'+esc(n.category||'HABER')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.excerpt||'')+
      '</p><span class="news-meta">'+esc(date(n))+' · <span class="source">Kaynak: '+esc(source(n))+'</span></span></span></a>';
  }
  function heroCard(n,big){
    var im=n.cover_url?'<img class="kart-gorsel" src="'+esc(imgUrl(n.cover_url))+'" alt="" loading="'+(big?'eager':'lazy')+'" decoding="async">':'';
    return im+'<div class="veil"></div><div class="inner"><span class="news-tag">'+esc(n.category||'HABER')+
      '</span>'+(big?'<h2>':'<h3>')+esc(n.title)+(big?'</h2>':'</h3>')+'<p>'+esc(n.excerpt||'')+
      '</p><div class="news-meta">'+esc(date(n))+' · '+esc(n.author||'BTMEDYA Haber Merkezi')+'</div></div>';
  }
  function choose(items){
    var first=items.filter(local)[0]||items[0], out=[first];
    items.forEach(function(n){if(out.length<3&&out.indexOf(n)<0&&out.every(function(x){return mainCat(x)!==mainCat(n);}))out.push(n);});
    items.forEach(function(n){if(out.length<3&&out.indexOf(n)<0)out.push(n);});
    return out;
  }

  function categoryMatch(n,key){
    if(key==='all')return true;
    var s=norm((n.title||'')+' '+(n.category||'')+' '+(n.excerpt||'');
    if(key==='balikesir')return local(n)||s.indexOf('balikesir')>-1;
    if(key==='ozel')return /ozel|dosya|saha|roportaj/.test(s);
    return s.indexOf(key)>-1;
  }
  function filter(items,key){
    var list=items.filter(function(n){return categoryMatch(n,key);});
    if(!list.length){if(guncelListe)guncelListe.innerHTML='<p class="disclaimer">Bu kategoride canlı yayınlanmış içerik bulunmuyor.</p>';return;}
    var loc=list.filter(local).slice(0,6);
    var rest=list.filter(function(n){return loc.indexOf(n)<0;}).slice(0,9);
    if(yerelListe)yerelListe.innerHTML=(loc.length?loc:list.slice(0,6)).map(row).join('');
    if(guncelListe)guncelListe.innerHTML=rest.map(row).join('');
  }
  function categoryBar(items){
    var old=document.querySelector('.news-category-bar');if(old)old.remove();
    var target=document.querySelector('.news-nav');if(!target)return;
    var groups=[['SON DAKİKA','all','breaking'],['BALIKESİR','balikesir'],['ALTIEYLÜL','altieylul'],['KARESİ','karesi'],['BANDIRMA','bandirma'],['EDREMİT','edremit'],['AYVALIK','ayvalik'],['ASAYİŞ','asayis'],['GÜNDEM','gundem'],['EKONOMİ','ekonomi'],['SPOR','spor'],['KÜLTÜR','kultur'],['EĞİTİM','egitim'],['SAĞLIK','saglik'],['TEKNOLOJİ','teknoloji'],['TURİZM','turizm'],['ÖZEL HABER','ozel']];
    var bar=document.createElement('nav');bar.className='news-category-bar';bar.setAttribute('aria-label','Haber kategorileri');
    groups.forEach(function(g,i){var a=document.createElement('a');a.href='#haber-akisi';a.textContent=g[0];if(g[2])a.className=g[2];if(i===0)a.classList.add('active');
      a.addEventListener('click',function(e){e.preventDefault();bar.querySelectorAll('a').forEach(function(x){x.classList.remove('active');});a.classList.add('active');filter(items,g[1]);});
      bar.appendChild(a);});
    target.after(bar);
  }
  function special(items){
    var old=document.querySelector('.editorial-special');if(old)old.remove();
    var c=items.filter(function(n){return n.cover_url;}).slice(0,3);if(!c.length)return;
    var s=document.createElement('section');s.className='editorial-special';s.id='haber-akisi';
    s.innerHTML='<div class="section-head"><div><h2>BTMEDYA Özel Haber</h2><p>Gerçek kapak görselleri · saha · kaynak · editoryal dosya</p></div></div>'+
      '<div class="editorial-special-grid">'+c.map(function(n,i){return '<a class="editorial-special-card'+(i===0?' featured':'')+'" href="/haberler/'+encodeURIComponent(n.slug)+'"><img src="'+esc(imgUrl(n.cover_url))+'" alt="" loading="lazy" decoding="async"><div class="editorial-special-copy"><small>'+esc(n.category||'SAHA HABERİ')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.excerpt||'')+'</p><div class="editorial-special-meta">'+esc(date(n))+' · '+esc(source(n))+'</div></div></a>';}).join('')+'</div>'+
      '<div class="editorial-source-note">BTMEDYA burada üçüncü taraf sitelerin metin veya görsellerini kopyalamaz. Kendi yayın kayıtları, gerçek kapak havuzu ve doğrulanmış kaynak künyeleri kullanılır.</div>';
    var anchor=document.querySelector('#balikesir');if(anchor)anchor.before(s);
  }
  function districts(items){
    var old=document.querySelector('.editorial-districts');if(old)old.remove();
    var names=['ALTIEYLÜL','KARESİ','BANDIRMA','EDREMİT','AYVALIK','BURHANİYE','GÖNEN','SUSURLUK'];
    var w=document.createElement('div');w.className='editorial-districts';
    names.forEach(function(name){var key=norm(name),count=items.filter(function(n){return categoryMatch(n,key);}).length,a=document.createElement('a');a.href='#haber-akisi';a.innerHTML='<b>'+esc(name)+'</b><span>'+count+' canlı içerik</span>';a.addEventListener('click',function(e){e.preventDefault();var b=document.querySelector('.news-category-bar');var l=b&&Array.prototype.slice.call(b.querySelectorAll('a')).find(function(x){return norm(x.textContent)===key;});if(l)l.click();});w.appendChild(a);});
    var anchor=document.querySelector('#balikesir');if(anchor)anchor.appendChild(w);
  }

  async function load(){
    loadCss();
    var r=await fetch('/api/news?limit=100',{headers:{Accept:'application/json'}});if(!r.ok)return;
    var j=await r.json(),published=(Array.isArray(j.items)?j.items:[]).filter(function(n){return n.status==='published';});
    var current=published.filter(function(n){return /^2026/.test(String(n.published_at||''))&&!/202[0-5]/.test(String(n.original_date||''));});
    if(!current.length)return;
    categoryBar(current);special(current);districts(current);
    var featured=choose(current);
    if(grid){var cards=grid.querySelectorAll('.news-card');featured.forEach(function(n,i){var el=cards[i];if(!el)return;el.href='/haberler/'+encodeURIComponent(n.slug);el.classList.remove('video-card');el.classList.add('gorselli');el.innerHTML=heroCard(n,i===0);});}
    var shown=featured.slice(),loc=current.filter(function(n){return local(n)&&shown.indexOf(n)<0;}).slice(0,6);shown=shown.concat(loc);
    var rest=current.filter(function(n){return shown.indexOf(n)<0;}).slice(0,9);
    if(yerelListe&&loc.length)yerelListe.innerHTML=loc.map(row).join('');
    if(guncelListe&&rest.length)guncelListe.innerHTML=rest.map(row).join('');
    if(guncelTarih)guncelTarih.textContent='Son güncelleme: '+date(current[0]);
  }
  load().catch(function(e){console.warn('Canlı haber akışı kullanılamadı',e);});

  var search=document.getElementById('archiveSearch'),archive=Array.prototype.slice.call(document.querySelectorAll('.archive-card'));
  if(search)search.addEventListener('input',function(){var q=search.value.toLocaleLowerCase('tr-TR').trim();archive.forEach(function(x){x.hidden=!!q&&!String(x.dataset.search||'').includes(q);});});
})();