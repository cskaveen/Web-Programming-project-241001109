/* ---------- Navigation & theme ---------- */
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn[data-view]');
function showView(id) {
  views.forEach(v => v.classList.toggle('active', v.id === id));
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === id));
}
navBtns.forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => showView(c.dataset.go)));

const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  themeBtn.textContent = document.body.classList.contains('dark') ? 'Light Mode' : 'Dark Mode';
});

const pad = n => String(n).padStart(2, '0');

/* ---------- Countdown Timer ---------- */
const cd = { total: 0, remaining: 0, end: 0, id: null, running: false };
const $ = id => document.getElementById(id);
const CIRC = 2 * Math.PI * 54;

function fmtHMS(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function readInputs() {
  const h = Math.max(0, +$('cdH').value || 0);
  const m = Math.min(59, Math.max(0, +$('cdM').value || 0));
  const s = Math.min(59, Math.max(0, +$('cdS').value || 0));
  return h * 3600 + m * 60 + s;
}
function drawCd(msLeft) {
  const sec = Math.ceil(msLeft / 1000);
  $('cdDisplay').textContent = fmtHMS(sec);
  const frac = cd.total ? msLeft / (cd.total * 1000) : 0;
  $('ringFg').style.strokeDashoffset = CIRC * (1 - frac);
  document.title = cd.running ? `${fmtHMS(sec)} - Timer` : 'Countdown Timer & Stopwatch';
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) { /* audio not available */ }
}
function setCdButtons(running, paused) {
  $('cdStart').disabled = running;
  $('cdPause').disabled = !running && !paused;
  $('cdPause').textContent = paused ? 'Resume' : 'Pause';
  ['cdH', 'cdM', 'cdS'].forEach(i => $(i).disabled = running || paused);
}
function tickCd() {
  const left = cd.end - Date.now();
  if (left <= 0) return finishCd();
  cd.remaining = left; drawCd(left);
}
function startCd() {
  if (!cd.remaining) {
    cd.total = readInputs();
    if (cd.total <= 0) { $('cdMsg').textContent = 'Please enter a time greater than zero.'; return; }
    cd.remaining = cd.total * 1000;
  }
  $('cdMsg').textContent = ''; $('countdown').classList.remove('finished');
  cd.end = Date.now() + cd.remaining; cd.running = true;
  cd.id = setInterval(tickCd, 100); tickCd(); setCdButtons(true, false);
}
function pauseCd() {
  if (cd.running) { clearInterval(cd.id); cd.running = false; setCdButtons(false, true); $('cdStart').disabled = true; }
  else if (cd.remaining) { startCd(); $('cdPause').textContent = 'Pause'; }
}
function finishCd() {
  clearInterval(cd.id); cd.running = false; cd.remaining = 0;
  $('cdDisplay').textContent = '00:00:00'; $('ringFg').style.strokeDashoffset = CIRC;
  $('countdown').classList.add('finished');
  $('cdMsg').textContent = "Time's up!"; document.title = "Time's up!";
  setCdButtons(false, false); beep();
}
function resetCd() {
  clearInterval(cd.id); cd.running = false; cd.remaining = 0;
  $('countdown').classList.remove('finished'); $('cdMsg').textContent = '';
  setCdButtons(false, false); cd.total = readInputs(); drawCd(cd.total * 1000);
  $('ringFg').style.strokeDashoffset = 0;
}
$('cdStart').addEventListener('click', startCd);
$('cdPause').addEventListener('click', pauseCd);
$('cdReset').addEventListener('click', resetCd);
['cdH', 'cdM', 'cdS'].forEach(i => $(i).addEventListener('input', resetCd));
document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
  const m = +c.dataset.min; $('cdH').value = Math.floor(m / 60); $('cdM').value = m % 60; $('cdS').value = 0; resetCd();
}));
resetCd();

/* ---------- Stopwatch ---------- */
const sw = { start: 0, elapsed: 0, id: null, running: false, laps: [], lastLap: 0 };
function fmtSW(ms) {
  const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000);
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}
function tickSw() { sw.elapsed = performance.now() - sw.start; $('swDisplay').textContent = fmtSW(sw.elapsed); }
function toggleSw() {
  if (!sw.running) {
    sw.start = performance.now() - sw.elapsed; sw.running = true;
    sw.id = setInterval(tickSw, 10);
    $('swStart').textContent = 'Stop'; $('swStart').classList.add('stop'); $('swLap').disabled = false;
  } else {
    clearInterval(sw.id); sw.running = false; tickSw();
    $('swStart').textContent = 'Start'; $('swStart').classList.remove('stop'); $('swLap').disabled = true;
  }
}
function lapSw() {
  if (!sw.running) return;
  const split = sw.elapsed - sw.lastLap; sw.lastLap = sw.elapsed;
  sw.laps.push({ split, total: sw.elapsed }); renderLaps();
}
function renderLaps() {
  const body = $('lapBody'); body.innerHTML = '';
  $('lapTable').hidden = sw.laps.length === 0;
  const splits = sw.laps.map(l => l.split);
  const best = Math.min(...splits), worst = Math.max(...splits);
  [...sw.laps].reverse().forEach((l, i) => {
    const n = sw.laps.length - i, tr = document.createElement('tr');
    if (sw.laps.length > 2) { if (l.split === best) tr.className = 'best'; else if (l.split === worst) tr.className = 'worst'; }
    tr.innerHTML = `<td>${n}</td><td>${fmtSW(l.split)}</td><td>${fmtSW(l.total)}</td>`;
    body.appendChild(tr);
  });
}
function resetSw() {
  clearInterval(sw.id); Object.assign(sw, { elapsed: 0, running: false, laps: [], lastLap: 0 });
  $('swDisplay').textContent = '00:00.00'; $('swStart').textContent = 'Start';
  $('swStart').classList.remove('stop'); $('swLap').disabled = true; renderLaps();
}
$('swStart').addEventListener('click', toggleSw);
$('swLap').addEventListener('click', lapSw);
$('swReset').addEventListener('click', resetSw);
