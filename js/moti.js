// Live Moti: the app's Rive file, driven by the same triggers as iOS and Android
(() => {
  const canvas = document.getElementById('moti-canvas');
  if (!canvas || !window.rive) return;
  rive.RuntimeLoader.setWasmUrl('../js/vendor/rive.wasm');
  const buttons = [...document.querySelectorAll('.moti-btn')];
  let moti;
  const fire = (name) => { const t = moti && moti.viewModelInstance && moti.viewModelInstance.trigger(name); if (t) t.trigger(); };
  const start = () => {
    moti = new rive.Rive({
      src: '../assets/projects/motameet-app/moti/moti.riv',
      canvas,
      autoplay: true,
      autoBind: true,
      stateMachine: 'State Machine 1',
      layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.Center }),
      onLoad: () => { moti.resizeDrawingSurfaceToCanvas(); fire('motiWave'); },
    });
    window.__moti = moti;
  };
  buttons.forEach((b) => b.addEventListener('click', () => fire(b.dataset.trigger)));
  canvas.addEventListener('click', () => fire(buttons[Math.floor(Math.random() * buttons.length)].dataset.trigger));
  window.addEventListener('resize', () => moti && moti.resizeDrawingSurfaceToCanvas());
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { start(); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(canvas);
  } else start();
})();
