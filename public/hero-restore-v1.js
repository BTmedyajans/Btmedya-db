/* BTMEDYA poster-first hero: intentionally no autoplay and no sound layer. */
(() => {
  const root = document.querySelector('.bt-home-hero.hero-review[data-click-to-play]');
  if (!root) return;

  const video = root.querySelector('.bt-clean-hero-video');
  const button = root.querySelector('#heroToggle');
  const status = root.querySelector('#heroStatus');
  const breakpoint = window.matchMedia('(max-width: 720px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!video || !button || !status) return;

  const asset = (path) => new URL(path, window.location.origin).href;
  const sourceForViewport = () => breakpoint.matches
    ? {
        poster: asset('/assets/hero/btmedya-hero-mobile-poster.jpg'),
        video: asset('/assets/hero/btmedya-hero-mobile-v2.mp4'),
      }
    : {
        poster: asset('/assets/hero/btmedya-hero-web-poster.jpg'),
        video: asset('/assets/hero/btmedya-hero-web-v2.mp4'),
      };

  let selected = sourceForViewport();
  let loadedSource = '';
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'none';
  video.poster = selected.poster;
  button.hidden = false;
  status.textContent = reduced.matches
    ? 'Azaltılmış hareket tercihiniz etkin. Poster gösteriliyor; film yalnızca siz başlatırsanız oynar.'
    : 'Video başlamadı; hareketsiz poster gösteriliyor.';

  const setPlayingState = (playing) => {
    root.classList.toggle('hero-video-playing', playing);
    button.setAttribute('aria-pressed', String(playing));
  };

  const duraklat = (message) => {
    if (!video.paused) video.pause();
    setPlayingState(false);
    button.textContent = video.currentTime > 0 && !video.ended
      ? 'Filmi sürdür · sessiz'
      : 'Filmi başlat · sessiz';
    if (message) status.textContent = message;
  };

  const yenidenSec = () => {
    const next = sourceForViewport();
    if (next.video === selected.video) return;
    const wasLoaded = Boolean(loadedSource);
    duraklat('Ekran yönü değişti; uygun poster hazır. Oynatmak için düğmeye basın.');
    selected = next;
    video.poster = selected.poster;
    if (wasLoaded) {
      video.removeAttribute('src');
      video.load();
      loadedSource = '';
    }
  };

  button.addEventListener('click', async () => {
    if (!video.paused) {
      duraklat('Video duraklatıldı.');
      return;
    }
    try {
      if (video.ended) video.currentTime = 0;
      if (loadedSource !== selected.video) {
        video.src = selected.video;
        video.load();
        loadedSource = selected.video;
      }
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      await video.play();
      status.textContent = 'Tanıtım filmi sessiz oynatılıyor.';
    } catch {
      setPlayingState(false);
      status.textContent = 'Video açılamadı; poster ve hizmet bilgileri görünür kalıyor.';
      button.textContent = 'Filmi yeniden dene · sessiz';
      loadedSource = '';
    }
  });

  video.addEventListener('play', () => {
    setPlayingState(true);
    button.textContent = 'Filmi duraklat · sessiz';
    status.textContent = 'Tanıtım filmi sessiz oynatılıyor.';
  });
  video.addEventListener('pause', () => {
    setPlayingState(false);
    if (!video.ended) button.textContent = video.currentTime > 0
      ? 'Filmi sürdür · sessiz'
      : 'Filmi başlat · sessiz';
  });
  video.addEventListener('ended', () => {
    video.currentTime = 0;
    duraklat('Tanıtım filmi sona erdi; yeniden izlemek için düğmeye basın.');
  });
  video.addEventListener('error', () => {
    setPlayingState(false);
    status.textContent = 'Video yüklenemedi; poster ve hizmet bilgileri görünür kalıyor.';
    button.textContent = 'Filmi yeniden dene · sessiz';
    loadedSource = '';
  });

  const viewportChanged = () => yenidenSec();
  if (typeof breakpoint.addEventListener === 'function') breakpoint.addEventListener('change', viewportChanged);
  else if (typeof breakpoint.addListener === 'function') breakpoint.addListener(viewportChanged);
  window.addEventListener('resize', viewportChanged, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting === false && !video.paused) {
        duraklat('Ekran dışına çıktığı için video duraklatıldı; sürdürmek için düğmeye basın.');
      }
    }, { threshold: 0.15 }).observe(root);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !video.paused) {
      duraklat('Sekme arka plana alındığı için video duraklatıldı.');
    }
  });
})();
