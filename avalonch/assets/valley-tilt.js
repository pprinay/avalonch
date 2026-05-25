/* ============================================================
   AVALONCH — Valley battlespace image: drag-to-tilt 3D perspective
   ============================================================ */
(function () {
  'use strict';

  // The image lives inside Products page. Wait for it to be present.
  function init() {
    const img = document.querySelector('.vly-mesh-img');
    if (!img) return false;

    // ---------- state ----------
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let rotY = 0, rotX = 0;          // current tilt in degrees
    let velY = 0, velX = 0;          // velocity for inertia after release
    let rafId = 0;

    // Tunables
    const MAX_TILT     = 22;         // max degrees of tilt either axis
    const SENSITIVITY  = 0.18;       // pixels-to-degrees ratio (lower = subtler)
    const INERTIA      = 0.92;       // velocity decay per frame
    const RETURN_SPEED = 0.06;       // ease-back-to-zero rate when released

    function applyTransform() {
      // Drag right → rotateY positive (right edge tilts back, left comes forward)
      // For "right edge comes forward" feel, invert Y rotation:
      //   we use rotateY(-rotY)
      // Drag down → rotateX positive (top edge tilts back, bottom forward)
      //   so rotateX(rotX) is correct
      // Tiny scale during tilt to give it more "lifting off the page" feel
      const lift = (Math.abs(rotX) + Math.abs(rotY)) / MAX_TILT;  // 0..2
      const scale = 1 + Math.min(lift * 0.015, 0.03);
      img.style.transform =
        `perspective(1400px) rotateX(${rotX}deg) rotateY(${-rotY}deg) scale(${scale})`;
    }

    function tick() {
      if (isDragging) {
        // Drag mode — JS writes transforms directly each frame via pointer events.
        // No animation loop needed here.
        rafId = 0;
        return;
      }

      // Release mode — apply velocity decay (fling), then ease toward 0.
      let stillMoving = false;

      if (Math.abs(velY) > 0.01 || Math.abs(velX) > 0.01) {
        rotY += velY;
        rotX += velX;
        velY *= INERTIA;
        velX *= INERTIA;
        // Clamp
        rotY = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotY));
        rotX = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotX));
        stillMoving = true;
      } else {
        // Ease back to zero (flat)
        if (Math.abs(rotY) > 0.05) { rotY *= (1 - RETURN_SPEED); stillMoving = true; }
        else                       { rotY = 0; }
        if (Math.abs(rotX) > 0.05) { rotX *= (1 - RETURN_SPEED); stillMoving = true; }
        else                       { rotX = 0; }
      }

      applyTransform();

      if (stillMoving) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    }

    function startLoop() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    // ---------- pointer handlers ----------
    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;  // left-click only
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      velY = 0; velX = 0;
      img.classList.add('dragging');
      img.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const dRotY = dx * SENSITIVITY;
      const dRotX = -dy * SENSITIVITY;   // up-drag = top tilts back (rotX positive)

      rotY = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotY + dRotY));
      rotX = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotX + dRotX));

      velY = dRotY;
      velX = dRotX;

      applyTransform();
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      img.classList.remove('dragging');
      img.releasePointerCapture?.(e.pointerId);
      startLoop();   // begin the fling/return animation
    }

    img.addEventListener('pointerdown',   onPointerDown);
    img.addEventListener('pointermove',   onPointerMove);
    img.addEventListener('pointerup',     onPointerUp);
    img.addEventListener('pointercancel', onPointerUp);
    img.addEventListener('pointerleave',  onPointerUp);

    return true;
  }

  // Try immediately, then on DOMContentLoaded, then watch for the products page
  // to become active (it's a SPA in the single-file build, so the image may not
  // exist on first attempt if the user starts on Home).
  if (!init()) {
    document.addEventListener('DOMContentLoaded', () => {
      if (!init()) {
        // SPA: the image only exists once the Products page renders.
        // Re-attempt every time a page change fires.
        window.addEventListener('avalonch:pagechange', () => init());
      }
    });
  }
})();

/* ============================================================
   VALLEY USE CASES — Defense / Civil tab switcher
   Wires the .vly-uc-tab buttons to toggle which .vly-uc-pane is visible.
   ============================================================ */
(function valleyUseCaseTabs() {
  function init() {
    const tabs = document.querySelectorAll('.vly-uc-tab');
    if (!tabs.length) return false;
    const panes = {
      defense: document.getElementById('vly-uc-defense'),
      civil:   document.getElementById('vly-uc-civil')
    };
    tabs.forEach(t => t.addEventListener('click', () => {
      const target = t.dataset.uc;
      tabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
      t.classList.add('active'); t.setAttribute('aria-selected', 'true');
      Object.entries(panes).forEach(([key, pane]) => {
        if (!pane) return;
        if (key === target) { pane.hidden = false;  pane.classList.add('active'); }
        else                { pane.hidden = true;   pane.classList.remove('active'); }
      });
    }));
    return true;
  }
  if (!init()) {
    document.addEventListener('DOMContentLoaded', () => {
      if (!init()) {
        // SPA: Products page may not yet exist in DOM. Retry on pagechange.
        window.addEventListener('avalonch:pagechange', () => init());
      }
    });
  }
})();
