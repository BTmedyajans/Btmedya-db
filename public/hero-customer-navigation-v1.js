/* BTMEDYA Customer Hero Navigation v1
   Three customer choices: MEDYA, HABER, AI HİZMETLERİ.
   Pointer/tap chooses a direction, freezes the current hero motion briefly,
   then moves the active visual layer toward the chosen direction. */
(() => {
  const root = document.querySelector('.cinematic-hero');
  if (!root) return;
  const sticky = root.querySelector('.cinematic-sticky');
  if (!sticky) return;

  const choices = [
    { key:'medya', label:'MEDYA', scene:2, direction:'left', href:'/portfoy/' },
    { key:'haber', label:'HABER', scene:1, direction:'right', href:'/haberler/' },
    { key:'ai', label:'AI HİZMETLERİ', scene:4, direction:'up', href:'/ai-lab/' }
  ];

  let rail = root.querySelector('.hero-customer-choices');
  if (!rail) {
    rail = document.createElement('nav');
    rail.className = 'hero-customer-choices';
    rail.setAttribute('aria-label','Müşteri başlangıç seçenekleri');
    rail.innerHTML = choices.map((c,i) =>
      `<button type="button" data-choice="${c.key}" data-direction="${c.direction}" aria-label="${c.label}">${String(i+1).padStart(2,'0')} <span>${c.label}</span></button>`
    ).join('');
    sticky.appendChild(rail);
  }

  const videos = [...root.querySelectorAll('.cinematic-video video')];
  const ai = root.querySelector('.cinematic-ai-visual');
  let active = 0;
  let moving = false;
  let resetTimer = 0;

  function freezeCurrent() {
    videos.forEach(v => { if (!v.paused) v.pause(); });
  }
  function resume() {
    const v = videos[active];
    if (v && !matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(()=>{});
  }
  function moveVisual(direction) {
    const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    const dy = direction === 'up' ? -1 : 0;
    root.style.setProperty('--choice-x', `${dx * 7}vw`);
    root.style.setProperty('--choice-y', `${dy * 5}vh`);
    root.classList.remove('choice-left','choice-right','choice-up');
    root.classList.add(`choice-${direction}`);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      root.classList.remove('choice-left','choice-right','choice-up');
      root.style.setProperty('--choice-x','0vw');
      root.style.setProperty('--choice-y','0vh');
      resume();
    }, 850);
  }
  function activate(choice) {
    const c = choices.find(x => x.key === choice);
    if (!c || moving) return;
    moving = true;
    freezeCurrent();
    rail.querySelectorAll('button').forEach(b => {
      const on = b.dataset.choice === c.key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    active = c.scene;
    root.dispatchEvent(new CustomEvent('btsahne', {detail:{choice:c.key,scene:c.scene}}));
    moveVisual(c.direction);
    const v = videos[c.scene];
    if (v && !v.dataset.loaded && v.dataset.src) {
      v.src = v.dataset.src;
      v.dataset.loaded = '1';
      v.load();
    }
    if (v) {
      v.style.opacity = '1';
      v.style.zIndex = '5';
      v.play().catch(()=>{});
    }
    if (c.scene === 4 && ai) ai.style.opacity = '1';
    setTimeout(() => { moving = false; }, 500);
  }

  rail.addEventListener('click', e => {
    const b = e.target.closest('button[data-choice]');
    if (b) activate(b.dataset.choice);
  });

  sticky.addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    if (e.pointerType === 'mouse' && window.innerWidth < 900) return;
    const r = sticky.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (y < .32) activate('ai');
    else if (x < .42) activate('medya');
    else activate('haber');
  }, {passive:true});

  if (matchMedia('(hover:hover)').matches) {
    sticky.addEventListener('pointermove', e => {
      if (moving) return;
      const r = sticky.getBoundingClientRect();
      const x = ((e.clientX-r.left)/r.width-.5);
      const y = ((e.clientY-r.top)/r.height-.5);
      root.style.setProperty('--cursor-x', `${Math.max(-.5,Math.min(.5,x))*2.2}vw`);
      root.style.setProperty('--cursor-y', `${Math.max(-.5,Math.min(.5,y))*1.8}vh`);
    }, {passive:true});
  }
})();
