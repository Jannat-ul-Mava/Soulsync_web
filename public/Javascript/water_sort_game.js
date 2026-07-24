
// ── Palette ──────────────────────────────────────────────
const PALETTE = [
  '#ff6b2b', // orange
  '#2bd4c4', // teal
  '#e63946', // red
  '#457b9d', // blue
  '#9b5de5', // purple
  '#2dc653', // green
  '#ffd166', // yellow
  '#ef476f', // pink
];

// ── Configs ──────────────────────────────────────────────
const CONFIGS = {
  easy:   { colors: 3, tubes: 5, empty: 2, seg: 4 },
  medium: { colors: 4, tubes: 6, empty: 2, seg: 4 },
  hard:   { colors: 5, tubes: 7, empty: 2, seg: 4 },
};

// ── State ────────────────────────────────────────────────
const S = { difficulty: 'easy', cfg: null, tubes: [], selected: null, busy: false };

// ── Screen ───────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showMenu() { S.selected = null; showScreen('screen-menu'); }
function exitGame() { window.location.href = 'home.html'; }

// ── Start ────────────────────────────────────────────────
function startGame(diff) {
  S.difficulty = diff;
  S.cfg = CONFIGS[diff];
  generateLevel();
  showScreen('screen-game');
}
function replayLevel() { generateLevel(); showScreen('screen-game'); }
function shuffleGame() { generateLevel(); }

// ── Generate ─────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateLevel() {
  const { colors, tubes, empty, seg } = S.cfg;
  const pal = PALETTE.slice(0, colors);
  let flat = [];
  pal.forEach(c => { for (let s = 0; s < seg; s++) flat.push(c); });
  flat = shuffle(flat);
  S.tubes = [];
  for (let i = 0; i < tubes - empty; i++) S.tubes.push(flat.splice(0, seg));
  for (let e = 0; e < empty; e++) S.tubes.push([]);
  S.selected = null;
  S.busy = false;
  render();
}

// ── Logic ────────────────────────────────────────────────
function topColor(t) { return t.length > 0 ? t[t.length - 1] : null; }

function canPour(from, to) {
  const src = S.tubes[from], dst = S.tubes[to];
  const { seg } = S.cfg;
  if (src.length === 0) return false;
  if (dst.length >= seg) return false;
  if (dst.length === 0) return true;
  return topColor(src) === topColor(dst);
}

function pour(from, to) {
  const src = S.tubes[from], dst = S.tubes[to];
  const { seg } = S.cfg;
  const color = topColor(src);
  while (src.length > 0 && topColor(src) === color && dst.length < seg) {
    dst.push(src.pop());
  }
}

function isComplete(tube) {
  const { seg } = S.cfg;
  return tube.length === seg && tube.every(c => c === tube[0]);
}

function checkWin() {
  const { colors } = S.cfg;
  if (S.tubes.filter(isComplete).length === colors) {
    setTimeout(() => { spawnConfetti(); showScreen('screen-win'); }, 600);
  }
}

// ── Click handler ─────────────────────────────────────────
function onTubeClick(idx) {
  if (S.busy) return;

  if (S.selected === null) {
    if (S.tubes[idx].length === 0) return;
    S.selected = idx;
    render();
    return;
  }

  if (S.selected === idx) {
    S.selected = null;
    render();
    return;
  }

  if (!canPour(S.selected, idx)) {
    // Invalid — switch selection if target has water
    S.selected = (S.tubes[idx].length > 0) ? idx : null;
    render();
    return;
  }

  // Valid pour — animate then commit
  const fromIdx = S.selected;
  const toIdx = idx;
  S.selected = null;
  S.busy = true;

  // Determine tilt direction: if dest is to the right → tilt right, else left
  const fromEl = getTubeWrap(fromIdx);
  const toEl   = getTubeWrap(toIdx);
  const fromRect = fromEl.getBoundingClientRect();
  const toRect   = toEl.getBoundingClientRect();
  const tiltClass = toRect.left > fromRect.left ? 'tilt-right' : 'tilt-left';

  fromEl.classList.remove('selected');
  fromEl.classList.add(tiltClass);

  fromEl.addEventListener('animationend', () => {
    fromEl.classList.remove(tiltClass);
    pour(fromIdx, toIdx);
    S.busy = false;
    render();
    checkWin();
  }, { once: true });
}

function getTubeWrap(idx) {
  return document.getElementById('tubes-stage').children[idx];
}

// ── Render ────────────────────────────────────────────────
function render() {
  const stage = document.getElementById('tubes-stage');
  stage.innerHTML = '';
  const { seg } = S.cfg;
  const segPct = (100 / seg) + '%';

  S.tubes.forEach((tube, idx) => {
    // Outer wrapper handles tilt + lift
    const wrap = document.createElement('div');
    wrap.className = 'tube-wrap';
    if (idx === S.selected) wrap.classList.add('selected');
    if (isComplete(tube))   wrap.classList.add('complete');

    // Glass tube
    const tubeEl = document.createElement('div');
    tubeEl.className = 'tube';

    // Segments: DOM order is top→bottom (flex-col, justify-end)
    const domSegs = [...tube].reverse(); // reverse so bottom color is last in DOM
    domSegs.forEach(color => {
      const seg = document.createElement('div');
      seg.className = 'water-seg';
      seg.style.height = segPct;
      seg.style.background = `linear-gradient(180deg, ${lighten(color, 0.18)} 0%, ${color} 60%, ${darken(color, 0.1)} 100%)`;
      tubeEl.appendChild(seg);
    });

    wrap.appendChild(tubeEl);
    wrap.addEventListener('click', () => onTubeClick(idx));
    stage.appendChild(wrap);
  });
}

// ── Color utils ───────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function toHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lighten(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return toHex(r + (255-r)*amt, g + (255-g)*amt, b + (255-b)*amt);
}
function darken(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return toHex(r*(1-amt), g*(1-amt), b*(1-amt));
}

// ── Confetti ──────────────────────────────────────────────
function spawnConfetti() {
  const win = document.getElementById('screen-win');
  win.querySelectorAll('.confetti-piece').forEach(e => e.remove());
  const cols = ['#ffd166','#2bd4c4','#ff6b2b','#9b5de5','#2dc653','#ef476f'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = (Math.random()*100) + 'vw';
    p.style.top  = '-20px';
    p.style.background = cols[Math.floor(Math.random()*cols.length)];
    p.style.animationDelay    = (Math.random()*1.6)+'s';
    p.style.animationDuration = (1.8+Math.random()*1.4)+'s';
    p.style.transform = `rotate(${Math.random()*360}deg)`;
    win.appendChild(p);
  }
}