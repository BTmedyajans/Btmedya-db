(()=>{
  const banner=document.querySelector('#pwaInstall');
  const button=document.querySelector('#pwaInstallButton');
  let deferredPrompt=null;
  const show=()=>{if(banner)banner.hidden=false};
  if('serviceWorker' in navigator){navigator.serviceWorker.register('/admin/sw.js',{scope:'/admin/'}).then(reg=>reg.update()).catch(()=>{});}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show();});
  button?.addEventListener('click',async()=>{
    if(!deferredPrompt){show();return;}
    deferredPrompt.prompt();
    try{await deferredPrompt.userChoice;}finally{deferredPrompt=null;}
  });
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;if(banner)banner.hidden=true;});
  if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone){if(banner)banner.hidden=true;}
  setTimeout(show,1800);
})();
