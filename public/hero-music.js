/* BTMEDYA intro music: music only, no voice or source-video audio.
   AudioContext is resumed only after a user gesture; playback is stopped
   when the intro ends, fails, the tab is hidden, or the page is left. */
(() => {
  const film = document.querySelector('.bt-clean-hero-video');
  if (!film) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let context = null;
  let master = null;
  let oscillators = [];
  let started = false;
  let stopped = false;
  let timeoutId = 0;

  const unlockEvents = ['pointerdown', 'touchstart', 'keydown'];
  const removeUnlockListeners = () => {
    for (const type of unlockEvents) {
      document.removeEventListener(type, startMusic);
    }
  };

  async function startMusic() {
    if (started || stopped || film.ended) return;
    try {
      context ||= new AudioContextClass();
      await context.resume();
      if (context.state !== 'running' || stopped) return;

      started = true;
      removeUnlockListeners();

      master = context.createGain();
      master.gain.setValueAtTime(0.032, context.currentTime);
      master.connect(context.destination);

      const tempo = 108;
      const step = 60 / tempo;
      const notes = [110, 138.59, 164.81, 146.83, 123.47, 146.83, 164.81, 185];
      let time = context.currentTime + 0.05;

      for (let i = 0; i < 64; i++) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(notes[i % notes.length], time);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.055, time + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + step * 0.78);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.start(time);
        oscillator.stop(time + step);
        oscillators.push(oscillator);

        if (i % 2 === 0) {
          const bass = context.createOscillator();
          const bassGain = context.createGain();
          bass.type = 'sine';
          bass.frequency.setValueAtTime(55, time);
          bassGain.gain.setValueAtTime(0.0001, time);
          bassGain.gain.exponentialRampToValueAtTime(0.08, time + 0.01);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
          bass.connect(bassGain);
          bassGain.connect(master);
          bass.start(time);
          bass.stop(time + 0.18);
          oscillators.push(bass);
        }
        time += step;
      }

      timeoutId = window.setTimeout(() => { void stopMusic(); }, (step * 64 + 0.3) * 1000);
    } catch {
      if (context && context.state !== 'closed') {
        try { await context.close(); } catch {}
      }
      context = null;
      started = false;
    }
  }

  async function stopMusic() {
    if (stopped) return;
    stopped = true;
    removeUnlockListeners();
    window.clearTimeout(timeoutId);

    if (context && context.state !== 'closed') {
      const now = context.currentTime;
      try {
        if (master) {
          master.gain.cancelScheduledValues(now);
          master.gain.setTargetAtTime(0, now, 0.025);
        }
      } catch {}
      for (const oscillator of oscillators) {
        try { oscillator.stop(now + 0.08); } catch {}
      }
      await new Promise(resolve => window.setTimeout(resolve, 100));
      try { await context.close(); } catch {}
    }
    oscillators = [];
  }

  for (const type of unlockEvents) {
    document.addEventListener(type, startMusic, { passive: type !== 'keydown' });
  }
  film.addEventListener('ended', () => { void stopMusic(); }, { once: true });
  film.addEventListener('error', () => { void stopMusic(); }, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void stopMusic();
  });
  window.addEventListener('pagehide', () => { void stopMusic(); }, { once: true });
})();
