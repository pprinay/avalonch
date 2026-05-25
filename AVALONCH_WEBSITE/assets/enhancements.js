/* ============================================================
   AVALONCH — Enhancement layer (JS)
   Pure additive. Safe to inject on top of any page in the bundle.
   ============================================================ */
(function () {
  'use strict';

  /* ----- HERO BACKGROUND VIDEO — force play, suppress fallback play button ----- */
  (function heroVideo(){
    const v = document.querySelector('.hero-bg-video-el');
    if (!v) return;
    // Ensure muted (required for autoplay everywhere) and playsinline
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    // Disable any media UI on supporting browsers (newer attribute)
    try { v.disablePictureInPicture = true; } catch(e) {}
    try { v.controls = false; v.removeAttribute('controls'); } catch(e) {}
    // Try to play; if blocked, retry on first user interaction
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    // Retry on visibility change (some browsers pause when tab hidden)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tryPlay();
    });
    // Last-resort: play on first pointer/touch event anywhere
    const wakeOnInteract = () => {
      tryPlay();
      document.removeEventListener('pointerdown', wakeOnInteract);
      document.removeEventListener('touchstart', wakeOnInteract);
    };
    document.addEventListener('pointerdown', wakeOnInteract, { passive: true });
    document.addEventListener('touchstart', wakeOnInteract, { passive: true });
  })();

  /* ----- AVALONCH INTRO — decryption reveal (once per session) ----- */
  (function bootIntro(){
    // Gate on sessionStorage so it only plays first visit / reload
    let alreadyPlayed = false;
    try { alreadyPlayed = sessionStorage.getItem('avalonch_intro') === '1'; } catch(e) {}
    let navType = 'navigate';
    try {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) navType = navEntry.type;
    } catch(e) {}
    const shouldPlay = (navType === 'navigate' && !alreadyPlayed) || navType === 'reload';
    if (!shouldPlay) return;
    try { sessionStorage.setItem('avalonch_intro', '1'); } catch(e) {}

    const WORD = 'AVALONCH';
    // Uppercase Latin only — consistent widths in the display font, no layout shift per frame
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const FLICKER_MS  = 55;     // ms per glyph swap during scramble
    const STAGGER_MS  = 175;    // ms between each char locking left-to-right
    const SCRAMBLE_MS = 800;    // how long the FIRST char scrambles before locking
    // Total decrypt time = SCRAMBLE_MS + (WORD.length - 1) * STAGGER_MS

    const sk = document.createElement('div');
    sk.className = 'fp-skeleton';

    const wrap = document.createElement('div');
    wrap.className = 'decrypt';
    const chars = WORD.split('').map((ch) => {
      const span = document.createElement('span');
      span.className = 'c scrambling';
      span.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      span.dataset.target = ch;
      wrap.appendChild(span);
      return span;
    });

    const line = document.createElement('div');
    line.className = 'line';

    const tag = document.createElement('div');
    tag.className = 'tagline';
    tag.textContent = 'SHAPING THE DETERRENCE';

    sk.appendChild(wrap);
    sk.appendChild(line);
    sk.appendChild(tag);
    document.body.appendChild(sk);

    // Per-character lock time (when its scramble ENDS and the letter locks)
    const lockAt = chars.map((_, i) => SCRAMBLE_MS + i * STAGGER_MS);
    const fullDecryptMs = lockAt[lockAt.length - 1];

    // Single rAF loop driving ALL flickers — smooth, no setInterval jitter
    const t0 = performance.now();
    const lastFlipAt = chars.map(() => 0);

    function tick(now) {
      const t = now - t0;
      let anyStillFlickering = false;
      for (let i = 0; i < chars.length; i++) {
        const span = chars[i];
        if (t >= lockAt[i]) {
          // Lock it (idempotent — only does anything if not already locked)
          if (span.classList.contains('scrambling')) {
            span.textContent = span.dataset.target;
            span.classList.remove('scrambling');
            span.classList.add('locked');
          }
        } else {
          anyStillFlickering = true;
          // Flicker at FLICKER_MS cadence per char
          if (t - lastFlipAt[i] >= FLICKER_MS) {
            // Bias toward the target letter as we approach lock time so it feels like it's resolving
            const progress = t / lockAt[i];  // 0..1
            const useTarget = Math.random() < progress * 0.4;
            span.textContent = useTarget ? span.dataset.target : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            lastFlipAt[i] = t;
          }
        }
      }
      if (anyStillFlickering) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);

    // After all chars locked: draw the line, then fade in the tagline
    setTimeout(() => { line.classList.add('draw'); }, fullDecryptMs + 250);
    setTimeout(() => { tag.classList.add('show');  }, fullDecryptMs + 650);

    // Hide overlay after the full sequence
    const HOLD_MS = 950;
    const totalMs = fullDecryptMs + 650 + HOLD_MS;
    setTimeout(() => sk.classList.add('hide'), totalMs);
    setTimeout(() => sk.remove(),               totalMs + 800);
  })();

  /* ----- NAV CLOCKS (IST + ET + CET) ----- */
  (function navClock(){
    const navLinks = document.querySelector('.nav .nav-links');
    if (!navLinks) return;

    // Build a container with three clocks side by side
    const wrap = document.createElement('div');
    wrap.className = 'nav-clocks';
    wrap.innerHTML = ''
      + '<div class="nav-clock"><span class="dot"></span><span class="t" data-zone="IST">--:--:--</span> <span class="tz">IST</span></div>'
      + '<div class="nav-clock"><span class="dot"></span><span class="t" data-zone="ET">--:--:--</span> <span class="tz">ET</span></div>'
      + '<div class="nav-clock"><span class="dot"></span><span class="t" data-zone="CET">--:--:--</span> <span class="tz">CET</span></div>';
    navLinks.parentNode.insertBefore(wrap, navLinks);

    const elIst = wrap.querySelector('[data-zone="IST"]');
    const elEt  = wrap.querySelector('[data-zone="ET"]');
    const elCet = wrap.querySelector('[data-zone="CET"]');

    function tick() {
      const pad = n => String(n).padStart(2,'0');
      const now = new Date();

      // Use Intl.DateTimeFormat for proper timezone math (handles DST automatically for NY + Paris)
      try {
        const istFmt = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const etFmt = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'America/New_York',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        const cetFmt = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Paris',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        elIst.textContent = istFmt.format(now);
        elEt.textContent  = etFmt.format(now);
        elCet.textContent = cetFmt.format(now);
      } catch(e) {
        // Fallback: approximate (no DST math). ET = UTC-5, CET = UTC+1.
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utcMs + 5.5 * 3600000);
        const et  = new Date(utcMs - 5 * 3600000);
        const cet = new Date(utcMs + 1 * 3600000);
        elIst.textContent = pad(ist.getHours()) + ':' + pad(ist.getMinutes()) + ':' + pad(ist.getSeconds());
        elEt.textContent  = pad(et.getHours())  + ':' + pad(et.getMinutes())  + ':' + pad(et.getSeconds());
        elCet.textContent = pad(cet.getHours()) + ':' + pad(cet.getMinutes()) + ':' + pad(cet.getSeconds());
      }
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ----- SITE-WIDE ORANGE CROSSHAIR CURSOR ----- */
  (function siteCrosshair(){
    // Skip on touch devices — no custom cursor without a real pointer
    if (matchMedia('(pointer: coarse)').matches || !matchMedia('(hover: hover)').matches) {
      document.body.classList.add('no-custom-cursor');
      return;
    }

    // Build the reticle (snaps to cursor) and the trail ring (lerps toward it)
    const ch = document.createElement('div');
    ch.className = 'hero-crosshair';
    ch.innerHTML = `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="22" cy="22" r="14" fill="none" stroke="#ff8a00" stroke-width="1" opacity="0.92"/>
      <circle cx="22" cy="22" r="2"  fill="#ff8a00"/>
      <line x1="22" y1="0"  x2="22" y2="9"  stroke="#ff8a00" stroke-width="1"/>
      <line x1="22" y1="35" x2="22" y2="44" stroke="#ff8a00" stroke-width="1"/>
      <line x1="0"  y1="22" x2="9"  y2="22" stroke="#ff8a00" stroke-width="1"/>
      <line x1="35" y1="22" x2="44" y2="22" stroke="#ff8a00" stroke-width="1"/>
      <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,138,0,0.18)" stroke-width="0.5"/>
    </svg>`;
    document.body.appendChild(ch);

    const trail = document.createElement('div');
    trail.className = 'hero-crosshair-trail';
    document.body.appendChild(trail);

    // Target = where cursor is now. Trail chases this with a lerp.
    let tx = -100, ty = -100;     // current mouse position (offscreen initially)
    let trailX = tx, trailY = ty; // current trail position
    let everMoved = false;
    let running = false;          // rAF active or not
    let rafId = 0;

    // Reduced-motion users get a trail that snaps with the reticle (no lerp animation)
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick() {
      // Reticle: snap to target — single transform write
      ch.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';

      // Trail: lerp toward target. If close enough, snap and stop the loop.
      const dx = tx - trailX;
      const dy = ty - trailY;
      const dist2 = dx*dx + dy*dy;

      if (reducedMotion) {
        trailX = tx; trailY = ty;
      } else if (dist2 > 0.5) {
        trailX += dx * 0.22;
        trailY += dy * 0.22;
      } else {
        trailX = tx; trailY = ty;
      }
      trail.style.transform = 'translate3d(' + trailX + 'px,' + trailY + 'px,0)';

      // Stop the rAF when motion has settled — saves cycles when the mouse parks.
      // Resumes on next pointermove.
      if (dist2 < 0.25) {
        running = false;
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    function startLoop() {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    }

    function onMove(e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!everMoved) {
        everMoved = true;
        trailX = tx; trailY = ty;
        ch.classList.add('show');
        trail.classList.add('show');
      }
      startLoop();
    }

    // Single event source. pointermove covers mouse + pen with unified semantics.
    // passive:true lets the browser optimize event delivery.
    window.addEventListener('pointermove', onMove, { passive: true });

    // Hide while the cursor is off-window
    document.addEventListener('mouseleave', () => {
      ch.classList.remove('show');
      trail.classList.remove('show');
    });
    document.addEventListener('mouseenter', () => {
      if (!everMoved) return;
      ch.classList.add('show');
      trail.classList.add('show');
    });

    // Pause when tab loses focus, resume on focus
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        running = false;
      } else if (everMoved) {
        startLoop();
      }
    });
  })();

  /* ----- SCROLL REVEAL ----- */
  (function scrollReveal(){
    // Tag selectors to reveal — grouped logically with stagger
    const groups = [
      { sel: '.deploy-cta-inner', stagger: 0 },
      { sel: '.recog',          stagger: 0   },
      { sel: '.ank-shead',      stagger: 0   },
      { sel: '.variant',        stagger: 140 },
      { sel: '.vly-hero',       stagger: 0   },
      { sel: '.vly-mesh',       stagger: 0   },
      { sel: '.partner-card',   stagger: 60  },
    ];

    groups.forEach(g => {
      const els = document.querySelectorAll(g.sel);
      els.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', (i * g.stagger) + 'ms');
      });
    });

    if (!('IntersectionObserver' in window)) {
      // Fallback: just reveal everything immediately
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  })();

  /* ----- NUMBER TICKER for cap-metrics ----- */
  (function numberTicker(){
    const els = document.querySelectorAll('.cap-metrics .v');
    if (!els.length || !('IntersectionObserver' in window)) return;
    els.forEach(el => {
      // Capture the original "number + unit" content, ticker only the number
      const html = el.innerHTML;
      const m = html.match(/^(\d+[\d,]*)/);
      if (!m) return;
      const target = parseInt(m[1].replace(/,/g, ''), 10);
      if (!target) return;
      const rest = html.slice(m[0].length);
      const numNode = document.createElement('span');
      numNode.textContent = '0';
      const restNode = document.createElement('span');
      restNode.innerHTML = rest;
      el.innerHTML = '';
      el.appendChild(numNode);
      el.appendChild(restNode);
      el.dataset.target = target;
      el.dataset.played = '0';
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.dataset.played === '1') return;
        el.dataset.played = '1';
        const numNode = el.firstChild;
        const target = parseInt(el.dataset.target, 10);
        const dur = 1100;
        const start = performance.now();
        function frame(now) {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          const cur = Math.floor(eased * target);
          numNode.textContent = cur.toLocaleString('en-US');
          if (t < 1) requestAnimationFrame(frame);
          else numNode.textContent = target.toLocaleString('en-US');
        }
        requestAnimationFrame(frame);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    els.forEach(el => io.observe(el));
  })();

  /* ----- DEPLOY CTA PARTICLES ----- */
  (function deployParticles(){
    const inner = document.querySelector('.deploy-cta-inner');
    if (!inner) return;
    const wrap = document.createElement('div');
    wrap.className = 'particles';
    const N = 26;
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span');
      const x = Math.random() * 100;
      const y = 80 + Math.random() * 30;            // start low
      const dx = (Math.random() - 0.5) * 200;
      const dy = -(120 + Math.random() * 180);
      const dur = 11 + Math.random() * 10;
      const delay = -Math.random() * dur;            // negative delay = mid-animation
      s.style.left = x + '%';
      s.style.top  = y + '%';
      s.style.setProperty('--dx', dx + 'px');
      s.style.setProperty('--dy', dy + 'px');
      s.style.setProperty('--dur', dur + 's');
      s.style.setProperty('--delay', delay + 's');
      wrap.appendChild(s);
    }
    inner.insertBefore(wrap, inner.firstChild);
  })();

})();
