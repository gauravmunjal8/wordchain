'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let auth, db;
let currentUser = null;
let userData    = null;
let currentTier   = null;
let currentPuzzle = null;

const TODAY = (() => new Date().toISOString().split('T')[0])();
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
})();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function initApp() {
  if (typeof firebase === 'undefined') {
    showConfigError('Firebase SDK failed to load. Check your internet connection.');
    return;
  }
  if (!window.firebaseConfig || window.firebaseConfig.apiKey === 'YOUR_API_KEY') {
    showConfigError('Open <strong>firebase-config.js</strong> and fill in your Firebase project credentials. See SETUP.md for instructions.');
    return;
  }

  try {
    firebase.initializeApp(window.firebaseConfig);
  } catch (e) {
    if (!e.message.includes('already')) {
      showConfigError('Firebase initialisation failed: ' + e.message);
      return;
    }
  }

  auth = firebase.auth();
  db   = firebase.firestore();

  auth.onAuthStateChanged(onAuthChange);
  bindEvents();
}

function showConfigError(msg) {
  document.getElementById('config-error').innerHTML = msg;
  document.getElementById('config-error').style.display = 'block';
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function onAuthChange(user) {
  if (user) {
    currentUser = user;
    await loadOrCreateUser();
    refreshHeaderUI();
    showScreen('game-screen');
    renderDashboard();
  } else {
    currentUser = null;
    userData    = null;
    showScreen('auth-screen');
  }
}

function signIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    alert('Sign-in failed: ' + err.message);
  });
}

function signOut() {
  if (confirm('Sign out of WordChain?')) auth.signOut();
}

// ── User data (Firestore) ─────────────────────────────────────────────────────
async function loadOrCreateUser() {
  const ref  = db.collection('users').doc(currentUser.uid);
  const snap = await ref.get();

  if (!snap.exists) {
    userData = {
      displayName:   currentUser.displayName || 'Player',
      email:         currentUser.email,
      photoURL:      currentUser.photoURL || '',
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
      totalScore:    0,
      completedDays: {},
    };
    await ref.set(userData);
  } else {
    userData = snap.data();
  }
}

