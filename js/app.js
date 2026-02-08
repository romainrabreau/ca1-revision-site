// ===== STATE =====
let currentMode = 'study';
let currentSession = 'all';
let fcIndex = 0;
let fcFilterSession = 'all';
let filteredFlashcards = [...Array(flashcards.length).keys()];
let fcOrder = [...filteredFlashcards];
let quizAnswers = {};
let quizScore = 0;
let sessionsRead = new Set();
let currentQuizMode = null;
let activeQuizQuestions = [];
let timerInterval = null;
let timerSeconds = 0;
let masteredCards = new Set();
let quizHistory = [];

// Load from localStorage
try {
  const saved = localStorage.getItem('ca1_progress');
  if (saved) sessionsRead = new Set(JSON.parse(saved));
  const savedTheme = localStorage.getItem('ca1_theme');
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  const savedMastered = localStorage.getItem('ca1_mastered');
  if (savedMastered) masteredCards = new Set(JSON.parse(savedMastered));
  const savedHistory = localStorage.getItem('ca1_quiz_history');
  if (savedHistory) quizHistory = JSON.parse(savedHistory);
} catch(e) {}

// ===== THEME =====
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('ca1_theme', isDark ? '' : 'dark');
}

// ===== MODES =====
function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(mode + 'Section').classList.add('active');
  document.getElementById('navTabs').style.display = (mode === 'study') ? 'flex' : 'none';
  if (mode === 'flashcards') { updateMasteryCounter(); showCard(); }
  if (mode === 'quiz') backToModeSelect();
}

// ===== SESSION TOGGLE =====
function toggleSession(header) {
  const card = header.closest('.session-card');
  card.classList.toggle('open');
  const sessionNum = card.dataset.session;
  if (card.classList.contains('open')) {
    sessionsRead.add(sessionNum);
    localStorage.setItem('ca1_progress', JSON.stringify([...sessionsRead]));
    updateProgress();
  }
}

// ===== FILTER SESSIONS =====
function filterSession(session) {
  currentSession = session;
  document.querySelectorAll('.nav-tab').forEach((t, i) => {
    if (session === 'all') t.classList.toggle('active', i === 0);
    else t.classList.toggle('active', t.textContent.includes('S' + session));
  });
  document.querySelectorAll('.session-card').forEach(card => {
    if (session === 'all') card.classList.remove('hidden');
    else card.classList.toggle('hidden', card.dataset.session !== String(session));
  });
  if (session !== 'all') {
    document.querySelectorAll('.session-card').forEach(card => {
      if (card.dataset.session === String(session)) card.classList.add('open');
    });
  }
}

// ===== SEARCH =====
function handleSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) { document.querySelectorAll('.session-card').forEach(c => c.classList.remove('hidden')); return; }
  document.querySelectorAll('.session-card').forEach(card => {
    const match = card.textContent.toLowerCase().includes(q);
    card.classList.toggle('hidden', !match);
    if (match) card.classList.add('open');
  });
}

