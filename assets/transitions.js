// Page transitions disabled — navigate instantly for no perceived lag.
(function () {
  // Body is opacity:0 by default for the entrance fade; flip it on immediately
  // so the page is visible without delay.
  document.documentElement.classList.add('no-transitions');
  document.body.classList.add('page-in');
  window.addEventListener('pageshow', function () {
    document.body.classList.remove('page-out');
    document.body.classList.add('page-in');
  });
})();

// Products page: split-tab switcher (Hardware / Software)
(function () {
  const tabs = document.querySelectorAll('.split-tab');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      // toggle tabs
      document.querySelectorAll('.split-tab').forEach(t => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      // toggle panes
      document.querySelectorAll('.split-pane').forEach(p => {
        p.classList.toggle('active', p.id === target + '-pane');
      });
      // scroll into view smoothly
      const pane = document.getElementById(target + '-pane');
      if (pane) pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
