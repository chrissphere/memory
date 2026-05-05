const DIFFICULTY = {
  3: '入门', 4: '简单', 5: '经典', 6: '困难', 7: '专家'
};

let gridSize = 5;
let zoneEnabled = false;
let zoneDeep = false;
let startNum = 1;
let staggerEnabled = false;
let staggerDelay = 12;
let currentTarget = 1;
let totalCells = 25;
let timerInterval = null;
let startTime = null;
let elapsed = 0;
let gameActive = false;

// ── Settings persistence ───────────────────────────────────
const SETTINGS_KEY = 'schulte_settings';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function savePrefs(obj) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadPrefs(), ...obj }));
}

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
    savePrefs({ size: gridSize });
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

function getZoneClass(idx) {
  const row = Math.floor(idx / gridSize);
  const col = idx % gridSize;
  if (gridSize % 2 === 1) {
    const mid = Math.floor(gridSize / 2);
    if (row === mid || col === mid) return '';
    if (row < mid && col < mid) return 'zone-tl';
    if (row < mid && col > mid) return 'zone-tr';
    if (row > mid && col < mid) return 'zone-bl';
    return 'zone-br';
  } else {
    const half = gridSize / 2;
    if (row < half && col < half) return 'zone-tl';
    if (row < half && col >= half) return 'zone-tr';
    if (row >= half && col < half) return 'zone-bl';
    return 'zone-br';
  }
}

function buildGrid() {
  const grid = document.getElementById('grid');
  grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  if (zoneEnabled && zoneDeep) grid.classList.add('zone-deep');
  else grid.classList.remove('zone-deep');

  const numbers = shuffle([...Array(totalCells).keys()].map(i => i + startNum));
  grid.innerHTML = '';

  const fontSize = gridSize <= 4 ? '24px' : gridSize === 5 ? '20px' : gridSize === 6 ? '17px' : '14px';

  numbers.forEach((num, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (zoneEnabled) {
      const zc = getZoneClass(idx);
      if (zc) cell.classList.add(zc);
    }
    cell.textContent = num;
    cell.dataset.num = num;
    cell.style.fontSize = fontSize;
    if (staggerEnabled) cell.style.animationDelay = `${idx * staggerDelay}ms`;
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

    updateProgress();

    if (currentTarget > startNum + totalCells - 1) {
      finishGame();
    }
  } else {
    cell.classList.add('wrong');
    setTimeout(() => cell.classList.remove('wrong'), 350);
  }
}

function updateProgress() {
  const pct = ((currentTarget - startNum) / totalCells) * 100;
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
  currentTarget = startNum;
  gameActive = true;
  elapsed = 0;

  document.getElementById('game-size-label').textContent = `${gridSize}×${gridSize}`;
  document.getElementById('timer-display').textContent = '0.0';
  document.getElementById('progress-bar').style.width = '0%';

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
(function initPrefs() {
  const p = loadPrefs();
  gridSize = p.size || 5;
  zoneEnabled = p.zone || false;
  zoneDeep = p.zoneDeep || false;
  startNum = p.startNum || 1;
  staggerEnabled = p.stagger || false;
  staggerDelay = p.staggerDelay || 12;

  const sizeBtn = document.querySelector(`.size-btn[data-size="${gridSize}"]`);
  if (sizeBtn) sizeBtn.classList.add('active');

  const toggle = document.getElementById('toggle-zone');
  toggle.checked = zoneEnabled;
  toggle.addEventListener('change', () => {
    zoneEnabled = toggle.checked;
    savePrefs({ zone: zoneEnabled });
  });

  const toggleDeep = document.getElementById('toggle-zone-deep');
  toggleDeep.checked = zoneDeep;
  toggleDeep.addEventListener('change', () => {
    zoneDeep = toggleDeep.checked;
    savePrefs({ zoneDeep });
  });

  const inputStart = document.getElementById('input-start-num');
  inputStart.value = startNum;
  inputStart.addEventListener('change', () => {
    startNum = Math.max(1, parseInt(inputStart.value) || 1);
    inputStart.value = startNum;
    savePrefs({ startNum });
  });

  const toggleStagger = document.getElementById('toggle-stagger');
  const rowStaggerDelay = document.getElementById('row-stagger-delay');
  const inputStaggerDelay = document.getElementById('input-stagger-delay');

  toggleStagger.checked = staggerEnabled;
  rowStaggerDelay.style.display = staggerEnabled ? 'flex' : 'none';
  inputStaggerDelay.value = staggerDelay;

  toggleStagger.addEventListener('change', () => {
    staggerEnabled = toggleStagger.checked;
    rowStaggerDelay.style.display = staggerEnabled ? 'flex' : 'none';
    savePrefs({ stagger: staggerEnabled });
  });

  inputStaggerDelay.addEventListener('change', () => {
    const v = parseInt(inputStaggerDelay.value) || 12;
    staggerDelay = Math.round(v / 12) * 12;
    staggerDelay = Math.max(12, Math.min(240, staggerDelay));
    inputStaggerDelay.value = staggerDelay;
    savePrefs({ staggerDelay });
  });
})();

updateHomeStats();
showScreen('screen-home');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