// ===== PROGRESS =====
function updateProgress() {
  const total = 8; const read = sessionsRead.size;
  const pct = Math.round((read / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = pct + '%';
}
updateProgress();

// ===== FLASHCARDS =====
function filterFlashcards(session) {
  fcFilterSession = session;
  document.querySelectorAll('#fcFilterRow .fc-filter-btn').forEach(b => {
    if (session === 'all') b.classList.toggle('active', b.textContent === 'All');
    else if (session === 'notmastered') b.classList.toggle('active', b.classList.contains('mastered-filter'));
    else b.classList.toggle('active', b.textContent === 'S' + session);
  });
  if (session === 'all') filteredFlashcards = [...Array(flashcards.length).keys()];
  else if (session === 'notmastered') {
    filteredFlashcards = []; flashcards.forEach((c, i) => { if (!masteredCards.has(i)) filteredFlashcards.push(i); });
  } else {
    filteredFlashcards = []; flashcards.forEach((c, i) => { if (c.s === session) filteredFlashcards.push(i); });
  }
  fcOrder = [...filteredFlashcards]; fcIndex = 0; showCard();
}

function showCard() {
  if (fcOrder.length === 0) {
    document.getElementById('fcQuestion').textContent = fcFilterSession === 'notmastered' ? 'All cards mastered!' : 'No cards for this filter';
    document.getElementById('fcAnswer').textContent = '';
    document.getElementById('fcProgress').textContent = '0 / 0';
    document.getElementById('fcBadge').textContent = '';
    return;
  }
  const idx = fcOrder[fcIndex]; const card = flashcards[idx];
  document.getElementById('fcQuestion').textContent = card.q;
  document.getElementById('fcAnswer').textContent = card.a;
  document.getElementById('flashcard').classList.remove('flipped');
  document.getElementById('fcProgress').textContent = (fcIndex + 1) + ' / ' + fcOrder.length;
  document.getElementById('fcBadge').textContent = 'S' + card.s;
}

function flipCard() { document.getElementById('flashcard').classList.toggle('flipped'); }
function nextCard() { if (fcOrder.length === 0) return; fcIndex = (fcIndex + 1) % fcOrder.length; showCard(); }
function prevCard() { if (fcOrder.length === 0) return; fcIndex = (fcIndex - 1 + fcOrder.length) % fcOrder.length; showCard(); }
function shuffleCards() {
  for (let i = fcOrder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fcOrder[i], fcOrder[j]] = [fcOrder[j], fcOrder[i]]; }
  fcIndex = 0; showCard();
}

function markCard(action) {
  if (fcOrder.length === 0) return;
  const idx = fcOrder[fcIndex];
  if (action === 'gotit') masteredCards.add(idx); else masteredCards.delete(idx);
  localStorage.setItem('ca1_mastered', JSON.stringify([...masteredCards]));
  updateMasteryCounter();
  if (fcOrder.length > 1) nextCard();
}

function updateMasteryCounter() {
  const el = document.getElementById('fcMastery');
  if (el) el.textContent = 'Mastered: ' + masteredCards.size + ' / ' + flashcards.length;
}

// ===== CHEAT SHEET FILTER =====
function filterCheatSheet(session) {
  document.querySelectorAll('#csFilterRow .fc-filter-btn').forEach(b => {
    if (session === 'all') b.classList.toggle('active', b.textContent === 'All');
    else b.classList.toggle('active', b.textContent === 'S' + session);
  });
  document.querySelectorAll('.cheat-card').forEach(card => {
    if (session === 'all') card.classList.remove('hidden');
    else card.classList.toggle('hidden', card.dataset.cs !== String(session));
  });
}

// ===== QUIZ =====
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function backToModeSelect() {
  stopTimer(); currentQuizMode = null; activeQuizQuestions = []; quizAnswers = {}; quizScore = 0;
  document.getElementById('quizModeSelector').classList.remove('hidden');
  document.getElementById('quizSessionFilter').classList.add('hidden');
  document.getElementById('quizHeader').classList.add('hidden');
  document.getElementById('quizContainer').innerHTML = '';
  document.getElementById('quizResults').classList.remove('show');
  document.getElementById('quizTimer').classList.add('hidden-timer');
}

function startQuizMode(mode) {
  currentQuizMode = mode; quizAnswers = {}; quizScore = 0;
  if (mode === 'session') {
    document.getElementById('quizModeSelector').classList.add('hidden');
    document.getElementById('quizSessionFilter').classList.remove('hidden');
    return;
  }
  let indices = [...Array(quizQuestions.length).keys()];
  if (mode === 'quick10') { activeQuizQuestions = shuffleArray(indices).slice(0, 10); }
  else if (mode === 'exam') { activeQuizQuestions = shuffleArray(indices).slice(0, 15); }
  else { activeQuizQuestions = indices; }
  document.getElementById('quizModeSelector').classList.add('hidden');
  document.getElementById('quizSessionFilter').classList.add('hidden');
  document.getElementById('quizHeader').classList.remove('hidden');
  const titles = { quick10: 'Quick 10', exam: 'Exam Simulation (15 min)', full: 'Full Practice' };
  document.getElementById('quizTitle').textContent = titles[mode] || 'Quiz';
  if (mode === 'exam') { document.getElementById('quizTimer').classList.remove('hidden-timer'); startTimer(15 * 60); }
  else { document.getElementById('quizTimer').classList.add('hidden-timer'); }
  renderQuiz();
}

function startSessionQuiz(session) {
  activeQuizQuestions = [];
  quizQuestions.forEach((q, i) => { if (q.s === session) activeQuizQuestions.push(i); });
  if (activeQuizQuestions.length === 0) { alert('No questions for session ' + session); return; }
  document.getElementById('quizSessionFilter').classList.add('hidden');
  document.getElementById('quizHeader').classList.remove('hidden');
  document.getElementById('quizTitle').textContent = 'Session ' + session + ' Quiz';
  document.getElementById('quizTimer').classList.add('hidden-timer');
  quizAnswers = {}; quizScore = 0; renderQuiz();
}

function renderQuiz() {
  const container = document.getElementById('quizContainer');
  container.innerHTML = '';
  document.getElementById('quizResults').classList.remove('show');
  quizScore = 0; let answered = 0;
  activeQuizQuestions.forEach((qIdx, displayIdx) => {
    const q = quizQuestions[qIdx]; const div = document.createElement('div');
    div.className = 'question-card'; div.id = 'qcard-' + qIdx;
    const letters = ['A', 'B', 'C', 'D'];
    let optionsHtml = q.options.map((opt, oi) => {
      let cls = 'option'; const savedAnswer = quizAnswers[qIdx];
      if (savedAnswer !== undefined) { cls += ' disabled'; if (oi === q.correct) cls += ' correct'; if (oi === savedAnswer && savedAnswer !== q.correct) cls += ' wrong'; }
      return '<div class="' + cls + '" onclick="selectOption(' + qIdx + ',' + oi + ')" data-qi="' + qIdx + '" data-oi="' + oi + '"><div class="option-letter">' + letters[oi] + '</div><div>' + opt + '</div></div>';
    }).join('');
    const savedAnswer = quizAnswers[qIdx]; let expClass = 'explanation';
    if (savedAnswer !== undefined) { answered++; expClass += savedAnswer === q.correct ? ' correct-exp show' : ' wrong-exp show'; if (savedAnswer === q.correct) quizScore++; div.className += savedAnswer === q.correct ? ' answered-correct' : ' answered-wrong'; }
    div.innerHTML = '<div class="question-num">Question ' + (displayIdx + 1) + ' <span style="font-weight:400;opacity:0.6">(S' + q.s + ')</span></div><div class="question-text">' + q.q + '</div>' + optionsHtml + '<div class="' + expClass + '" id="exp-' + qIdx + '">' + q.explanation + '</div>';
    container.appendChild(div);
  });
  updateQuizScore(answered);
}

function selectOption(qi, oi) {
  if (quizAnswers[qi] !== undefined) return;
  quizAnswers[qi] = oi;
  const q = quizQuestions[qi]; const card = document.getElementById('qcard-' + qi);
  card.querySelectorAll('.option').forEach((opt, i) => { opt.classList.add('disabled'); if (i === q.correct) opt.classList.add('correct'); if (i === oi && oi !== q.correct) opt.classList.add('wrong'); });
  const exp = document.getElementById('exp-' + qi); exp.classList.add('show');
  if (oi === q.correct) { exp.classList.add('correct-exp'); card.classList.add('answered-correct'); quizScore++; }
  else { exp.classList.add('wrong-exp'); card.classList.add('answered-wrong'); }
  const answered = Object.keys(quizAnswers).length; updateQuizScore(answered);
  if (answered === activeQuizQuestions.length) { stopTimer(); showResults(); }
}

function updateQuizScore(answered) {
  const total = activeQuizQuestions.length;
  const pct = answered > 0 ? Math.round((quizScore / answered) * 100) : 0;
  document.getElementById('scoreText').textContent = pct + '%';
  document.getElementById('scoreCircle').style.background = 'conic-gradient(var(--primary) ' + (pct * 3.6) + 'deg, var(--border) ' + (pct * 3.6) + 'deg)';
  document.getElementById('quizProgress').textContent = answered + ' / ' + total + ' answered';
}

function showResults() {
  const total = activeQuizQuestions.length;
  const pct = Math.round((quizScore / total) * 100);
  const results = document.getElementById('quizResults');
  // Save history
  quizHistory.push({ mode: currentQuizMode || 'session', pct: pct });
  if (quizHistory.length > 10) quizHistory.shift();
  localStorage.setItem('ca1_quiz_history', JSON.stringify(quizHistory));
  const mistakes = activeQuizQuestions.filter(qi => quizAnswers[qi] !== quizQuestions[qi].correct).length;
  let msgText, subText;
  if (pct >= 80) { msgText = 'Excellent work!'; subText = 'You scored ' + quizScore + '/' + total + '. Well prepared for the CA1!'; }
  else if (pct >= 50) { msgText = 'Good effort!'; subText = 'You scored ' + quizScore + '/' + total + '. Review the ' + mistakes + ' question(s) you missed.'; }
  else { msgText = 'Keep studying!'; subText = 'You scored ' + quizScore + '/' + total + '. Go through the study material again.'; }
  let historyHtml = '';
  if (quizHistory.length > 1) historyHtml = '<div style="margin-top:16px;font-size:0.85em;color:var(--text-secondary)"><strong>Recent:</strong> ' + quizHistory.slice(-5).map(h => h.pct + '%').join(' → ') + '</div>';
  results.innerHTML = '<div class="results-circle ' + (pct >= 80 ? 'great' : pct >= 50 ? 'ok' : 'bad') + '">' + pct + '%</div>' +
    '<div class="results-msg">' + msgText + '</div><div class="results-sub">' + subText + '</div>' + historyHtml +
    '<div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">' +
    (mistakes > 0 ? '<button class="fc-btn" onclick="reviewMistakes()" style="border-color:var(--error);color:var(--error)">Review Mistakes</button>' : '') +
    '<button class="fc-btn primary-btn" onclick="backToModeSelect()">Back to Modes</button></div>';
  results.classList.add('show');
}

function reviewMistakes() {
  document.getElementById('quizResults').classList.remove('show');
  const first = activeQuizQuestions.find(qi => quizAnswers[qi] !== quizQuestions[qi].correct);
  if (first !== undefined) { const el = document.getElementById('qcard-' + first); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function resetQuiz() {
  quizAnswers = {}; quizScore = 0;
  document.getElementById('quizResults').classList.remove('show');
  if (currentQuizMode === 'exam') startTimer(15 * 60);
  renderQuiz();
}

// ===== TIMER =====
function startTimer(seconds) {
  stopTimer(); timerSeconds = seconds; updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) {
      stopTimer(); timerSeconds = 0; updateTimerDisplay();
      activeQuizQuestions.forEach(qi => {
        if (quizAnswers[qi] === undefined) {
          quizAnswers[qi] = -1; const card = document.getElementById('qcard-' + qi);
          if (card) { card.querySelectorAll('.option').forEach((opt, i) => { opt.classList.add('disabled'); if (i === quizQuestions[qi].correct) opt.classList.add('correct'); });
            const exp = document.getElementById('exp-' + qi); if (exp) exp.classList.add('show', 'wrong-exp'); card.classList.add('answered-wrong'); }
        }
      });
      showResults(); return;
    }
    updateTimerDisplay();
    if (timerSeconds <= 60) { document.getElementById('quizTimer').classList.add('warning'); if (navigator.vibrate && timerSeconds === 60) navigator.vibrate(200); }
  }, 1000);
}

