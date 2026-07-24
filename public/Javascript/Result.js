/* ════════════════════════════════════════
   SOULSYNC — RESULT PAGE  |  result.js
   Scoring, breakdown by section, save/print
   ════════════════════════════════════════ */

// ── Question metadata (must mirror test.js) ──────────────
// Maps question id → section for scoring grouping
const QUESTION_META = [
  { id: 1,  section: "Feelings of depression",       maxScore: 3 },
  { id: 2,  section: "Feelings of depression",       maxScore: 3 },
  { id: 3,  section: "Feelings of depression",       maxScore: 4 },
  { id: 4,  section: "Feelings of anxiety",          maxScore: 3 },
  { id: 5,  section: "Feelings of anxiety",          maxScore: 3 },
  { id: 6,  section: "Feelings of anxiety",          maxScore: 4 },
  { id: 7,  section: "Sleep & energy issues",        maxScore: 3 },
  { id: 8,  section: "Sleep & energy issues",        maxScore: 3 },
  { id: 9,  section: "Sleep & energy issues",        maxScore: 4 },
  { id: 10, section: "Social & relationships",       maxScore: 4 },
  { id: 11, section: "Social & relationships",       maxScore: 3 },
  { id: 12, section: "Social & relationships",       maxScore: 4 },
  { id: 13, section: "Thoughts & self-perception",   maxScore: 4 },
  { id: 14, section: "Thoughts & self-perception",   maxScore: 3 },
  { id: 15, section: "Thoughts & self-perception",   maxScore: 4 },
  { id: 16, section: "Feelings of other mental issues", maxScore: 3 },
  { id: 17, section: "Feelings of other mental issues", maxScore: 4 },
  { id: 18, section: "Feelings of other mental issues", maxScore: 3 },
  { id: 19, section: "Wellbeing check",              maxScore: 3 },
  { id: 20, section: "Wellbeing check",              maxScore: 3 },
];

// Convert answer index → score value
// For "negative" questions (higher = worse): index maps to score 0,1,2,3(,4)
// For "positive" (scale) questions: index maps REVERSED (0=best → score 0, but we invert: 4=worst → high score)
// Simplified: all answers index 0 = best/lowest concern, last index = highest concern
function answerToScore(answerIdx, maxScore) {
  if (answerIdx === null || answerIdx === -1) return 0; // skipped = 0
  // Normalize: answerIdx / (numOptions-1) * maxScore
  return Math.round((answerIdx / maxScore) * maxScore);
}

// ── Load answers ──────────────────────────────────────────
const raw = sessionStorage.getItem('soulsync_answers');
let answers = raw ? JSON.parse(raw) : new Array(20).fill(null);

// ── Calculate scores ──────────────────────────────────────
let totalScore = 0;
let totalMax   = 0;

// Group by section
const sectionMap = {};

QUESTION_META.forEach((meta, i) => {
  const ans = answers[i];
  const score = (ans === null || ans === -1) ? 0 : ans; // raw index as score
  totalScore += score;
  totalMax   += meta.maxScore;

  if (!sectionMap[meta.section]) {
    sectionMap[meta.section] = { score: 0, max: 0 };
  }
  sectionMap[meta.section].score += score;
  sectionMap[meta.section].max   += meta.maxScore;
});

// ── Render total score ────────────────────────────────────
const TOTAL_MAX = totalMax;
const pctTotal  = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(2) : 0;

document.getElementById('totalScoreNum').textContent = `${totalScore} (${pctTotal}%)`;

// Animate bar: reveal left portion = pctTotal %
// We mask from the right: maskWidth = 100 - pct
const totalBar = document.querySelector('#totalScoreCard .score-bar-track');
requestAnimationFrame(() => {
  setTimeout(() => {
    const mask = (100 - parseFloat(pctTotal)).toFixed(1);
    totalBar.style.setProperty('--mask-w', mask + '%');
  }, 200);
});

// ── Render breakdown ──────────────────────────────────────
const breakdownList = document.getElementById('breakdownList');

Object.entries(sectionMap).forEach(([label, data], idx) => {
  const pct = data.max > 0 ? ((data.score / data.max) * 100).toFixed(2) : 0;

  const item = document.createElement('div');
  item.className = 'breakdown-item';
  item.style.animationDelay = (0.1 + idx * 0.07) + 's';
  item.innerHTML = `
    <div class="breakdown-label">${label}</div>
    <div class="breakdown-score">${data.score} (${pct}%)</div>
    <div class="breakdown-bar-track" data-pct="${pct}"></div>
  `;
  breakdownList.appendChild(item);
});

// Animate breakdown bars
requestAnimationFrame(() => {
  setTimeout(() => {
    document.querySelectorAll('.breakdown-bar-track').forEach(bar => {
      const pct = parseFloat(bar.dataset.pct);
      const mask = (100 - pct).toFixed(1);
      bar.style.setProperty('--mask-w', mask + '%');
    });
  }, 350);
});

// ── Recommendation text ───────────────────────────────────
const recommend = document.getElementById('recommendText');
const score60 = (totalScore / totalMax) * 100;

if (score60 >= 65) {
  recommend.textContent = 'Based on your results, we strongly recommend scheduling a consultation with a mental health professional as soon as possible. You deserve the right support.';
} else if (score60 >= 35) {
  recommend.textContent = 'Based on your results, we recommend scheduling a consultation with a mental health professional. Early support can make a meaningful difference.';
} else {
  recommend.textContent = 'Your results suggest mild concerns. Continue to monitor your wellbeing and consider speaking with a professional if you notice any changes.';
}

// ── Save as PDF ───────────────────────────────────────────
function savePDF() {
  // Use browser print dialog with PDF option, or trigger print
  const originalTitle = document.title;
  document.title = 'SoulSync_Assessment_Results';
  window.print();
  document.title = originalTitle;
}

// ── Print ─────────────────────────────────────────────────
function printResults() {
  window.print();
}

// ── Schedule Appointment ──────────────────────────────────
function scheduleAppointment() {
  alert('Redirecting to appointment scheduling…\n\n(Connect this to your booking system.)');
}