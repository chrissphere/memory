// ── Constants ─────────────────────────────────────────────
const RADIUS = 22;
const SPEED_MAP = { slow: 1.5, medium: 3, fast: 5 };
const SETTINGS_KEY = 'tracking_settings';
const STATS_KEY = 'tracking_stats';

// ── State ──────────────────────────────────────────────────
let numBalls = 8;
let numTargets = 3;
let speed = 'medium';
let duration = 5;

let balls = [];
let phase = 'idle'; // idle | marking | tracking | guessing
let targetIds = new Set();
let selectedIds = new Set();
let animFrameId = null;
let countdownTimer = null;
let trackingStart = 0;
let trackingMs = 0;
let darkForced = false;

// ── Prefs ──────────────────────────────────────────────────
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function savePrefs(obj) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadPrefs(), ...obj }));
}

// ── Stats ──────────────────────────────────────────────────
function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || []; }
  catch { return []; }
}

function saveStats(record) {
  const stats = loadStats();
  stats.push(record);
  if (stats.length > 20) stats.shift();
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// ── Screens ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Home stats display ─────────────────────────────────────
function updateHomeStats() {
  const stats = loadStats();
  if (stats.length === 0) {
    document.getElementById('stat-best').textContent = '--';
    document.getElementById('stat-avg').textContent = '--';
    document.getElementById('stat-count').textContent = '0';
    return;
  }
  const rates = stats.map(r => r.correct / r.total);
  const best = Math.max(...rates);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  document.getElementById('stat-best').textContent = Math.round(best * 100) + '%';
  document.getElementById('stat-avg').textContent = Math.round(avg * 100) + '%';
  document.getElementById('stat-count').textContent = stats.length;
}

// ── Utility ────────────────────────────────────────────────
function applyTheme(forced) {
  document.body.classList.toggle('theme-dark', forced === true);
  document.body.classList.toggle('theme-light', forced === false);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Physics ────────────────────────────────────────────────
function initBalls(count, canvasSize) {
  balls = [];
  for (let i = 0; i < count; i++) {
    let x, y, ok, attempts = 0;
    do {
      ok = true;
      x = RADIUS + Math.random() * (canvasSize - RADIUS * 2);
      y = RADIUS + Math.random() * (canvasSize - RADIUS * 2);
      for (const b of balls) {
        if (Math.hypot(b.x - x, b.y - y) < RADIUS * 2.5) { ok = false; break; }
      }
    } while (!ok && ++attempts < 300);
    const angle = Math.random() * Math.PI * 2;
    const spd = SPEED_MAP[speed];
    balls.push({ id: i, x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd });
  }
}

function updatePositions(canvasSize) {
  for (const b of balls) {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < RADIUS)              { b.x = RADIUS;              b.vx =  Math.abs(b.vx); }
    if (b.x > canvasSize - RADIUS) { b.x = canvasSize - RADIUS; b.vx = -Math.abs(b.vx); }
    if (b.y < RADIUS)              { b.y = RADIUS;              b.vy =  Math.abs(b.vy); }
    if (b.y > canvasSize - RADIUS) { b.y = canvasSize - RADIUS; b.vy = -Math.abs(b.vy); }
  }
}

function checkCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist < RADIUS * 2) {
        [a.vx, b.vx] = [b.vx, a.vx];
        [a.vy, b.vy] = [b.vy, a.vy];
        const overlap = (RADIUS * 2 - dist) / 2;
        a.x -= (dx / dist) * overlap;
        a.y -= (dy / dist) * overlap;
        b.x += (dx / dist) * overlap;
        b.y += (dy / dist) * overlap;
      }
    }
  }
}

