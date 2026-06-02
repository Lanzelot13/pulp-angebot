/* =====================================================================
   PULPMEDIA · PITCH DECK · JS
   - Logo randomizer
   - Custom cursor follow
   - Lenis smooth scroll (story mode only)
   - Intersection reveals + letter split
   - Counter animations
   - Mode toggle (story <-> slides)
   - Embed adapters: YouTube, TikTok, Instagram, native video
   - Pager + progress + keyboard nav
   ===================================================================== */

(() => {
  // ---------- LOGOS ----------
  const PRIMARY_LOGO = `<svg viewBox="0 0 430 100" xmlns="http://www.w3.org/2000/svg" aria-label="Pulpmedia">
    <path d="M110,0h50v50h25V0h25v100h-50c-27.6,0-50-22.4-50-50h0V0Z"/>
    <path d="M75,0H0v100h50v-50h25l25-25L75,0ZM18.6,40.4V9.7l18.4,15.4-18.4,15.4Z"/>
    <path d="M295,50h-25V0h-50v50c0,27.6,22.4,50,50,50h25l25-25-25-25ZM257,37.1h-24.1V13h24.1v24.1Z"/>
    <g><path d="M356.6,71.8v5h5c0-2.7-2.2-5-5-5Z"/><path d="M348.5,76.7h5v-5c-2.7,0-5,2.2-5,5Z"/><path d="M405,0h-75v100h50v-50h25c13.8,0,25-11.2,25-25S418.8,0,405,0ZM365,82.4h-5v5h-2.5v-4.9h-1.3v4.9h-2.3v-4.9h-1.3v4.9h-2.6v-5h-5v-9.9c0-5.5,4.4-9.9,9.9-9.9s9.9,4.4,9.9,9.9v9.9Z"/></g>
  </svg>`;
  // Add more logo variants here; user uploads more later
  window.LOGOS = window.LOGOS || [PRIMARY_LOGO];
  const logoEl = document.getElementById('logoSlot');
  if (logoEl) logoEl.innerHTML = window.LOGOS[Math.floor(Math.random() * window.LOGOS.length)];

  // ---------- CURSOR ----------
  const cursor = document.getElementById('cursor');
  if (cursor) {
    addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
    const hoverables = 'a, button, [data-cursor=hover], .slide.saeulen .pillar, .slide.leistungen .it';
    document.addEventListener('mouseover', (e) => { if (e.target.closest(hoverables)) cursor.classList.add('hover'); });
    document.addEventListener('mouseout',  (e) => { if (e.target.closest(hoverables)) cursor.classList.remove('hover'); });
    document.addEventListener('mousedown', () => cursor.classList.add('click'));
    document.addEventListener('mouseup',   () => cursor.classList.remove('click'));
  }

  // ---------- LENIS (story mode only) ----------
  let lenis = null;
  function startLenis() {
    if (lenis || !window.Lenis) return;
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    function raf(t) { if (lenis) { lenis.raf(t); requestAnimationFrame(raf); } }
    requestAnimationFrame(raf);
  }
  function stopLenis() {
    if (!lenis) return;
    lenis.destroy();
    lenis = null;
  }

  // ---------- LETTER SPLIT ----------
  function splitNode(el) {
    if (el.dataset.splitDone === '1') return;
    el.dataset.splitDone = '1';
    const wrap = (node) => {
      const text = node.nodeValue;
      const frag = document.createDocumentFragment();
      [...text].forEach((ch) => {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode('\u00A0'));
        } else {
          const s = document.createElement('span');
          s.className = 'reveal-char';
          s.textContent = ch;
          frag.appendChild(s);
        }
      });
      node.parentNode.replaceChild(frag, node);
    };
    const walk = (n) => {
      const kids = [...n.childNodes];
      kids.forEach((k) => {
        if (k.nodeType === 3) wrap(k);
        else if (k.nodeType === 1 && !k.classList.contains('reveal-char')) walk(k);
      });
    };
    walk(el);
    const chars = el.querySelectorAll('.reveal-char');
    chars.forEach((c, i) => c.style.transitionDelay = (i * 0.035 + 0.05) + 's');
  }
  document.querySelectorAll('[data-split]').forEach(splitNode);

  // ---------- INTERSECTION REVEAL ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('revealed'); });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.slide').forEach((s) => io.observe(s));
  requestAnimationFrame(() => document.querySelector('.slide')?.classList.add('revealed'));

  // ---------- COUNTERS ----------
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.target);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const dur = parseInt(el.dataset.duration || '1800', 10);
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const ease = 1 - Math.pow(1 - t, 3);
        const val = target * ease;
        el.textContent = dec ? val.toFixed(dec) : Math.round(val).toLocaleString('de-AT');
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-counter]').forEach((el) => counterIO.observe(el));

  // ---------- EMBED ADAPTERS ----------
  function ytEmbedUrl(id, opts = {}) {
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      controls: opts.controls ?? '1',
      autoplay: opts.autoplay ?? '0',
      mute: opts.mute ?? (opts.autoplay ? '1' : '0'),
      loop: opts.loop ?? '0',
      playsinline: '1',
    });
    if (opts.loop) params.set('playlist', id);
    return `https://www.youtube.com/embed/${id}?${params}`;
  }
  function buildEmbed(slot) {
    const type = (slot.dataset.mediaType || '').toLowerCase();
    const id   = slot.dataset.mediaId || '';
    const url  = slot.dataset.mediaUrl || '';
    const opts = {
      autoplay: slot.dataset.autoplay === '1' ? '1' : '0',
      controls: slot.dataset.controls === '0' ? '0' : '1',
      mute:     slot.dataset.mute === '0' ? '0' : '1',
      loop:     slot.dataset.loop === '1' ? '1' : '0',
    };
    if (!type) return;
    slot.classList.add('embed-built');
    if (type === 'youtube' && id) {
      slot.innerHTML = `<iframe src="${ytEmbedUrl(id, opts)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    } else if (type === 'video' && (url || id)) {
      const src = url || id;
      const attrs = [
        opts.autoplay === '1' ? 'autoplay' : '',
        opts.mute === '1' ? 'muted' : '',
        opts.loop === '1' ? 'loop' : '',
        opts.controls === '1' ? 'controls' : '',
        'playsinline',
      ].filter(Boolean).join(' ');
      slot.innerHTML = `<video src="${src}" ${attrs}></video>`;
    } else if (type === 'tiktok' && (id || url)) {
      const u = url || `https://www.tiktok.com/@_/video/${id}`;
      slot.innerHTML = `<blockquote class="tiktok-embed embed" cite="${u}" data-video-id="${id}" style="max-width:100%"><a href="${u}"></a></blockquote>`;
      loadOnce('tiktok', 'https://www.tiktok.com/embed.js');
    } else if (type === 'instagram' && url) {
      slot.innerHTML = `<blockquote class="instagram-media embed" data-instgrm-permalink="${url}" data-instgrm-version="14" style="margin:0;max-width:100%;width:100%"></blockquote>`;
      loadOnce('instagram', 'https://www.instagram.com/embed.js', () => {
        if (window.instgrm?.Embeds?.process) window.instgrm.Embeds.process();
      });
    }
  }
  const _scriptsLoaded = {};
  function loadOnce(key, src, onLoad) {
    if (_scriptsLoaded[key]) { onLoad?.(); return; }
    _scriptsLoaded[key] = true;
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => onLoad?.();
    document.body.appendChild(s);
  }
  document.querySelectorAll('[data-media-type]').forEach(buildEmbed);

  // ---------- TEAM · load photo srcs from data-photo, auto-fill rest count ----------
  const teamGrid = document.querySelector('.slide.team .all-pulpies');
  if (teamGrid) {
    const pulpies = teamGrid.querySelectorAll('.pulpie');
    pulpies.forEach((p) => {
      const url = p.dataset.photo;
      const img = p.querySelector('.photo img');
      if (url && img && !img.src) img.src = url;
    });
    const attending = teamGrid.querySelectorAll('.pulpie[data-attending="1"]').length;
    const total = pulpies.length;
    const restEl = document.querySelector('[data-slot="team-rest-count"]');
    if (restEl) restEl.textContent = String(total - attending);
    const attEl = document.querySelector('[data-slot="team-attending-count"]');
    if (attEl) attEl.textContent = String(attending);
  }

  // ---------- PULP PATTERN (Statement-Slide) ----------
  function buildPulpPattern() {
    const grid = document.getElementById('pulpGrid');
    if (!grid) return;
    const cols = 5, rows = 5;
    grid.style.setProperty('--cols', cols);
    const PULP_SVG = `<svg viewBox="0 0 430 100" preserveAspectRatio="xMidYMid meet">
      <path d="M75,0H0v100h50v-50h25l25-25L75,0Z"/>
      <path d="M18.6,40.4V9.7l18.4,15.4-18.4,15.4Z"/>
      <path d="M110,0h50v50h25V0h25v100h-50c-27.6,0-50-22.4-50-50h0V0Z"/>
      <path d="M295,50h-25V0h-50v50c0,27.6,22.4,50,50,50h25l25-25-25-25ZM257,37.1h-24.1V13h24.1v24.1Z"/>
      <path d="M356.6,71.8v5h5c0-2.7-2.2-5-5-5Z"/>
      <path d="M348.5,76.7h5v-5c-2.7,0-5,2.2-5,5Z"/>
      <path d="M405,0h-75v100h50v-50h25c13.8,0,25-11.2,25-25S418.8,0,405,0ZM365,82.4h-5v5h-2.5v-4.9h-1.3v4.9h-2.3v-4.9h-1.3v4.9h-2.6v-5h-5v-9.9c0-5.5,4.4-9.9,9.9-9.9s9.9,4.4,9.9,9.9v9.9Z"/>
    </svg>`;
    const ICONS = ['skull','smiley','nice','heart-pixel-simple','bomb','blitz','blume','explosion-simple'];
    // "Slots" within the PULP wordmark where an icon fits visually (in % of 430x100)
    const SLOTS = [
      { x: 6,  y: 60 }, // first P bowl
      { x: 32, y: 25 }, // U inner
      { x: 56, y: 28 }, // L upper notch
      { x: 76, y: 70 }, // last P body
      { x: 86, y: 18 }, // last P dots area
    ];
    const total = cols * rows;
    let redIdx = Math.floor(Math.random() * total);
    const tiles = [];
    for (let i = 0; i < total; i++) {
      const tile = document.createElement('div');
      tile.className = 'pulp-tile' + (i === redIdx ? ' red' : '');
      tile.style.setProperty('--r', (Math.random() * 4 - 2).toFixed(2) + 'deg');
      tile.innerHTML = PULP_SVG;
      // Add 0–2 accent icons per tile
      const accentsCount = Math.random() > 0.55 ? (Math.random() > 0.6 ? 2 : 1) : 0;
      const usedSlots = new Set();
      for (let a = 0; a < accentsCount; a++) {
        let slot;
        let tries = 0;
        do { slot = SLOTS[Math.floor(Math.random() * SLOTS.length)]; tries++; } while (usedSlots.has(slot) && tries < 5);
        usedSlots.add(slot);
        const ic = ICONS[Math.floor(Math.random() * ICONS.length)];
        const ac = document.createElement('div');
        ac.className = 'ac';
        ac.style.setProperty('--ico', `url('assets/icons/${ic}.svg')`);
        ac.style.left = slot.x + '%';
        ac.style.top  = slot.y + '%';
        tile.appendChild(ac);
      }
      grid.appendChild(tile);
      tiles.push(tile);
    }
    // Rotate the red highlight to a new tile every few seconds
    setInterval(() => {
      tiles.forEach(t => t.classList.remove('red'));
      redIdx = Math.floor(Math.random() * tiles.length);
      tiles[redIdx].classList.add('red');
    }, 3200);
  }
  buildPulpPattern();

  // ---------- MODE TOGGLE ----------
  const body = document.body;
  const modeStory  = document.getElementById('modeStory');
  const modeSlides = document.getElementById('modeSlides');
  function setMode(mode) {
    if (mode === 'slides') {
      body.classList.add('mode-slides');
      modeStory?.classList.remove('on');
      modeSlides?.classList.add('on');
      stopLenis();
    } else {
      body.classList.remove('mode-slides');
      modeStory?.classList.add('on');
      modeSlides?.classList.remove('on');
      startLenis();
    }
    try { localStorage.setItem('pitch-mode', mode); } catch(_) {}
    updateBars();
  }
  modeStory?.addEventListener('click', () => setMode('story'));
  modeSlides?.addEventListener('click', () => setMode('slides'));
  const savedMode = (() => { try { return localStorage.getItem('pitch-mode'); } catch(_) { return null; } })();
  // Initial setMode call moved to end (after `updateBars` exists) to avoid TDZ on `progress`.

  // ---------- KEYBOARD NAV ----------
  const slides = [...document.querySelectorAll('.slide')];
  function gotoSlide(idx) {
    idx = Math.max(0, Math.min(slides.length - 1, idx));
    slides[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function currentSlideIdx() {
    const mid = scrollY + innerHeight * 0.45;
    let idx = 0;
    slides.forEach((s, i) => { if (s.offsetTop <= mid) idx = i; });
    return idx;
  }
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
      e.preventDefault();
      gotoSlide(currentSlideIdx() + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
      e.preventDefault();
      gotoSlide(currentSlideIdx() - 1);
    } else if (e.key === 'Home') {
      e.preventDefault(); gotoSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault(); gotoSlide(slides.length - 1);
    }
  });

  // ---------- PROGRESS + PAGER ----------
  const progress = document.getElementById('progress');
  const pagerCur = document.getElementById('pagerCur');
  const pagerTot = document.getElementById('pagerTot');
  const pagerLab = document.getElementById('pagerLabel');
  if (pagerTot) pagerTot.textContent = String(slides.length).padStart(2, '0');
  function updateBars() {
    const max = Math.max(1, document.body.scrollHeight - innerHeight);
    const p = Math.max(0, Math.min(1, scrollY / max));
    if (progress) progress.style.width = (p * 100) + '%';
    const idx = currentSlideIdx();
    if (pagerCur) pagerCur.textContent = String(idx + 1).padStart(2, '0');
    if (pagerLab) {
      const lbl = slides[idx]?.dataset.screenLabel || slides[idx]?.querySelector('h2')?.textContent || '';
      pagerLab.textContent = lbl.replace(/^\d+\s+/, '').slice(0, 32);
    }
  }
  addEventListener('scroll', updateBars, { passive: true });
  addEventListener('resize', updateBars, { passive: true });
  updateBars();

  // ---------- FLIP CARDS (Fragen + Tipps) ----------
  document.querySelectorAll('.flip-card').forEach((card) => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });

  // ---------- FULLSCREEN TOGGLE ----------
  const fsBtn = document.getElementById('fullscreenBtn');
  const fsEnter = fsBtn?.querySelector('.fs-enter');
  const fsExit  = fsBtn?.querySelector('.fs-exit');
  function isFs() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function updateFsIcon() {
    if (!fsBtn) return;
    if (isFs()) {
      if (fsEnter) fsEnter.style.display = 'none';
      if (fsExit)  fsExit.style.display  = '';
      fsBtn.setAttribute('aria-label', 'Vollbild verlassen');
      fsBtn.setAttribute('title', 'Vollbild verlassen (F)');
    } else {
      if (fsEnter) fsEnter.style.display = '';
      if (fsExit)  fsExit.style.display  = 'none';
      fsBtn.setAttribute('aria-label', 'Vollbild');
      fsBtn.setAttribute('title', 'Vollbild (F)');
    }
  }
  function toggleFs() {
    if (isFs()) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } else {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  }
  fsBtn?.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', updateFsIcon);
  document.addEventListener('webkitfullscreenchange', updateFsIcon);
  // Tastatur-Shortcut "F" (nicht in Eingabefeldern)
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFs();
    }
  });
  updateFsIcon();

  // ---------- APPLY SAVED MODE (after all bindings exist) ----------
  setMode(savedMode === 'story' ? 'story' : 'slides');
})();
