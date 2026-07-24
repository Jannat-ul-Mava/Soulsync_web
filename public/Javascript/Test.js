/* ════════════════════════════════════════
   SOULSYNC — TEST PAGE  |  test.js
   ════════════════════════════════════════ */

const QUESTIONS = [
  // Section 1: Mood & Emotions
  {
    id: 1, section: "Mood & Emotions",
    text: "Over the past two weeks, how often have you felt down, depressed, or hopeless?",
    options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    alert: null
  },
  {
    id: 2, section: "Mood & Emotions",
    text: "How often have you had little interest or pleasure in things you usually enjoy?",
    options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    alert: null
  },
  {
    id: 3, section: "Mood & Emotions",
    text: "I feel emotionally balanced and stable in my day-to-day life.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  // Section 2: Anxiety & Stress
  {
    id: 4, section: "Anxiety & Stress",
    text: "Over the past two weeks, how often have you felt nervous, anxious, or on edge?",
    options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    alert: null
  },
  {
    id: 5, section: "Anxiety & Stress",
    text: "How often have you been unable to stop or control worrying?",
    options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    alert: null
  },
  {
    id: 6, section: "Anxiety & Stress",
    text: "I find it easy to relax and let go of stress after a difficult day.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  // Section 3: Sleep & Energy
  {
    id: 7, section: "Sleep & Energy",
    text: "Over the past month, how would you rate the quality of your sleep?",
    options: [
      "Very good — I sleep well most nights",
      "Fairly good — some difficulties occasionally",
      "Fairly bad — poor sleep is frequent",
      "Very bad — sleep is a serious problem"
    ],
    alert: null
  },
  {
    id: 8, section: "Sleep & Energy",
    text: "How often do you feel tired or have low energy during the day?",
    options: ["Rarely or never", "A few times a week", "Most days", "Every single day"],
    alert: null
  },
  {
    id: 9, section: "Sleep & Energy",
    text: "I wake up feeling rested and ready to face the day.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  // Section 4: Social & Relationships
  {
    id: 10, section: "Social & Relationships",
    text: "I feel genuinely supported by the people around me — family, friends, or colleagues.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  {
    id: 11, section: "Social & Relationships",
    text: "How often do you feel lonely or isolated, even when you are around others?",
    options: ["Never or rarely", "Sometimes", "Often", "Almost always"],
    alert: null
  },
  {
    id: 12, section: "Social & Relationships",
    text: "I am comfortable expressing my feelings to someone I trust.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  // Section 5: Thoughts & Self-Perception
  {
    id: 13, section: "Thoughts & Self-Perception",
    text: "I feel confident in my ability to handle challenges that come my way.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  {
    id: 14, section: "Thoughts & Self-Perception",
    text: "How often do you have thoughts that feel overwhelming or difficult to control?",
    options: ["Never", "Occasionally", "Frequently", "Almost constantly"],
    alert: null
  },
  {
    id: 15, section: "Thoughts & Self-Perception",
    text: "I feel good about who I am as a person and my place in the world.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  // Section 6: Daily Functioning
  {
    id: 16, section: "Daily Functioning",
    text: "How often do mental health concerns interfere with your work, studies, or daily tasks?",
    options: [
      "Never — I function well",
      "Occasionally — minor impact",
      "Often — noticeable impact",
      "Very often — serious difficulty"
    ],
    alert: null
  },
  {
    id: 17, section: "Daily Functioning",
    text: "I am able to maintain a healthy routine — meals, hygiene, and movement.",
    options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    alert: null
  },
  {
    id: 18, section: "Daily Functioning",
    text: "Over the past month, how often have you found it hard to concentrate on tasks?",
    options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    alert: null
  },
  // Section 7: Wellbeing Check
  {
    id: 19, section: "Wellbeing Check",
    text: "Have you recently felt that things are hopeless and there is no way forward?",
    options: [
      "No — I feel hopeful about my future",
      "Rarely — occasional very low moments",
      "Sometimes — I struggle to see hope",
      "Yes, often — it feels overwhelming"
    ],
    alert: {
      type: "warn",
      title: "We care about you",
      body: "If you are going through a very difficult time, please reach out to someone you trust or contact a mental health helpline. You do not have to face this alone."
    }
  },
  {
    id: 20, section: "Wellbeing Check",
    text: "Have you had thoughts of harming yourself, or that you would be better off not being here?",
    options: [
      "No, never",
      "These thoughts have briefly crossed my mind",
      "Sometimes I think about this",
      "Yes, these are frequent thoughts"
    ],
    alert: {
      type: "danger",
      title: "Important — Please Read",
      body: "If you are experiencing thoughts of self-harm or suicide, please seek immediate help by calling emergency services or a crisis helpline. You matter, and support is available right now."
    }
  }
];

// State
let current = 0;
let answers = new Array(QUESTIONS.length).fill(null);

// DOM
const elProgress  = document.getElementById('progressFill');
const elQCurrent  = document.getElementById('qCurrent');
const elQTotal    = document.getElementById('qTotal');
const elPct       = document.getElementById('pctLabel');
const elQuestion  = document.getElementById('questionText');
const elOptions   = document.getElementById('optionsList');
const elAlert     = document.getElementById('alertBox');
const btnPrev     = document.getElementById('btnPrev');
const btnNext     = document.getElementById('btnNext');

function render() {
  const q   = QUESTIONS[current];
  const pct = Math.round(((current + 1) / QUESTIONS.length) * 100);

  // Header
  elQCurrent.textContent  = current + 1;
  elPct.textContent       = pct + '%';
  elProgress.style.width  = pct + '%';

  // Question
  elQuestion.textContent = q.text;

  // Options
  elOptions.innerHTML = '';
  q.options.forEach((text, i) => {
    const sel = answers[current] === i;
    const div = document.createElement('div');
    div.className = 'opt-item' + (sel ? ' selected' : '');
    div.setAttribute('role', 'radio');
    div.setAttribute('aria-checked', sel);
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
      <div class="opt-radio"><div class="opt-radio-dot"></div></div>
      <span class="opt-text">${text}</span>
    `;
    div.addEventListener('click', () => pick(i));
    div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(i); });
    elOptions.appendChild(div);
  });

  // Alert
  if (q.alert) {
    elAlert.className = 'alert-box ' + q.alert.type;
    document.getElementById('alertTitle').textContent = q.alert.title;
    document.getElementById('alertBody').textContent  = q.alert.body;
    elAlert.style.display = 'flex';
  } else {
    elAlert.style.display = 'none';
  }

  // Nav
  btnPrev.disabled = current === 0;
  btnNext.disabled = answers[current] === null;
  btnNext.textContent = current === QUESTIONS.length - 1 ? 'See Results →' : 'Next →';
}

function pick(idx) {
  answers[current] = idx;
  document.querySelectorAll('.opt-item').forEach((el, i) => {
    const s = i === idx;
    el.classList.toggle('selected', s);
    el.setAttribute('aria-checked', s);
  });
  btnNext.disabled = false;
  btnNext.textContent = current === QUESTIONS.length - 1 ? 'See Results →' : 'Next →';
}

function goNext() {
  if (answers[current] === null) return;
  if (current === QUESTIONS.length - 1) {
    sessionStorage.setItem('soulsync_answers', JSON.stringify(answers));
    window.location.href = 'result.html';
    return;
  }
  current++;
  render();
  window.scrollTo(0, 0);
}

function goBack() {
  if (current === 0) return;
  current--;
  render();
  window.scrollTo(0, 0);
}

// Keyboard
document.addEventListener('keydown', e => {
  const q = QUESTIONS[current];
  const numMap = {'1':0,'2':1,'3':2,'4':3,'5':4};
  if (numMap[e.key] !== undefined && numMap[e.key] < q.options.length) pick(numMap[e.key]);
  if (e.key === 'ArrowRight' && answers[current] !== null) goNext();
  if (e.key === 'ArrowLeft'  && current > 0) goBack();
});

// Init
elQTotal.textContent = QUESTIONS.length;
render();