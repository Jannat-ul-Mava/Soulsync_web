/* ═══════════════════════════════════════════════════
   SOULSYNC ASSESSMENT RESULTS  —  assessment.js
═══════════════════════════════════════════════════ */

/**
 * Animates the gradient bar "reveal" by shrinking
 * the right-side fade overlay based on data-pct.
 */
function initGradientBars() {
  const bars = document.querySelectorAll('.gradient-bar');

  bars.forEach((bar, i) => {
    const fillEl = bar.querySelector('.gradient-bar-fill');
    const pct    = fillEl ? parseFloat(fillEl.dataset.pct) : 0;

    // Set CSS variable used by ::after pseudo-element
    bar.style.setProperty('--filled-width', pct + '%');

    // Animate: start at 0%, then slide to pct over 1.2s with stagger
    bar.style.setProperty('--filled-width', '0%');
    const delay = 400 + i * 140; // staggered start

    setTimeout(() => {
      bar.style.transition = '--filled-width 1.2s cubic-bezier(.4,0,.2,1)';
      bar.style.setProperty('--filled-width', pct + '%');
    }, delay);
  });
}

/**
 * Fallback approach using ::after width via a data attribute trick:
 * We animate a real overlay div instead of a pseudo-element.
 */
function initBarsReal() {
  document.querySelectorAll('.gradient-bar').forEach((bar, idx) => {
    const fillEl = bar.querySelector('.gradient-bar-fill');
    const pct    = fillEl ? parseFloat(fillEl.dataset.pct) : 0;

    // Remove placeholder fill element (not used for rendering)
    if (fillEl) fillEl.remove();

    // Create overlay div that masks the right portion
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 100%;
      background: linear-gradient(to right, transparent 0%, rgba(240,244,242,0.94) 40%);
      border-radius: 0 100px 100px 0;
      transition: width 1.2s cubic-bezier(.4,0,.2,1);
    `;
    bar.style.position = 'relative';
    bar.style.overflow = 'hidden';
    bar.appendChild(overlay);

    // Animate after stagger delay
    const delay = 350 + idx * 150;
    setTimeout(() => {
      overlay.style.width = (100 - pct) + '%';
    }, delay);
  });
}

window.addEventListener('load', () => {
  initBarsReal();
});