/* ============================================================
   AVALONCH — Ankosha gallery + demo (inline expand)
   ============================================================ */
(function () {
  'use strict';

  // Resolve image paths through the inline data-URI map when present
  // (single-file build); otherwise leave them as on-disk paths.
  function resolveImages(scope) {
    if (!window.__AV_IMAGE_MAP) return;
    scope.querySelectorAll('img[src^="assets/"]').forEach(img => {
      const path = img.getAttribute('src');
      if (Object.prototype.hasOwnProperty.call(window.__AV_IMAGE_MAP, path)) {
        img.setAttribute('src', window.__AV_IMAGE_MAP[path]);
      }
    });
  }

  // Generic inline-expand toggler used for both Gallery and Demo
  function wireToggle(triggerId, panelId, { openLabel, closedLabel, onOpen, onClose } = {}) {
    const trigger = document.getElementById(triggerId);
    const panel   = document.getElementById(panelId);
    if (!trigger || !panel) return;

    const labelEl = trigger.querySelector('.btn-gallery-label');
    const baseLabel = labelEl ? labelEl.textContent : '';

    trigger.addEventListener('click', () => {
      const isHidden = panel.hasAttribute('hidden');
      if (isHidden) {
        panel.removeAttribute('hidden');
        trigger.setAttribute('aria-expanded', 'true');
        if (labelEl) labelEl.textContent = openLabel || ('Hide ' + baseLabel);
        if (typeof onOpen === 'function') onOpen(panel);
        requestAnimationFrame(() => {
          const top = panel.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top, behavior: 'smooth' });
        });
      } else {
        panel.setAttribute('hidden', '');
        trigger.setAttribute('aria-expanded', 'false');
        if (labelEl) labelEl.textContent = closedLabel || baseLabel;
        if (typeof onClose === 'function') onClose(panel);
      }
    });
  }

  // GALLERY
  const galleryPanel = document.getElementById('ank-gallery');
  if (galleryPanel) resolveImages(galleryPanel);
  wireToggle('open-gallery', 'ank-gallery', {
    openLabel:   'Hide Gallery',
    closedLabel: 'Gallery'
  });

  // DEMO
  wireToggle('open-demo', 'ank-demo', {
    openLabel:   'Hide Demo',
    closedLabel: 'Demo',
    onOpen(panel) {
      const v = panel.querySelector('.ank-demo-video');
      if (!v) return;
      const stage = panel.querySelector('.ank-demo-stage');
      // If the video has already failed to load, mark the stage
      if (stage && v.error) stage.classList.add('error');
      v.addEventListener('error', () => {
        if (stage) stage.classList.add('error');
      }, { once: true });
      // Try to autoplay muted (browsers allow this without user interaction).
      // If autoplay still fails for any reason, leave the controls so the
      // user can press play manually.
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* swallow */ });
    },
    onClose(panel) {
      const v = panel.querySelector('.ank-demo-video');
      if (!v) return;
      v.pause();
      // Reset to start so reopening plays from the top
      try { v.currentTime = 0; } catch(e) {}
    }
  });
})();

