

  const COLS = 20, ROWS = 8, TOTAL = COLS * ROWS;
  let popped = 0, soundOn = true, holdMode = false, isHolding = false;

  const wrap    = document.getElementById('wrap');
  const counter = document.getElementById('counter');
  const compMsg = document.getElementById('complete-msg');
  const container = document.getElementById('wrap-container');
  const bubbles = [];

  // ── Responsive bubble sizing ──────────────────────────
  function calcBubbleSize() {
    const padding = parseFloat(getComputedStyle(container).paddingLeft) * 2;
    const gap = Math.max(2, Math.min(5, container.clientWidth * 0.006));
    // Available width minus gaps
    const avail = container.clientWidth - padding - (COLS - 1) * gap;
    const size  = Math.max(14, Math.floor(avail / COLS));
    return { size, gap };
  }

  function applySize() {
    const { size, gap } = calcBubbleSize();
    wrap.style.setProperty('--bsize', size + 'px');
    wrap.style.gap = gap + 'px';
    wrap.style.gridTemplateColumns = `repeat(${COLS}, ${size}px)`;
  }

  // ── Build grid ────────────────────────────────────────
  function createBubbles() {
    wrap.innerHTML = '';
    bubbles.length = 0;
    popped = 0;
    updateCounter();
    compMsg.style.display = 'none';
    applySize();

    for (let i = 0; i < TOTAL; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.dataset.idx = i;
      b.addEventListener('mousedown',  onBubbleDown);
      b.addEventListener('mouseenter', onBubbleEnter);
      b.addEventListener('touchstart', onBubbleTouch, { passive: true });
      wrap.appendChild(b);
      bubbles.push({ el: b, popped: false });
    }
  }

  function onBubbleDown()  { isHolding = true; popBubble(+this.dataset.idx); }
  function onBubbleEnter() { if (holdMode && isHolding) popBubble(+this.dataset.idx); }
  function onBubbleTouch() { popBubble(+this.dataset.idx); }

  document.addEventListener('mouseup',  () => { isHolding = false; });
  document.addEventListener('touchend', () => { isHolding = false; });

  function popBubble(i) {
    const b = bubbles[i];
    if (!b || b.popped) return;
    b.popped = true;
    b.el.classList.add('popped', 'pop-anim');
    popped++; updateCounter();
    if (soundOn) playPop();
    if (popped === TOTAL) setTimeout(() => { compMsg.style.display = 'block'; }, 260);
  }

  function updateCounter() {
    counter.textContent = `Popped: ${popped} / ${TOTAL}`;
  }

  function resetAll() { createBubbles(); }

  function popAll() {
    let delay = 0;
    for (let i = 0; i < TOTAL; i++) {
      if (!bubbles[i].popped) { setTimeout(() => popBubble(i), delay); delay += 6; }
    }
  }

  function toggleMode() {
    holdMode = !holdMode;
    document.getElementById('mode-btn').textContent = `🖱 Hold Mode: ${holdMode ? 'On' : 'Off'}`;
    container.classList.toggle('hold-on', holdMode);
  }

  document.getElementById('sound-toggle').addEventListener('click', function () {
    soundOn = !soundOn;
    this.textContent = soundOn ? '🔊' : '🔇';
  });

  function playPop() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340 + Math.random() * 220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.13);
    } catch(e) {}
  }

  // ── Recompute sizing on window resize ─────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applySize, 60);
  });

  createBubbles();
