/* BTMEDYA TECH GLASS · accessible intro audio control
   The film remains muted for safe autoplay. Sound starts only after an explicit
   user gesture and the control disappears with the video-end category panel. */
(()=>{
  const root=document.querySelector('.cinematic-hero[data-bt-clean-hero]');
  const film=root?.querySelector('.bt-clean-hero-video');
  if(!root||!film||root.querySelector('.bt-intro-audio-control'))return;

  const button=document.createElement('button');
  button.type='button';
  button.className='bt-intro-audio-control';
  button.setAttribute('aria-label','Giriş videosunun sesini aç');
  button.setAttribute('aria-pressed','false');
  button.title='Giriş videosunun sesini aç';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="bt-audio-wave" d="M16 9a5 5 0 0 1 0 6M18.5 6.5a8.5 8.5 0 0 1 0 11"/></svg>';
  root.appendChild(button);

  const sync=()=>{
    const on=!film.muted&&film.volume>0;
    button.setAttribute('aria-pressed',String(on));
    button.setAttribute('aria-label',on?'Giriş videosunun sesini kapat':'Giriş videosunun sesini aç');
    button.title=on?'Giriş videosunun sesini kapat':'Giriş videosunun sesini aç';
    button.classList.toggle('is-sound-on',on);
    const wave=button.querySelector('.bt-audio-wave');
    if(wave)wave.style.opacity=on?'1':'.25';
  };
  // The hero's legacy pointer handler unmutes on pointerup; stop it here so
  // this explicit toggle doesn't immediately toggle the sound back off.
  button.addEventListener('pointerup',event=>event.stopPropagation());
  button.addEventListener('click',async event=>{
    event.preventDefault();
    event.stopPropagation();
    film.muted=!film.muted;
    if(!film.muted){
      try{await film.play();}catch{film.muted=true;}
    }
    sync();
  });
  film.addEventListener('volumechange',sync);
  film.addEventListener('ended',()=>button.classList.add('is-hidden'),{once:true});
  film.addEventListener('error',()=>button.classList.add('is-hidden'),{once:true});
  root.addEventListener('transitionend',()=>{if(root.classList.contains('is-finished'))button.classList.add('is-hidden');});
  sync();
})();
