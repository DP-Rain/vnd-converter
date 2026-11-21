import { BUILT_IN_RATE, BUILT_IN_DATE, vndToInr, inrToVnd, mentalFactor, realCosts, split, fmtInr, fmtVnd } from './calc.js';
import { NOTES, readOcrText, colourFamily, verdict, noteFor } from './notes.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- rate ----------
const okRate = (v) => Number.isFinite(v) && v > 100 && v < 1000;
const cleanDate = (d) => (typeof d === 'string' && /^[\w\- :]{0,20}$/.test(d) ? d : new Date().toISOString().slice(0, 10));
let rate = store.get('rate', null);
if (!rate || !okRate(Number(rate.v))) rate = { v: BUILT_IN_RATE, date: BUILT_IN_DATE, src: 'built-in' };
rate = { v: Number(rate.v), date: cleanDate(rate.date), src: String(rate.src).slice(0, 10) };
if (rate.src === 'live') rate.src = 'cached';
function showRate() {
  $('rateText').textContent = `1 ₹ = ${rate.v.toFixed(2)} ₫ · ${rate.date} · ${rate.src}`;
  render();
}
async function fetchRate() {
  const srcs = [
    ['https://open.er-api.com/v6/latest/INR', (j) => [j.rates.VND, (j.time_last_update_utc || '').slice(5, 16)]],
    ['https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json', (j) => [j.inr.vnd, j.date]],
  ];
  $('rateBtn').textContent = '…';
  for (const [url, pick] of srcs) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const [raw, date] = pick(await r.json());
      const v = Number(raw);
      if (okRate(v)) {
        rate = { v, date: cleanDate(date), src: 'live' };
        store.set('rate', rate); break;
      }
    } catch {}
  }
  $('rateBtn').textContent = '↻';
  showRate();
}
$('rateBtn').onclick = fetchRate;
$('manualSet').onclick = () => {
  const v = Number($('manualRate').value);
  if (okRate(v)) { rate = { v, date: new Date().toISOString().slice(0, 10), src: 'manual' }; store.set('rate', rate); showRate(); }
};

// ---------- converter ----------
let input = '0', reverse = false, people = 1;
function amounts() {
  const x = Number(input) || 0;
  return reverse ? { vnd: inrToVnd(x, rate.v), inr: x } : { vnd: x, inr: vndToInr(x, rate.v) };
}
function render() {
  const { vnd, inr } = amounts();
  const x = Number(input) || 0;
  $('inVal').textContent = x.toLocaleString(reverse ? 'en-IN' : 'en-US');
  $('inUnit').textContent = reverse ? '₹' : '₫';
  $('outVal').textContent = reverse ? fmtVnd(vnd) : fmtInr(inr);
  const k = mentalFactor(rate.v);
  $('hint').textContent = reverse ? `₹1 ≈ ${Math.round(rate.v)} ₫`
    : `Mental: drop 3 zeros × ${k} → ${Math.round(vnd / 1000)} × ${k} ≈ ₹${Math.round((vnd / 1000) * k)}`;
  const c = realCosts(vnd, rate.v);
  $('real').innerHTML =
    `<div>India-changer cash (238.2)<b>${fmtInr(c.changer)}</b></div>` +
    `<div>Burgundy card (+4.13%)<b>${fmtInr(c.burgundy)}</b></div>` +
    `<div>Niyo ATM (+₹499/withdrawal)<b>${fmtInr(c.niyo)}</b></div>` +
    `<div>Market rate<b>${fmtInr(c.market)}</b></div>`;
  const s = split(inr, people, Number($('tip').value));
  $('each').textContent = people > 1 || s.total !== inr ? `= ${fmtInr(s.each)} each` : '';
  $('people').textContent = people;
}
$('pad').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const k = b.dataset.k || b.textContent;
  if (k === 'back') input = input.length > 1 ? input.slice(0, -1) : '0';
  else if (k === 'clear') input = '0';
  else if (k === 'swap') { reverse = !reverse; input = '0'; }
  else if (k === 'log') return addLog();
  else if (input.length < 12) input = input === '0' ? String(Number(k)) : input + k;
  render();
};
document.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { people = Math.min(20, Math.max(1, people + Number(b.dataset.p))); render(); });
$('tip').onchange = render;

