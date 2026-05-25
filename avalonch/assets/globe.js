// Typed headline + rotating globe (home page only)
(function typeHeadline(){
  const h = document.getElementById('typed-headline');
  if (!h) return;
  const lines = Array.from(h.querySelectorAll('.t-line'));
  const texts = lines.map(el => el.dataset.text || '');
  lines.forEach(el => el.textContent = '');
  let li = 0, ci = 0;
  const speed = 36;       // steady ms per char (no jitter)
  const linePause = 120;  // short break between lines
  function tick(){
    if (li >= lines.length) { h.classList.add('done'); return; }
    const target = texts[li];
    if (ci < target.length) {
      const ch = target.charAt(ci);
      const span = document.createElement('span');
      span.className = 'tch';
      // preserve spaces in the typed-out reveal
      span.textContent = ch === ' ' ? '\u00a0' : ch;
      lines[li].appendChild(span);
      // next frame -> trigger transition
      requestAnimationFrame(() => span.classList.add('in'));
      ci++;
      setTimeout(tick, speed);
    } else {
      li++; ci = 0;
      setTimeout(tick, linePause);
    }
  }
  setTimeout(tick, 240);
})();

(async function initGlobe(){
  const canvas = document.getElementById('globe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2;
  const R = W * 0.42;

  function loadScript(src){
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
  } catch(e){ console.warn('Globe libs failed', e); return; }

  let world, countries, borders, land;
  try {
    const r = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
    world = await r.json();
    countries = topojson.feature(world, world.objects.countries);
    borders   = topojson.mesh(world, world.objects.countries, (a,b) => a !== b);
    land      = topojson.feature(world, world.objects.land);
  } catch(e){ console.warn('Topo failed', e); return; }

  let lambda = 20;
  const phi  = -15;
  window.__globe = window.__globe || {};
  window.__globe.spinSpeed = 0.18;
  const projection = d3.geoOrthographic()
    .scale(R)
    .translate([cx, cy])
    .clipAngle(90)
    .rotate([lambda, phi]);
  const path = d3.geoPath(projection, ctx);
  const graticule = d3.geoGraticule10();

  function drawGraticule(){
    ctx.beginPath(); path(graticule);
    ctx.strokeStyle = 'rgba(200,200,210,0.10)'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function drawLand(){
    ctx.beginPath(); path(land);
    ctx.fillStyle = 'rgba(80,95,60,0.35)'; ctx.fill();
    ctx.beginPath(); path(borders);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.beginPath(); path({type: 'FeatureCollection', features: countries.features});
    ctx.strokeStyle = 'rgba(230,235,210,0.7)'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function drawSphere(){
    const g = ctx.createRadialGradient(cx - R*0.25, cy - R*0.25, R*0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(30,30,38,0.95)');
    g.addColorStop(0.7, 'rgba(12,12,14,1)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.fill();
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a00';
    const rgb = hexToRgb(accent);
    ctx.strokeStyle = `rgba(${rgb},0.35)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.stroke();
  }
  function drawAtmosphere(){
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a00';
    const rgb = hexToRgb(accent);
    const g = ctx.createRadialGradient(cx, cy, R*0.98, cx, cy, R*1.08);
    g.addColorStop(0, `rgba(${rgb},0.18)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R*1.08, 0, Math.PI*2); ctx.fill();
  }
  function hexToRgb(h){
    h = h.replace('#','');
    if (h.length === 3) h = h.split('').map(c=>c+c).join('');
    const n = parseInt(h, 16);
    return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
  }
  const CITIES = [
    [77.2, 28.6],[-74.0, 40.7],[139.7, 35.7],[-43.2, -22.9],
    [37.6, 55.7],[31.2, 30.0],[151.2, -33.9],[-0.1, 51.5],
    [114.1, 22.3],[28.0, -26.2],
  ];
  function isVisible(lon, lat){
    const r = projection.rotate();
    const lr = (lon + r[0]) * Math.PI / 180;
    const pr = lat * Math.PI / 180;
    const phir = r[1] * Math.PI / 180;
    const cosLat = Math.cos(pr), sinLat = Math.sin(pr);
    const cosLon = Math.cos(lr);
    const Z = cosLat * cosLon;
    const Y = sinLat;
    const Z2 = Y * Math.sin(phir) + Z * Math.cos(phir);
    return Z2 > 0;
  }
  function drawCities(t){
    CITIES.forEach((c, i) => {
      if (!isVisible(c[0], c[1])) return;
      const xy = projection(c);
      if (!xy) return;
      const pulse = 0.5 + 0.5 * Math.sin(t/600 + i);
      ctx.fillStyle = `rgba(255,138,0,${0.6 + 0.4*pulse})`;
      ctx.beginPath(); ctx.arc(xy[0], xy[1], 4, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(255,138,0,${0.3*pulse})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(xy[0], xy[1], 8 + 6*pulse, 0, Math.PI*2); ctx.stroke();
    });
  }
  function frame(t){
    lambda = (lambda + (window.__globe.spinSpeed || 0.18)) % 360;
    projection.rotate([lambda, phi]);
    ctx.clearRect(0,0,W,H);
    drawAtmosphere(); drawSphere(); drawGraticule(); drawLand(); drawCities(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

const hud = document.querySelector('.hud span:first-child');
if (hud && hud.textContent.trim()) hud.innerHTML = `<span class="blink"></span>LAT 28.2552°N — LON 77.2997°E — ALT 30,000+ M`;
