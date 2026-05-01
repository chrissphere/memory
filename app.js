const DIFFICULTY = {
  3: '入门', 4: '简单', 5: '经典', 6: '困难', 7: '专家'
};

let gridSize = 5;
let currentTarget = 1;
let totalCells = 25;
let timerInterval = null;
let startTime = null;
let elapsed = 0;
let gameActive = false;

// ── Storage ──────────────────────────────────────────────
function storageKey(size) { return `schulte_stats_${size}`; }

function loadStats(size) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(size))) || { best: null, total: 0, sum: 0 };
  } catch { return { best: null, total: 0, sum: 0 }; }
}

function saveStats(size, timeMs) {
  const s = loadStats(size);
  s.total += 1;
  s.sum += timeMs;
  if (s.best === null || timeMs < s.best) s.best = timeMs;
  localStorage.setItem(storageKey(size), JSON.stringify(s));
}

function fmt(ms) {
  if (ms === null) return '--';
  return (ms / 1000).toFixed(1) + 's';
}

// ── Screens ───────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Home ──────────────────────────────────────────────────
function updateHomeStats() {
  const s = loadStats(gridSize);
  document.getElementById('stat-best').textContent = fmt(s.best);
  document.getElementById('stat-avg').textContent = s.total > 0 ? fmt(s.sum / s.total) : '--';
  document.getElementById('stat-count').textContent = s.total;
}

document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gridSize = parseInt(btn.dataset.size);
    updateHomeStats();
  });
});

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-back').addEventListener('click', () => {
  stopTimer();
  showScreen('screen-home');
  updateHomeStats();
});
document.getElementById('btn-again').addEventListener('click', startGame);
document.getElementById('btn-refresh').addEventListener('click', startGame);
document.getElementById('btn-home').addEventListener('click', () => {
  showScreen('screen-home');
  updateHomeStats();
});

// ── Game ──────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildGrid() {
  const grid = document.getElementById('grid');
  grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

  const numbers = shuffle([...Array(totalCells).keys()].map(i => i + 1));
  grid.innerHTML = '';

  const fontSize = gridSize <= 4 ? '24px' : gridSize === 5 ? '20px' : gridSize === 6 ? '17px' : '14px';

  numbers.forEach((num, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = num;
    cell.dataset.num = num;
    cell.style.fontSize = fontSize;
    cell.style.animationDelay = `${idx * 12}ms`;
    cell.addEventListener('click', () => handleCellClick(cell, num));
    grid.appendChild(cell);
  });
}

function handleCellClick(cell, num) {
  if (!gameActive) return;

  if (num === currentTarget) {
    cell.classList.add('correct');
    cell.style.color = 'var(--success)';
    currentTarget++;

    updateTargetDisplay();
    updateProgress();

    if (currentTarget > totalCells) {
      finishGame();
    }
  } else {
    cell.classList.add('wrong');
    setTimeout(() => cell.classList.remove('wrong'), 350);
  }
}

function updateTargetDisplay() {
  const el = document.getElementById('target-number');
  el.textContent = currentTarget <= totalCells ? currentTarget : '✓';
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 200);
}

function updateProgress() {
  const pct = ((currentTarget - 1) / totalCells) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
}

function startTimer() {
  startTime = Date.now();
  elapsed = 0;
  timerInterval = setInterval(() => {
    elapsed = Date.now() - startTime;
    document.getElementById('timer-display').textContent = (elapsed / 1000).toFixed(1);
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function startGame() {
  totalCells = gridSize * gridSize;
  currentTarget = 1;
  gameActive = true;
  elapsed = 0;

  document.getElementById('game-size-label').textContent = `${gridSize}×${gridSize}`;
  document.getElementById('timer-display').textContent = '0.0';
  document.getElementById('progress-bar').style.width = '0%';
  updateTargetDisplay();

  buildGrid();
  stopTimer();
  startTimer();
  showScreen('screen-game');
}

function finishGame() {
  gameActive = false;
  stopTimer();

  saveStats(gridSize, elapsed);
  const s = loadStats(gridSize);

  document.getElementById('result-time').textContent = fmt(elapsed);
  document.getElementById('result-best').textContent = fmt(s.best);

  const isNewBest = s.best === elapsed && s.total > 1;
  const rankEl = document.getElementById('result-rank');
  if (isNewBest) {
    rankEl.textContent = '🏆 新纪录';
  } else if (s.total === 1) {
    rankEl.textContent = '首次完成';
  } else {
    const diff = elapsed - s.best;
    rankEl.textContent = `+${fmt(diff)}`;
  }

  showScreen('screen-result');
}

// ── Init ──────────────────────────────────────────────────
updateHomeStats();
showScreen('screen-home');