// ---------- log ----------
let log = store.get('log', []);
function addLog() {
  const { vnd, inr } = amounts(); if (!vnd) return;
  log.unshift({ t: Date.now(), vnd, inr }); store.set('log', log); renderLog();
  $('outVal').classList.add('ok'); setTimeout(() => $('outVal').classList.remove('ok'), 400);
}
function renderLog() {
  const tv = log.reduce((a, l) => a + l.vnd, 0);
  $('logTot').textContent = `Trip spend: ${fmtVnd(tv)} = ${fmtInr(vndToInr(tv, rate.v))}`;
  $('logList').innerHTML = log.map((l) => {
    const d = new Date(l.t);
    return `<li><span>${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ${fmtVnd(l.vnd)}</span><span>${fmtInr(l.inr)}</span></li>`;
  }).join('') || '<li><span>No spends yet — tap “+ Log” on Convert.</span></li>';
}
$('logClear').onclick = () => { if (log.length && confirm('Clear all logged spends?')) { log = []; store.set('log', log); renderLog(); } };

// ---------- notes guide ----------
$('noteList').innerHTML = NOTES.map((n) =>
  `<div class="note"><span class="sw" style="background:${n.hex}"></span><div><span class="v">${n.vnd.toLocaleString('en-US')}</span>
   <small>${n.colour} · back: ${n.back}</small></div><span class="r">${fmtInr(vndToInr(n.vnd, rate.v))}</span></div>`).join('');

// ---------- scan ----------
let stream = null, worker = null;
const abs = (p) => new URL(p, location.href).href;
async function getWorker() {
  if (!worker) {
    worker = await Tesseract.createWorker('eng', 1, {
      workerPath: abs('vendor/worker.min.js'), corePath: abs('vendor/core'), langPath: abs('vendor/lang'),
    });
    await worker.setParameters({ tessedit_pageseg_mode: '11' });   // sparse text: finds the big corner digits
  }
  return worker;
}
async function startCam() {
  if (stream || !navigator.mediaDevices) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } }, audio: false });
    $('video').srcObject = stream; await $('video').play();
  } catch (e) { $('scanOut').textContent = 'Camera blocked — use “Photo” button instead. (' + e.name + ')'; }
}
function stopCam() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }

// Map the dashed frame (inset 18% / 8% of the preview box) back to raw video pixels.
// The preview uses object-fit:cover, so the camera frame is scaled + centre-cropped.
function frameRect(vd) {
  const W = vd.clientWidth, H = vd.clientHeight, vw = vd.videoWidth, vh = vd.videoHeight;
  const k = Math.max(W / vw, H / vh);
  const visW = W / k, visH = H / k, ox = (vw - visW) / 2, oy = (vh - visH) / 2;
  return [ox + visW * 0.08, oy + visH * 0.18, visW * 0.84, visH * 0.64];
}

