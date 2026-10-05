(() => {
  const banner = document.querySelector('#pwaInstall');
  const button = document.querySelector('#pwaInstallButton');
  let deferredPrompt = null;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).catch(() => {});
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (banner) banner.hidden = false;
  });

  button?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (banner) banner.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (banner) banner.hidden = true;
  });
})();