async function saveCompletion(tier, points) {
  const ref = db.collection('users').doc(currentUser.uid);

  // Streak calculation
  let newStreak = userData.currentStreak || 0;
  const last    = userData.lastPlayedDate;

  if (last !== TODAY) {
    newStreak = (last === YESTERDAY || last === null)
      ? newStreak + 1
      : 1; // missed at least one day
  }

  const newLongest    = Math.max(newStreak, userData.longestStreak || 0);
  const newTotalScore = (userData.totalScore || 0) + points;
  const todayPrev     = ((userData.completedDays || {})[TODAY] || {}).score || 0;

  await ref.update({
    [`completedDays.${TODAY}.${tier}`]:    true,
    [`completedDays.${TODAY}.score`]:      todayPrev + points,
    currentStreak:  newStreak,
    longestStreak:  newLongest,
    lastPlayedDate: TODAY,
    totalScore:     newTotalScore,
  });

  // Mirror locally so the dashboard re-renders correctly without a round-trip
  userData.currentStreak  = newStreak;
  userData.longestStreak  = newLongest;
  userData.lastPlayedDate = TODAY;
  userData.totalScore     = newTotalScore;
  if (!userData.completedDays)        userData.completedDays = {};
  if (!userData.completedDays[TODAY]) userData.completedDays[TODAY] = { score: 0 };
  userData.completedDays[TODAY][tier]  = true;
  userData.completedDays[TODAY].score  = todayPrev + points;

  return newStreak;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  showView('dashboard');

  const { puzzle, dayNumber } = getTodayPuzzle();
  const completed = (userData.completedDays || {})[TODAY] || {};
  const streak    = userData.currentStreak  || 0;
  const longest   = userData.longestStreak  || 0;
  const total     = userData.totalScore     || 0;
  const todayPts  = completed.score         || 0;

  setText('today-date',   new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  setText('day-number',   `Day #${dayNumber}`);
  setText('streak-count', streak);
  setText('best-value',   longest);
  setText('header-streak', streak);
  setText('today-score',  `${todayPts} / 7`);
  setText('total-score',  total);

  const TIERS = ['easy', 'medium', 'hard'];
  TIERS.forEach(tier => {
    const p       = puzzle[tier];
    const done    = !!completed[tier];
    const blanks  = p.answer.length;
    const preview = Array(blanks).fill('□').join(' → ');

    setText(`${tier}-start`,  p.start);
    setText(`${tier}-end`,    p.end);
    setText(`${tier}-blanks`, preview);

    const card   = document.getElementById(`card-${tier}`);
    const status = document.getElementById(`${tier}-status`);

    card.classList.toggle('completed', done);
    status.textContent  = done ? '✓ Done'  : 'Play →';
    status.className    = `tier-status ${done ? 'done' : 'play'}`;
  });
}

// ── Game ──────────────────────────────────────────────────────────────────────
function startGame(tier) {
  const { puzzle } = getTodayPuzzle();
  currentTier   = tier;
  currentPuzzle = puzzle[tier];

  const badge = document.getElementById('game-tier-badge');
  badge.textContent = tier.toUpperCase();
  badge.className   = `tier-badge ${tier}`;

  buildChainUI(currentPuzzle);

  // Reset auxiliary UI
  el('hint-text').classList.add('hidden');
  show('hint-btn');
  show('submit-btn');
  show('give-up-btn');
  hide('result-banner');
  el('submit-btn').disabled = true;

  const alreadyDone = !!((userData.completedDays || {})[TODAY] || {})[tier];
  if (alreadyDone) {
    // Show read-only completed state
    revealAnswers(currentPuzzle.answer, 'correct');
    hide('hint-btn');
    hide('submit-btn');
    hide('give-up-btn');
    const chain = buildChainString(currentPuzzle);
    displayResult(true, userData.currentStreak || 0, chain);
  }

  showView('game-view');

  if (!alreadyDone) {
    requestAnimationFrame(() => {
      const first = document.getElementById('chain-input-0');
      if (first) first.focus();
    });
  }
}

// ── Chain UI builder ──────────────────────────────────────────────────────────
function buildChainUI(puzzle) {
  const container = el('chain-container');
  container.innerHTML = '';

  const n        = puzzle.answer.length;
  const allWords = [puzzle.start, ...Array(n).fill(''), puzzle.end];

  // ── Chain row ──
  const chainRow = document.createElement('div');
  chainRow.className = 'chain-row';

  allWords.forEach((word, i) => {
    if (i > 0) {
      const arrow = document.createElement('div');
      arrow.className   = 'chain-arrow';
      arrow.textContent = '→';
      chainRow.appendChild(arrow);
    }

    const node = document.createElement('div');

    if (i === 0 || i === allWords.length - 1) {
      node.className   = 'chain-node anchor';
      node.textContent = word;
    } else {
      const inputIdx = i - 1;
      node.className = 'chain-node input-node';
      node.id        = `node-${inputIdx}`;

      const input = document.createElement('input');
      input.type          = 'text';
      input.id            = `chain-input-${inputIdx}`;
      input.className     = 'chain-input';
      input.maxLength     = 14;
      input.autocomplete  = 'off';
      input.spellcheck    = false;
      input.placeholder   = '?????';
      input.dataset.index = inputIdx;

      input.addEventListener('input',   onChainInput);
      input.addEventListener('keydown', onChainKeydown);
      node.appendChild(input);
    }

    chainRow.appendChild(node);
  });

  container.appendChild(chainRow);

  // ── Compound preview section ──
  // One row per connection: allWords[i] + allWords[i+1] → compound
  const previewSection = document.createElement('div');
  previewSection.className = 'compound-preview-row';

  for (let i = 0; i < allWords.length - 1; i++) {
    const leftWord  = i === 0           ? puzzle.start : `<span class="cpd-dynamic" id="cpd-dyn-${i-1}">???</span>`;
    const rightWord = i === n           ? puzzle.end   : `<span class="cpd-dynamic" id="cpd-dyn-r-${i}">???</span>`;
    // For anchors, the word is already known; for inputs it will be updated live.

    const item = document.createElement('div');
    item.className = 'compound-item';
    item.id        = `compound-item-${i}`;

    // Left side of compound
    const leftLabel = (i === 0) ? puzzle.start : `???`;
    const rightLabel = (i === n) ? puzzle.end : `???`;

    item.innerHTML = `
      <span class="cpd-word" id="cpd-l-${i}">${leftLabel}</span>
      <span class="cpd-op">+</span>
      <span class="cpd-word" id="cpd-r-${i}">${rightLabel}</span>
      <span class="cpd-op">=</span>
      <span class="cpd-result" id="cpd-res-${i}">??????????</span>
    `;

    previewSection.appendChild(item);
  }

  container.appendChild(previewSection);
  updateAllPreviews();
}

function onChainInput(e) {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
  updateAllPreviews();

  const allFilled = Array.from(document.querySelectorAll('.chain-input'))
    .every(inp => inp.value.trim().length > 0);
  el('submit-btn').disabled = !allFilled;
}

function onChainKeydown(e) {
  if (e.key === 'Enter') {
    const inputs = Array.from(document.querySelectorAll('.chain-input'));
    const idx    = parseInt(e.target.dataset.index);
    if (idx < inputs.length - 1) {
      inputs[idx + 1].focus();
    } else {
      checkAnswer();
    }
  }
}

function updateAllPreviews() {
  const inputs  = Array.from(document.querySelectorAll('.chain-input'));
  const values  = inputs.map(inp => inp.value || '');
  const allWords = [currentPuzzle.start, ...values, currentPuzzle.end];

  for (let i = 0; i < allWords.length - 1; i++) {
    const L = allWords[i];
    const R = allWords[i + 1];

    const lEl  = document.getElementById(`cpd-l-${i}`);
    const rEl  = document.getElementById(`cpd-r-${i}`);
    const resEl = document.getElementById(`cpd-res-${i}`);

    if (lEl)   lEl.textContent  = L || '???';
    if (rEl)   rEl.textContent  = R || '???';
    if (resEl) {
      const compound = (L && R) ? L + R : '??????????';
      resEl.textContent = compound;
      resEl.className   = `cpd-result ${(L && R) ? 'has-value' : ''}`;
    }
  }
}

// ── Answer checking ───────────────────────────────────────────────────────────
function checkAnswer() {
  const inputs      = Array.from(document.querySelectorAll('.chain-input'));
  const userAnswers = inputs.map(inp => inp.value.trim().toUpperCase());
  const expected    = currentPuzzle.answer.map(a => a.toUpperCase());

  const allCorrect  = userAnswers.length === expected.length &&
    userAnswers.every((ans, i) => ans === expected[i]);

  if (allCorrect) {
    handleCorrect();
  } else {
    handleWrong(userAnswers, expected);
  }
}

async function handleCorrect() {
  const points    = currentPuzzle.points;
  const newStreak = await saveCompletion(currentTier, points);

  revealAnswers(currentPuzzle.answer, 'correct');
  refreshHeaderUI();

  const chain = buildChainString(currentPuzzle);
  displayResult(true, newStreak, chain);
  launchConfetti();
}

function handleWrong(userAnswers, expected) {
  userAnswers.forEach((ans, i) => {
    if (ans !== expected[i]) {
      const node = document.getElementById(`node-${i}`);
      if (!node) return;
      node.classList.add('shake');
      setTimeout(() => node.classList.remove('shake'), 500);

      const inp = document.getElementById(`chain-input-${i}`);
      if (inp) {
        inp.style.color = 'var(--red)';
        setTimeout(() => { inp.style.color = ''; }, 1200);
      }
    }
  });
}

function giveUp() {
  revealAnswers(currentPuzzle.answer, 'revealed');
  hide('submit-btn');
  hide('give-up-btn');
  hide('hint-btn');

  const chain = buildChainString(currentPuzzle);
  displayResult(false, userData.currentStreak || 0, chain);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function revealAnswers(answers, cssClass) {
  answers.forEach((ans, i) => {
    const inp  = document.getElementById(`chain-input-${i}`);
    const node = document.getElementById(`node-${i}`);
    if (inp)  { inp.value = ans; inp.disabled = true; }
    if (node) { node.className = `chain-node input-node ${cssClass}`; }
  });
  updateAllPreviews();
  hide('submit-btn');
  hide('give-up-btn');
}

function displayResult(success, streak, chainStr) {
  const { dayNumber } = getTodayPuzzle();

  setText('result-icon',        success ? '🎉' : '😔');
  setText('result-title',       success ? 'Chain Complete!' : 'Better luck next time!');
  setText('result-message',     success
    ? `+${currentPuzzle.points} pt${currentPuzzle.points > 1 ? 's' : ''} · 🔥 ${streak}-day streak`
    : 'The answer is revealed above.');
  setText('result-chain-words', chainStr);

  // Share handler
  const shareText = buildShareText(success, streak, dayNumber);
  el('share-btn').onclick = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      el('share-btn').textContent = 'Copied! ✓';
      setTimeout(() => el('share-btn').textContent = 'Share 📋', 2000);
    }).catch(() => {
      prompt('Copy this result:', shareText);
    });
  };

  show('result-banner');
}