// crop → {gray, contrast, rgb}
function grab(src, [cx, cy, cw, ch]) {
  const scale = Math.min(1, 1600 / Math.max(cw, ch));
  const c = document.createElement('canvas'); c.width = Math.round(cw * scale); c.height = Math.round(ch * scale);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, cx, cy, cw, ch, 0, 0, c.width, c.height);
  const px = g.getImageData(0, 0, c.width, c.height);
  let r = 0, gg = 0, b = 0, n = 0;
  const d = px.data;
  for (let y = Math.floor(c.height * 0.2); y < c.height * 0.8; y += 4) {
    for (let x = Math.floor(c.width * 0.2); x < c.width * 0.8; x += 4) {
      const i = (y * c.width + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++;
    }
  }
  const hi = new ImageData(new Uint8ClampedArray(d), c.width, c.height);
  for (let i = 0; i < d.length; i += 4) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = v;
    hi.data[i] = hi.data[i + 1] = hi.data[i + 2] = Math.max(0, Math.min(255, (v - 128) * 1.6 + 128));
  }
  g.putImageData(px, 0, 0);
  const c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height;
  c2.getContext('2d').putImageData(hi, 0, 0);
  return { gray: c, contrast: c2, rgb: [r / n, gg / n, b / n] };
}
function rotated(c, deg) {
  const o = document.createElement('canvas');
  const sw = deg % 180 !== 0;
  o.width = sw ? c.height : c.width; o.height = sw ? c.width : c.height;
  const g = o.getContext('2d'); g.translate(o.width / 2, o.height / 2); g.rotate(deg * Math.PI / 180);
  g.drawImage(c, -c.width / 2, -c.height / 2); return o;
}
async function identify(src, rect) {
  const out = $('scanOut');
  out.textContent = worker ? 'Reading…' : 'Loading reader (first time ~5 s)…';
  const t0 = performance.now();
  try {
    const { gray, contrast, rgb } = grab(src, rect);
    const colour = colourFamily(...rgb);
    const w = await getWorker();
    const passes = [[contrast, 0], [gray, 0], [contrast, 180], [gray, 180], [contrast, 90], [contrast, 270]];
    let ocr = { best: null }, seen = '';
    for (let i = 0; i < passes.length; i++) {        // each pass parsed on its own text only
      out.textContent = `Reading… ${i + 1}/${passes.length}`;
      const [img, deg] = passes[i];
      const { data } = await w.recognize(deg ? rotated(img, deg) : img);
      ocr = readOcrText(data.text);
      if (!seen) seen = data.text.replace(/\s+/g, ' ').trim();
      if (ocr.best) { seen = data.text.replace(/\s+/g, ' ').trim(); break; }
    }
    showVerdict(verdict(ocr, colour), colour);
    const dbg = document.createElement('div'); dbg.className = 'small';
    dbg.textContent = `Read in ${((performance.now() - t0) / 1000).toFixed(1)} s · saw: “${seen.slice(0, 80) || 'nothing'}”`;
    out.appendChild(dbg);
  } catch (e) { out.textContent = 'Error: ' + (e.message || e); }
}
function showVerdict(v, colour) {
  const out = $('scanOut');
  const blue = `<div class="warn">Blue-note check: count the zeros.<br><b>20 000</b> (4 zeros) = ${fmtInr(vndToInr(20000, rate.v))} · <b>500 000</b> (5 zeros) = ${fmtInr(vndToInr(500000, rate.v))}</div>`;
  if (v.confirmed) {
    const n = noteFor(v.vnd);
    out.innerHTML = `<div class="val">${v.vnd.toLocaleString('en-US')} ₫</div><div class="inr">${fmtInr(vndToInr(v.vnd, rate.v))}</div>
      <div class="ok">✓ Read from printed number</div>
      ${v.warnColour ? `<div class="bad">⚠ Colour looks ${colour.family}, expected ${n.colour}. Check the note.</div>` : ''}
      ${v.blueCheck ? blue : ''}`;
  } else {
    const g = v.guesses.map((x) => `${x.toLocaleString('en-US')} (${fmtInr(vndToInr(x, rate.v))})`).join(' or ');
    out.innerHTML = `<div class="bad">✗ Couldn't read the number.</div>
      <div>Colour: ${colour.family}${g ? ` — could be ${g}` : ''}. <b>Not confirmed.</b></div>
      ${v.blueCheck ? blue : ''}<div class="small">Tip: fill the frame with the corner that shows the big number, good light, no glare.</div>`;
  }
}
$('scanBtn').onclick = async () => {
  await startCam(); const vd = $('video');
  if (!vd.videoWidth) return;
  identify(vd, frameRect(vd));
};
$('file').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => { identify(img, [0, 0, img.naturalWidth, img.naturalHeight]); URL.revokeObjectURL(img.src); };
  img.src = URL.createObjectURL(f); e.target.value = '';
};

// ---------- tabs ----------
document.querySelectorAll('nav button').forEach((b) => b.onclick = () => {
  document.querySelectorAll('nav button').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
  if (b.dataset.tab === 'scan') { startCam(); getWorker().catch(() => {}); } else stopCam();
  if (b.dataset.tab === 'log') renderLog();
});

// ---------- offline status ----------
async function offlineStatus() {
  const el = $('offline');
  try {
    const keys = await caches.keys();
    const c = keys.find((k) => k.startsWith('vnd-'));
    const n = c ? (await (await caches.open(c)).keys()).length : 0;
    const ready = n >= 15;
    el.textContent = ready ? (navigator.onLine ? '✓ Offline ready' : '✈ Offline mode') : '⏳ Saving for offline…';
    el.className = ready ? 'ok' : '';
    if (!ready) setTimeout(offlineStatus, 2000);
  } catch { el.textContent = ''; }
}
window.addEventListener('online', () => { offlineStatus(); fetchRate(); });
window.addEventListener('offline', offlineStatus);

// physical keyboard (laptop) also works
document.addEventListener('keydown', (e) => {
  if (!$('tab-convert').classList.contains('active') || e.target.tagName === 'INPUT') return;
  const k = e.key === 'Backspace' ? 'back' : e.key === 'Escape' ? 'clear' : /^\d$/.test(e.key) ? e.key : null;
  if (!k) return;
  const b = [...$('pad').children].find((x) => (x.dataset.k || x.textContent) === k);
  if (b) b.click();
});

// new version installed → reload once so the phone runs it (not on very first install)
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(offlineStatus).catch(() => {});
showRate(); renderLog();
if (navigator.onLine) fetchRate();