function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } document.getElementById('quizTimer').classList.remove('warning'); }

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60); const s = timerSeconds % 60;
  document.getElementById('timerDisplay').textContent = m + ':' + s.toString().padStart(2, '0');
}

// ===== RESET ALL =====
function resetAllProgress() {
  if (!confirm('Reset all progress? (mastered cards, quiz history, session progress)')) return;
  localStorage.removeItem('ca1_progress'); localStorage.removeItem('ca1_mastered'); localStorage.removeItem('ca1_quiz_history');
  sessionsRead = new Set(); masteredCards = new Set(); quizHistory = [];
  updateProgress(); updateMasteryCounter();
}

// ===== KEYBOARD =====
document.addEventListener('keydown', (e) => {
  if (currentMode === 'flashcards') {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextCard(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevCard(); }
    if (e.key === 'Enter') { e.preventDefault(); flipCard(); }
  }
  if (currentMode === 'quiz') {
    const keyMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
    const optIdx = keyMap[e.key.toLowerCase()];
    if (optIdx !== undefined) {
      const unanswered = activeQuizQuestions.find(qi => quizAnswers[qi] === undefined);
      if (unanswered !== undefined) { e.preventDefault(); selectOption(unanswered, optIdx);
        const next = activeQuizQuestions.find(qi => quizAnswers[qi] === undefined);
        if (next !== undefined) { const el = document.getElementById('qcard-' + next); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); }
      }
    }
  }
});

// ===== SWIPE =====
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (currentMode !== 'flashcards') return;
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
  if (dx > 0) prevCard(); else nextCard();
}, { passive: true });

// ===== BACK TO TOP =====
window.addEventListener('scroll', () => { const btn = document.getElementById('backToTop'); if (btn) btn.classList.toggle('visible', window.scrollY > 400); }, { passive: true });

// ===== INIT =====
updateMasteryCounter();
showCard();