function buildChainString(puzzle) {
  return [puzzle.start, ...puzzle.answer, puzzle.end].join(' → ');
}

function buildShareText(success, streak, dayNumber) {
  const completed = (userData.completedDays || {})[TODAY] || {};
  const icons     = { easy: '🟢', medium: '🟡', hard: '🔴' };
  const lines     = [`WordChain 🔗 Day #${dayNumber}`];

  ['easy', 'medium', 'hard'].forEach(tier => {
    const done = completed[tier] ? '✓' : (tier === currentTier && success ? '✓' : '✗');
    lines.push(`${icons[tier]} ${tier[0].toUpperCase() + tier.slice(1)}: ${done}`);
  });
  lines.push(`🔥 Streak: ${streak}`);
  lines.push('wordchain.game');
  return lines.join('\n');
}

// ── UI utilities ──────────────────────────────────────────────────────────────
const el   = id => document.getElementById(id);
const setText = (id, val) => { const e = el(id); if (e) e.textContent = val; };
const show = id => { const e = el(id); if (e) e.style.display = ''; };
const hide = id => { const e = el(id); if (e) e.style.display = 'none'; };

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  el(id).classList.add('active');
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  el(id).classList.add('active');
}

function refreshHeaderUI() {
  if (!userData || !currentUser) return;
  setText('header-streak', userData.currentStreak || 0);
  const avatar = el('user-avatar');
  if (currentUser.photoURL && avatar) {
    avatar.src            = currentUser.photoURL;
    avatar.style.display  = 'block';
  }
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function launchConfetti() {
  const COLORS  = ['#a855f7', '#22d3ee', '#22c55e', '#f59e0b', '#f472b6'];
  const canvas  = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width  = innerWidth;
  canvas.height = innerHeight;

  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height * 0.6,
    w: Math.random() * 8 + 4,
    h: Math.random() * 5 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 3 + 2,
    angle: Math.random() * 360,
    spin:  (Math.random() - 0.5) * 8,
  }));

  let frame = 0;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      p.vy   += 0.12;
    });
    if (++frame < 160) requestAnimationFrame(draw);
    else canvas.remove();
  })();
}

// ── Event bindings ────────────────────────────────────────────────────────────
function bindEvents() {
  el('google-signin-btn').addEventListener('click', signIn);
  el('user-avatar').addEventListener('click', signOut);
  el('home-btn').addEventListener('click', renderDashboard);

  ['easy', 'medium', 'hard'].forEach(tier => {
    el(`card-${tier}`).addEventListener('click', () => startGame(tier));
  });

  el('submit-btn').addEventListener('click', checkAnswer);
  el('give-up-btn').addEventListener('click', giveUp);

  el('hint-btn').addEventListener('click', () => {
    const hintEl = el('hint-text');
    hintEl.textContent = '💡 ' + currentPuzzle.hint;
    hintEl.classList.remove('hidden');
    hide('hint-btn');
  });

  el('back-to-home-btn').addEventListener('click', renderDashboard);
}