function drawFrame(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  for (const b of balls) {
    const isTarget   = targetIds.has(b.id);
    const isSelected = selectedIds.has(b.id);

    ctx.beginPath();
    ctx.arc(b.x, b.y, RADIUS, 0, Math.PI * 2);

    if (phase === 'marking') {
      ctx.fillStyle = isTarget ? '#F59E0B' : '#4A7CFF';
    } else if (phase === 'tracking') {
      ctx.fillStyle = '#6B7280';
    } else {
      ctx.fillStyle = isSelected ? '#4A7CFF' : '#6B7280';
    }
    ctx.fill();

    if (phase === 'marking' && isTarget) {
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (phase === 'guessing' && isSelected) {
      ctx.strokeStyle = 'rgba(74,124,255,0.5)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
}

function animate(canvas) {
  updatePositions(canvas.width);
  checkCollisions();
  drawFrame(canvas);
  animFrameId = requestAnimationFrame(() => animate(canvas));
}

function stopAnimation() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
}

function stopAll() {
  stopAnimation();
  clearInterval(countdownTimer);
  countdownTimer = null;
  phase = 'idle';
}

// ── Game state machine ─────────────────────────────────────
function startGame() {
  stopAll();
  selectedIds = new Set();

  const canvas = document.getElementById('game-canvas');
  const size = Math.min(window.innerWidth - 40, 420);
  canvas.width = size;
  canvas.height = size;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';

  const allIds = shuffle(Array.from({ length: numBalls }, (_, i) => i));
  targetIds = new Set(allIds.slice(0, numTargets));

  initBalls(numBalls, size);

  canvas.onclick = null;
  canvas.addEventListener('click', handleCanvasClick);

  document.getElementById('btn-launch').style.visibility = 'hidden';
  document.getElementById('btn-confirm').style.visibility = 'hidden';
  document.getElementById('btn-confirm').disabled = true;
  document.getElementById('countdown').textContent = '';

  showScreen('screen-game');
  startMarking(canvas);
}

function startMarking(canvas) {
  phase = 'marking';
  document.getElementById('phase-label').textContent = `记住 ${numTargets} 个橙色目标球`;
  drawFrame(canvas);
  document.getElementById('btn-launch').style.visibility = 'visible';
}

function startTracking(canvas) {
  phase = 'tracking';
  document.getElementById('phase-label').textContent = '追踪目标球……';
  trackingStart = Date.now();

  let remaining = duration;
  document.getElementById('countdown').textContent = remaining;

  countdownTimer = setInterval(() => {
    remaining--;
    document.getElementById('countdown').textContent = remaining > 0 ? remaining : '';
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startGuessing(canvas);
    }
  }, 1000);

  animate(canvas);
}

function startGuessing(canvas) {
  stopAnimation();
  trackingMs = Date.now() - trackingStart;
  phase = 'guessing';
  document.getElementById('phase-label').textContent = `点选 ${numTargets} 个目标球`;
  document.getElementById('btn-confirm').style.visibility = 'visible';
  document.getElementById('btn-confirm').disabled = true;
  drawFrame(canvas);
}

function handleCanvasClick(e) {
  if (phase !== 'guessing') return;
  const canvas = document.getElementById('game-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top)  * scaleY;
  for (const b of balls) {
    if (Math.hypot(b.x - x, b.y - y) <= RADIUS) {
      toggleSelect(b.id);
      break;
    }
  }
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  drawFrame(document.getElementById('game-canvas'));
  document.getElementById('btn-confirm').disabled = selectedIds.size !== numTargets;
}

function confirmGuess() {
  let correct = 0;
  for (const id of selectedIds) {
    if (targetIds.has(id)) correct++;
  }
  saveStats({ correct, total: numTargets, ms: trackingMs, ts: Date.now() });
  showResult(correct);
}

// ── Result ─────────────────────────────────────────────────
function showResult(correct) {
  const pct = Math.round((correct / numTargets) * 100);
  document.getElementById('result-correct').textContent = `${correct}/${numTargets}`;
  document.getElementById('result-pct').textContent = pct + '%';
  document.getElementById('result-duration').textContent =
    '追踪时长 ' + (trackingMs / 1000).toFixed(1) + 's';
  document.getElementById('result-pct').style.color =
    pct === 100 ? 'var(--success)' : pct >= 60 ? 'var(--primary)' : 'var(--error)';

  showScreen('screen-result');

  const chartCanvas = document.getElementById('chart-canvas');
  const stats = loadStats();
  drawHistoryChart(chartCanvas, stats.slice(-10));
}

function drawHistoryChart(canvas, records) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (records.length < 2) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('完成更多局次后显示趋势', W / 2, H / 2);
    return;
  }

  const pad = { t: 10, r: 10, b: 10, l: 10 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;

  const pts = records.map((r, i) => ({
    x: pad.l + (i / (records.length - 1)) * chartW,
    y: pad.t + (1 - r.correct / r.total) * chartH,
  }));

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.t + chartH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.t + chartH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(74,124,255,0.1)';
  ctx.fill();

  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#4A7CFF';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = '#4A7CFF';
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const last = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#4A7CFF';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ── Init ───────────────────────────────────────────────────
(function initPrefs() {
  const p = loadPrefs();
  numBalls   = p.balls    || 8;
  numTargets = p.targets  || 3;
  speed      = p.speed    || 'medium';
  duration   = p.duration || 5;

  darkForced = p.darkForced || false;
  applyTheme(darkForced ? true : null);
  const toggleTheme = document.getElementById('toggle-theme');
  toggleTheme.checked = !!darkForced;
  toggleTheme.addEventListener('change', () => {
    darkForced = toggleTheme.checked;
    applyTheme(darkForced ? true : null);
    savePrefs({ darkForced });
  });

  const inputBalls = document.getElementById('input-balls');
  inputBalls.value = numBalls;
  inputBalls.addEventListener('change', () => {
    numBalls = Math.max(4, Math.min(20, parseInt(inputBalls.value) || 8));
    numTargets = Math.min(numTargets, Math.floor(numBalls / 2));
    document.getElementById('input-targets').value = numTargets;
    inputBalls.value = numBalls;
    savePrefs({ balls: numBalls });
  });

  const inputTargets = document.getElementById('input-targets');
  inputTargets.value = numTargets;
  inputTargets.addEventListener('change', () => {
    const max = Math.floor(numBalls / 2);
    numTargets = Math.max(1, Math.min(max, parseInt(inputTargets.value) || 3));
    inputTargets.value = numTargets;
    savePrefs({ targets: numTargets });
  });

  const inputDuration = document.getElementById('input-duration');
  inputDuration.value = duration;
  inputDuration.addEventListener('change', () => {
    duration = Math.max(3, Math.min(15, parseInt(inputDuration.value) || 5));
    inputDuration.value = duration;
    savePrefs({ duration });
  });

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.speed === speed);
    btn.addEventListener('click', () => {
      speed = btn.dataset.speed;
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      savePrefs({ speed });
    });
  });

  document.getElementById('btn-launch').addEventListener('click', () => {
    document.getElementById('btn-launch').style.visibility = 'hidden';
    startTracking(document.getElementById('game-canvas'));
  });

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-back').addEventListener('click', () => {
    stopAll();
    showScreen('screen-home');
    updateHomeStats();
  });
  document.getElementById('btn-confirm').addEventListener('click', confirmGuess);
  document.getElementById('btn-again').addEventListener('click', startGame);
  document.getElementById('btn-home').addEventListener('click', () => {
    showScreen('screen-home');
    updateHomeStats();
  });

  updateHomeStats();
  showScreen('screen-home');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
})();
