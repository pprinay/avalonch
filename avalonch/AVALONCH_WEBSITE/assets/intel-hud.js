/* ============================================================
   AVALONCH — Intelligence Briefing HUD interactions
   ============================================================ */
(function () {
  'use strict';

  const hud = document.querySelector('.intel-hud');
  if (!hud) return;

  // Add corner brackets dynamically
  ['tl','tr','bl','br'].forEach(p => {
    const c = document.createElement('span');
    c.className = 'ih-corner ' + p;
    hud.appendChild(c);
  });

  // Auto-update the date in the header to "today" so the briefing
  // looks live every visit (12 MAY 2026 → whatever today is)
  const dateEl = document.getElementById('intel-date');
  if (dateEl) {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const d = new Date();
    dateEl.textContent =
      String(d.getDate()).padStart(2,'0') + ' ' +
      months[d.getMonth()] + ' ' +
      d.getFullYear();
  }

  // Number tick-up animation — runs when stat tiles scroll into view
  // Each <.is-num-anim data-target="X"> counts from 0 → X over ~1.2s easing
  const nums = hud.querySelectorAll('.is-num-anim');

  function animateNum(el) {
    const target = parseFloat(el.dataset.target);
    if (isNaN(target)) return;
    // Decide precision: 2.72 → 2 decimals, 4.5 → 1 decimal, 10/55 → 0 decimals
    const targetStr = String(target);
    const decimals = targetStr.includes('.') ? targetStr.split('.')[1].length : 0;
    const duration = 1400;
    const start = performance.now();
    // Easing — cubic ease-out so it decelerates as it lands
    const ease = t => 1 - Math.pow(1 - t, 3);
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const v = target * ease(p);
      el.textContent = v.toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  }

  // Trigger when stats are visible (or immediately if already in view)
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const stat = entry.target;
            stat.querySelectorAll('.is-num-anim').forEach(animateNum);
            io.unobserve(stat);
          }
        });
      }, { threshold: 0.25 })
    : null;

  hud.querySelectorAll('.intel-stat').forEach(stat => {
    if (io) io.observe(stat);
    else stat.querySelectorAll('.is-num-anim').forEach(animateNum);
  });
})();
