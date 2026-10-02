/* BTMEDYA hero: 3 müşteri girişi
   Haber / Medya / AI Hizmetleri. Tıklama mevcut sahneyi keser, sahneyi
   seçilen yöne taşır ve hedef görüntüyü öne alır. Fare üzerine geldiğinde
   de sahne çok küçük bir yön tepkisi verir. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root)return;
  const copy={
    haber:{kicker:'01 / HABER',source:'GERÇEK ÇEKİM · SAHA',title:'HABERİ SAHADA BUL.',lead:'Balıkesir ve çevresinden kaynaklı haber, röportaj, video haber ve özel dosyalar.',link:'/haberler/'},
    medya:{kicker:'02 / MEDYA',source:'GERÇEK ÇEKİM · PRODÜKSİYON',title:'HİKÂYENİ İÇERİĞE ÇEVİR.',lead:'Tanıtım, düğün klibi, sosyal medya, Siyah Oda, belgesel ve kısa film üretimini tek akışta planla.',link:'/hizmetler/'},
    ai:{kicker:'03 / AI HİZMETLERİ',source:'AI LAB · AÇIKÇA ETİKETLİ',title:'YENİ NESİL ÜRETİMİ BAĞLA.',lead:'AI video, görsel, otomasyon ve web deneyimlerini gerçek medya üretiminin yanına bağla.',link:'/ai-lab/'}
  };
  const targets={haber:root.querySelector('[data-video="haber"]'),medya:root.querySelector('[data-video="medya"]'),ai:root.querySelector('.cinematic-ai-visual')};
  const buttons=document.createElement('div');buttons.className='hero-three-choice';buttons.setAttribute('aria-label','BTMEDYA müşteri hizmetleri');
  buttons.innerHTML='<small>NE ÜRETMEK İSTİYORSUN?</small><button type="button" data-choice="haber">HABER</button><button type="button" data-choice="medya">MEDYA</button><button type="button" data-choice="ai">AI HİZMETLERİ</button>';
  root.querySelector('.cinematic-sticky')?.appendChild(buttons);
  const allVisuals=[...root.querySelectorAll('.cinematic-video'),root.querySelector('.cinematic-ai-visual')].filter(Boolean);
  const title=root.querySelector('[data-cinematic-title]');
  const kicker=root.querySelector('[data-cinematic-kicker]');
  const source=root.querySelector('[data-cinematic-kaynak]');
  const lead=root.querySelector('[data-cinematic-lead]');
  const actions=root.querySelector('.cinematic-actions');
  let active='haber';
  let timer=0;
  const loadAndPlay=(target)=>{
    const v=target?.querySelector('video');
    if(!v)return;
    if(!v.src && v.dataset.src){v.src=v.dataset.src;v.load();}
    v.currentTime=0;
    v.play?.().catch(()=>{});
  };
  const setCopy=(key)=>{
    const c=copy[key];if(!c)return;
    if(kicker)kicker.textContent=c.kicker;
    if(source)source.textContent=c.source;
    if(title)title.innerHTML=c.title.replace(' ','<br>');
    if(lead)lead.textContent=c.lead;
    const link=actions?.querySelector('.button-dark');if(link)link.href=c.link;
  };
  const choose=(key,dir)=>{
    if(!targets[key] || key===active)return;
    const current=targets[active];const next=targets[key];
    root.dataset.choice=key;root.dataset.choiceDirection=dir;root.classList.add('hero-choice-transition');
    current?.classList.add('is-choice-current');next?.classList.add('is-choice-next');
    current?.querySelector('video')?.pause?.();
    loadAndPlay(next);
    allVisuals.forEach(v=>v.classList.remove('is-active'));
    next.classList.add('is-active');
    setCopy(key);active=key;
    buttons.querySelectorAll('button').forEach(b=>b.classList.toggle('is-active',b.dataset.choice===key));
    window.clearTimeout(timer);timer=window.setTimeout(()=>{
      allVisuals.forEach(v=>v.classList.remove('is-choice-current','is-choice-next'));
      root.classList.remove('hero-choice-transition');
    },620);
  };
  buttons.querySelectorAll('button').forEach(b=>{
    const key=b.dataset.choice;
    const dir=key==='haber'?'left':key==='medya'?'right':'up';
    b.addEventListener('mouseenter',()=>{root.style.setProperty('--choice-hover-x',dir==='left'?'-1':dir==='right'?'1':'0');root.style.setProperty('--choice-hover-y',dir==='up'?'-1':'0');});
    b.addEventListener('focus',()=>{root.style.setProperty('--choice-hover-x',dir==='left'?'-1':dir==='right'?'1':'0');root.style.setProperty('--choice-hover-y',dir==='up'?'-1':'0');});
    b.addEventListener('click',()=>choose(key,dir));
  });
  buttons.querySelector('[data-choice="haber"]')?.classList.add('is-active');
  root.dataset.choice='haber';setCopy('haber');
})();