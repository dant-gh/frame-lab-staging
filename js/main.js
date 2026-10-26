// Header border on scroll
const header = document.querySelector('.site-header');
const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Reveal elements as they enter the viewport
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('is-in'));
}

// Current year
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

// ---------- Image viewer: tap a project image to open it full screen, pinch / double-tap to zoom, drag to pan ----------
(() => {
  const touchUI = window.matchMedia('(max-width: 900px), (pointer: coarse)');
  const selector = 'main .case-section img, main .case-hero ~ section img, main .wall img';
  const imgs = [...document.querySelectorAll(selector)].filter((i) => !i.closest('a.card') && !i.closest('iframe'));
  if (!imgs.length) return;

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image viewer');
  lb.innerHTML = '<div class="lb-bar"><span>Pinch or double-tap to zoom</span><button type="button" aria-label="Close">×</button></div><div class="lb-stage"><img alt=""></div>';
  document.body.appendChild(lb);
  const stage = lb.querySelector('.lb-stage'), view = stage.querySelector('img'), closeBtn = lb.querySelector('button');

  let fit = 1, scale = 1, x = 0, y = 0, max = 4, lastFocus = null;
  const apply = () => { view.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
  const clamp = () => {
    const w = view.naturalWidth * scale, h = view.naturalHeight * scale, W = stage.clientWidth, H = stage.clientHeight;
    x = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, x));
    y = h <= H ? (H - h) / 2 : Math.min(0, Math.max(H - h, y));
  };
  // fit to width (tall images scroll vertically); never start larger than 1:1
  const reset = () => {
    const W = stage.clientWidth, H = stage.clientHeight, nw = view.naturalWidth, nh = view.naturalHeight;
    fit = Math.min(W / nw, 1);
    if (nh * fit < H) fit = Math.min(W / nw, H / nh, 1);
    scale = fit; max = Math.max(fit * 4, 2); x = 0; y = 0; clamp(); apply();
  };
  const zoomAt = (s, cx, cy) => {
    s = Math.min(max, Math.max(fit, s));
    x = cx - (cx - x) * (s / scale); y = cy - (cy - y) * (s / scale); scale = s; clamp(); apply();
  };

  const open = (img) => {
    lastFocus = document.activeElement;
    // show the viewer first so the stage has real dimensions, then size the image
    lb.classList.add('is-open');
    document.body.classList.add('lb-lock');
    view.alt = img.alt || '';
    view.onload = () => requestAnimationFrame(reset);
    view.src = img.currentSrc || img.src;
    if (view.complete && view.naturalWidth) requestAnimationFrame(reset);
    history.pushState({ lb: true }, '');
    closeBtn.focus();
  };
  const close = (fromHistory) => {
    if (!lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open');
    document.body.classList.remove('lb-lock');
    if (!fromHistory && history.state && history.state.lb) history.back();
    if (lastFocus) lastFocus.focus();
  };

  imgs.forEach((img) => {
    img.classList.add('zoomable');
    img.addEventListener('click', (e) => {
      if (!touchUI.matches) return;      // desktop keeps normal behaviour
      e.preventDefault();
      open(img);
    });
  });
  closeBtn.addEventListener('click', () => close(false));
  window.addEventListener('popstate', () => close(true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
  window.addEventListener('resize', () => { if (lb.classList.contains('is-open')) reset(); });

  // pointer gestures: one finger pans, two fingers pinch, double tap toggles zoom
  const pts = new Map();
  let startDist = 0, startScale = 1, lastTap = 0, moved = false;
  const rel = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, rel(e)); moved = false;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; startDist = Math.hypot(a[0] - b[0], a[1] - b[1]); startScale = scale; }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = rel(e); pts.set(e.pointerId, cur);
    if (pts.size === 1) { x += cur[0] - prev[0]; y += cur[1] - prev[1]; if (Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]) > 2) moved = true; clamp(); apply(); }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); moved = true; zoomAt(startScale * d / startDist, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  });
  const up = (e) => {
    const p = pts.get(e.pointerId); pts.delete(e.pointerId);
    if (!p || moved || pts.size) return;
    const now = Date.now();
    if (now - lastTap < 300) { zoomAt(scale > fit * 1.05 ? fit : Math.min(max, fit * 2.5), p[0], p[1]); lastTap = 0; } else lastTap = now;
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
  stage.addEventListener('wheel', (e) => { e.preventDefault(); const [cx, cy] = rel(e); zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), cx, cy); }, { passive: false });
})();

// ---------- Animated shots: load and play each GIF only while it is on screen ----------
(() => {
  const imgs = document.querySelectorAll('img[data-gif]');
  if (!imgs.length || !('IntersectionObserver' in window)) { imgs.forEach((i) => { i.src = i.dataset.gif; }); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: img, isIntersecting }) => {
      if (!img.dataset.still) img.dataset.still = img.getAttribute('src');
      const want = isIntersecting ? img.dataset.gif : img.dataset.still;
      if (img.getAttribute('src') !== want) img.src = want;
    });
  }, { rootMargin: '150px 0px' });
  imgs.forEach((i) => io.observe(i));
})();

// Creative wall: shuffle the tiles on every visit
(() => {
  const wall = document.querySelector('.wall--tiles');
  if (!wall) return;
  const tiles = [...wall.children];
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  tiles.forEach((t) => wall.appendChild(t));
})();

// Slideshows: show one frame at a time (data-interval in ms)
document.querySelectorAll('.slideshow').forEach((show) => {
  const slides = [...show.querySelectorAll('.slide')];
  const cap = show.querySelector('.slideshow-cap');
  const count = show.querySelector('.slideshow-count');
  if (slides.length < 2) return;
  let i = 0;
  setInterval(() => {
    slides[i].classList.remove('is-active');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-active');
    if (cap) cap.textContent = slides[i].dataset.cap || slides[i].alt;
    if (count) count.textContent = `${i + 1} / ${slides.length}`;
  }, +show.dataset.interval || 500);
});
