const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ====== 画布尺寸 ======
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ====== 配置 ======
const birdSize = 30;
const gravity = 0.4;
const lift = -9;
const pipeWidth = 80;
const pipeGap = 245;
const pipeSpeed = 2.5;
const groundHeight = 50;
const coinRadius = 10;
const powerupSize = 28;
const POWERUPS = {
  SHIELD: 'shield',
  DASH: 'dash',
  SHRINK: 'shrink'
};
const POWERUP_TYPES = [POWERUPS.SHIELD, POWERUPS.DASH, POWERUPS.SHRINK];
const POWERUP_LABELS = {
  [POWERUPS.SHIELD]: '盾',
  [POWERUPS.DASH]: '冲',
  [POWERUPS.SHRINK]: '小'
};
const POWERUP_COLORS = {
  [POWERUPS.SHIELD]: '#29B6F6',
  [POWERUPS.DASH]: '#EF5350',
  [POWERUPS.SHRINK]: '#AB47BC'
};

// 帧率归一化（参考网站做法）
const PHYSICS_DT = 1000 / 60; // 16.67ms，基准 60fps
let lastTimestamp = 0;
let _dt = 1; // 当前帧的时间缩放因子

// ====== UI 缩放 ======
function uiScale() {
  return Math.min(canvas.width, canvas.height) / 700;
}

// ====== 游戏状态 ======
const STATE = { START: 'START', COUNTDOWN: 'COUNTDOWN', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER' };
let state = STATE.START;

// ====== 游戏变量 ======
let birdX;
let birdY;
let birdSpeed = 0;
let pipes = [];
let pipeSpawnTimer = 0;
let frame = 0;
let score = 0;
let coins = [];
let coinCount = 0;
let powerups = [];
let activePowerups = {
  [POWERUPS.SHIELD]: 0,
  [POWERUPS.DASH]: 0,
  [POWERUPS.SHRINK]: 0
};
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let leaderboardSubmitted = false;
let groundOffset = 0;
let clouds = [];

function resetGameState() {
  birdX = Math.floor(canvas.width / 4);
  birdY = canvas.height / 2;
  birdSpeed = 0;
  pipes = [];
  pipeSpawnTimer = 0;
  frame = 0;
  score = 0;
  coins = [];
  coinCount = 0;
  powerups = [];
  activePowerups = {
    [POWERUPS.SHIELD]: 0,
    [POWERUPS.DASH]: 0,
    [POWERUPS.SHRINK]: 0
  };
  leaderboardSubmitted = false;
  groundOffset = 0;
  clouds = [];
  for (let i = 0; i < 3; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 30 + Math.random() * (canvas.height * 0.15),
      size: 25 + Math.random() * 20
    });
  }
}

resetGameState();

// ====== 主题 ======
function getTheme() {
  return document.documentElement.dataset.theme || 'light';
}

function isDark() {
  return getTheme() === 'dark';
}

// ====== 背景 ======
function drawBackground() {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - groundHeight);
  if (isDark()) {
    skyGradient.addColorStop(0, '#0f0f23');
    skyGradient.addColorStop(1, '#1a1a3e');
  } else {
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#E0F7FA');
  }
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height - groundHeight);
}

function drawClouds() {
  ctx.fillStyle = isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)';
  clouds.forEach(cloud => {
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 0.8, cloud.y - cloud.size * 0.3, cloud.size * 0.7, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 1.5, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateClouds() {
  clouds.forEach(cloud => {
    cloud.x -= 0.5 * _dt;
    if (cloud.x + cloud.size * 2 < 0) {
      cloud.x = canvas.width + cloud.size;
      cloud.y = 30 + Math.random() * (canvas.height * 0.15);
    }
  });
}

function drawGround() {
  const groundGradient = ctx.createLinearGradient(0, canvas.height - groundHeight, 0, canvas.height);
  if (isDark()) {
    groundGradient.addColorStop(0, '#2d5a3d');
    groundGradient.addColorStop(1, '#1a3d2a');
  } else {
    groundGradient.addColorStop(0, '#7CB342');
    groundGradient.addColorStop(1, '#558B2F');
  }
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

  ctx.fillStyle = isDark() ? '#3a7a4a' : '#8BC34A';
  for (let x = -groundOffset; x < canvas.width; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, canvas.height - groundHeight);
    ctx.lineTo(x + 10, canvas.height - groundHeight - 15);
    ctx.lineTo(x + 20, canvas.height - groundHeight);
    ctx.fill();
  }
}

function updateGround() {
  groundOffset = (groundOffset + pipeSpeed * _dt) % 20;
}

// ====== 鸟 ======
function drawBird(x, y, speed) {
  ctx.save();
  const shrinkScale = activePowerups[POWERUPS.SHRINK] > 0 ? 0.68 : 1;
  ctx.translate(x + birdSize / 2, y + birdSize / 2);
  ctx.rotate(Math.min(Math.max(speed * 0.1, -0.5), 1));
  ctx.scale(shrinkScale, shrinkScale);

  if (activePowerups[POWERUPS.SHIELD] > 0) {
    ctx.strokeStyle = 'rgba(41, 182, 246, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, birdSize * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (activePowerups[POWERUPS.DASH] > 0) {
    ctx.fillStyle = 'rgba(239, 83, 80, 0.28)';
    ctx.beginPath();
    ctx.moveTo(-birdSize * 0.9, 0);
    ctx.lineTo(-birdSize * 1.8, -birdSize * 0.35);
    ctx.lineTo(-birdSize * 1.8, birdSize * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(0, 0, birdSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFA000';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(5, -3, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(7, -3, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(8, -4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isDark() ? '#555' : '#FF5722';
  ctx.beginPath();
  ctx.moveTo(-5, 5);
  ctx.lineTo(-15, 8);
  ctx.lineTo(-5, 11);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ====== 管道 ======
function drawCoin(coin) {
  ctx.save();
  ctx.translate(coin.x, coin.y);
  ctx.fillStyle = '#FFC107';
  ctx.beginPath();
  ctx.arc(0, 0, coinRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F57F17';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#FFF8E1';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 1);
  ctx.restore();
}

function drawPowerup(powerup) {
  const half = powerupSize / 2;
  ctx.save();
  ctx.translate(powerup.x, powerup.y);
  ctx.fillStyle = POWERUP_COLORS[powerup.type];
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-half, -half, powerupSize, powerupSize, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(POWERUP_LABELS[powerup.type], 0, 1);
  ctx.restore();
}

function spawnCollectiblesForPipe(pipe) {
  const gapTop = pipe.height;
  const gapBottom = pipe.height + pipeGap;
  const centerY = gapTop + pipeGap / 2;
  const wave = Math.random() > 0.5 ? 1 : -1;

  coins.push({
    x: pipe.x + pipeWidth + 95,
    y: Math.max(gapTop + 28, Math.min(gapBottom - 28, centerY + wave * 42)),
    r: coinRadius
  });

  if (Math.random() < 0.45) {
    powerups.push({
      x: pipe.x + pipeWidth + 170,
      y: Math.max(gapTop + 36, Math.min(gapBottom - 36, centerY - wave * 38)),
      type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
    });
  }
}

function getBirdRadius() {
  const baseRadius = birdSize / 2 * 0.8;
  return activePowerups[POWERUPS.SHRINK] > 0 ? baseRadius * 0.65 : baseRadius;
}

function collectByDistance(item, radius) {
  const birdCenterX = birdX + birdSize / 2;
  const birdCenterY = birdY + birdSize / 2;
  return Math.hypot(birdCenterX - item.x, birdCenterY - item.y) <= getBirdRadius() + radius;
}

function activatePowerup(type) {
  if (type === POWERUPS.SHIELD) {
    activePowerups[type] = Math.max(activePowerups[type], 600);
  } else if (type === POWERUPS.DASH) {
    activePowerups[type] = Math.max(activePowerups[type], 300);
  } else if (type === POWERUPS.SHRINK) {
    activePowerups[type] = Math.max(activePowerups[type], 480);
  }
}

function updatePowerupTimers() {
  Object.keys(activePowerups).forEach(type => {
    activePowerups[type] = Math.max(0, activePowerups[type] - _dt);
  });
}

function updateCollectibles() {
  coins.forEach(coin => {
    coin.x -= pipeSpeed * _dt;
    if (!coin.collected && collectByDistance(coin, coin.r)) {
      coin.collected = true;
      coinCount++;
      score++;
    }
  });
  coins = coins.filter(coin => !coin.collected && coin.x + coin.r > 0);

  powerups.forEach(powerup => {
    powerup.x -= pipeSpeed * _dt;
    if (!powerup.collected && collectByDistance(powerup, powerupSize * 0.55)) {
      powerup.collected = true;
      activatePowerup(powerup.type);
    }
  });
  powerups = powerups.filter(powerup => !powerup.collected && powerup.x + powerupSize > 0);
}

function absorbPipeHit(pipe) {
  if (activePowerups[POWERUPS.DASH] > 0) {
    pipe.destroyed = true;
    score += 2;
    coinCount += 1;
    birdSpeed = Math.min(birdSpeed, -2);
    return true;
  }

  if (activePowerups[POWERUPS.SHIELD] > 0) {
    activePowerups[POWERUPS.SHIELD] = 0;
    pipe.destroyed = true;
    birdSpeed = lift * 0.45;
    return true;
  }

  return false;
}

function drawPipe(pipe) {
  const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  const bottomGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  const colorMid = isDark() ? '#4CAF50' : '#66BB6A';

  topGradient.addColorStop(0, '#2E7D32');
  topGradient.addColorStop(0.5, colorMid);
  topGradient.addColorStop(1, '#2E7D32');
  bottomGradient.addColorStop(0, '#2E7D32');
  bottomGradient.addColorStop(0.5, colorMid);
  bottomGradient.addColorStop(1, '#2E7D32');

  ctx.fillStyle = topGradient;
  ctx.fillRect(pipe.x, 0, pipeWidth, pipe.height);
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(pipe.x, pipe.height + pipeGap, pipeWidth, canvas.height - pipe.height - pipeGap - groundHeight);

  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(pipe.x - 3, pipe.height - 20, pipeWidth + 6, 20);
  ctx.fillRect(pipe.x - 3, pipe.height + pipeGap, pipeWidth + 6, 20);

  ctx.strokeStyle = isDark() ? '#2E7D32' : '#388E3C';
  ctx.lineWidth = 2;
  ctx.strokeRect(pipe.x - 3, pipe.height - 20, pipeWidth + 6, 20);
  ctx.strokeRect(pipe.x - 3, pipe.height + pipeGap, pipeWidth + 6, 20);
}

function updatePipes() {
  // 管道生成计时器（_dt 归一化到 60fps，120 = 2 秒）
  pipeSpawnTimer += _dt;
  if (frame > 0 && pipeSpawnTimer >= 120) {
    pipeSpawnTimer -= 120;
    const maxPipe = canvas.height - pipeGap - groundHeight - 100;
    const height = Math.random() * Math.max(maxPipe, 1) + 50;
    const pipe = { x: canvas.width, height };
    pipes.push(pipe);
    spawnCollectiblesForPipe(pipe);
  }

  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed * _dt;
    if (pipe.x + pipeWidth < birdX && !pipe.passed) {
      pipe.passed = true;
      score++;
    }
  });

  pipes = pipes.filter(pipe => !pipe.destroyed && pipe.x + pipeWidth > 0);
}

function checkCollision() {
  if (birdY < 0 || birdY + birdSize > canvas.height - groundHeight) return true;

  const birdCenterX = birdX + birdSize / 2;
  const birdCenterY = birdY + birdSize / 2;
  const birdRadius = getBirdRadius();

  for (const pipe of pipes) {
    if (birdCenterX + birdRadius < pipe.x || birdCenterX - birdRadius > pipe.x + pipeWidth) continue;
    if (birdCenterY - birdRadius < pipe.height || birdCenterY + birdRadius > pipe.height + pipeGap) {
      return !absorbPipeHit(pipe);
    }
  }

  return false;
}

// ====== 分数 ======
function drawScore() {
  ctx.save();
  const s = uiScale();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${Math.round(64 * s)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(score, canvas.width / 2, Math.round(55 * s));

  ctx.shadowBlur = 3;
  ctx.font = `bold ${Math.round(22 * s)}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFD54F';
  ctx.fillText('$ ' + coinCount, Math.round(24 * s), Math.round(44 * s));

  let badgeX = Math.round(24 * s);
  const badgeY = Math.round(76 * s);
  Object.keys(activePowerups).forEach(type => {
    if (activePowerups[type] <= 0) return;
    const seconds = Math.ceil(activePowerups[type] / 60);
    const badgeW = Math.round(74 * s);
    const badgeH = Math.round(28 * s);
    ctx.shadowBlur = 0;
    ctx.fillStyle = POWERUP_COLORS[type];
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, Math.round(14 * s));
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${Math.round(15 * s)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(POWERUP_LABELS[type] + ' ' + seconds + 's', badgeX + badgeW / 2, badgeY + Math.round(20 * s));
    badgeX += badgeW + Math.round(8 * s);
  });
  ctx.restore();
}

// ====== 状态切换 ======
function startPlaying() {
  state = STATE.COUNTDOWN;
  frame = 0;
  pipeSpawnTimer = 0;
  birdY = canvas.height / 2;
  birdSpeed = 0;
  pipes = [];
  score = 0;
  coins = [];
  coinCount = 0;
  powerups = [];
  activePowerups = {
    [POWERUPS.SHIELD]: 0,
    [POWERUPS.DASH]: 0,
    [POWERUPS.SHRINK]: 0
  };
  leaderboardSubmitted = false;
}

function goToStart() {
  state = STATE.START;
  resetGameState();
}

// ====== 倒计时 ======
function drawStartPowerupLegend(centerX, y, s) {
  const items = [
    { color: '#FFD54F', label: '$ 金币加分' },
    { color: POWERUP_COLORS[POWERUPS.SHIELD], label: '盾 挡一次' },
    { color: POWERUP_COLORS[POWERUPS.DASH], label: '冲 撞碎管道' },
    { color: POWERUP_COLORS[POWERUPS.SHRINK], label: '小 缩小身体' }
  ];
  const textSize = Math.max(12, Math.round(15 * s));
  const gap = Math.round(10 * s);
  const chipH = Math.round(28 * s);

  ctx.save();
  ctx.font = `bold ${textSize}px Arial`;
  const chipWidths = items.map(item => Math.round(ctx.measureText(item.label).width + 28 * s));
  const maxRowW = canvas.width - Math.round(32 * s);
  const rows = [];
  let currentRow = [];
  let currentWidth = 0;
  items.forEach((item, index) => {
    const width = chipWidths[index];
    const nextWidth = currentRow.length === 0 ? width : currentWidth + gap + width;
    if (currentRow.length > 0 && nextWidth > maxRowW) {
      rows.push({ items: currentRow, width: currentWidth });
      currentRow = [];
      currentWidth = 0;
    }
    currentRow.push({ item, width });
    currentWidth = currentRow.length === 1 ? width : currentWidth + gap + width;
  });
  if (currentRow.length > 0) rows.push({ items: currentRow, width: currentWidth });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  rows.forEach((row, rowIndex) => {
    let x = centerX - row.width / 2;
    const rowY = y + rowIndex * (chipH + Math.round(8 * s));
    row.items.forEach(({ item, width }) => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, rowY, width, chipH, Math.round(14 * s));
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.fillText(item.label, x + width / 2, rowY + chipH / 2);
      x += width + gap;
    });
  });
  ctx.restore();
}

function renderCountdown() {
  drawBackground();
  updateClouds();
  drawClouds();
  const bobY = birdY + Math.sin(frame * 0.05) * 8;
  drawBird(birdX, bobY, 0);
  updateGround();
  drawGround();

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const s = uiScale();
  const remaining = 210 - frame;
  ctx.textAlign = 'center';

  if (remaining > 150) {
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${Math.round(120 * s)}px Arial`;
    ctx.fillText('3', canvas.width / 2, canvas.height / 2 + 10);
  } else if (remaining > 90) {
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${Math.round(120 * s)}px Arial`;
    ctx.fillText('2', canvas.width / 2, canvas.height / 2 + 10);
  } else if (remaining > 30) {
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${Math.round(120 * s)}px Arial`;
    ctx.fillText('1', canvas.width / 2, canvas.height / 2 + 10);
  } else {
    ctx.fillStyle = '#4CAF50';
    ctx.font = `bold ${Math.round(90 * s)}px Arial`;
    ctx.fillText('GO!', canvas.width / 2, canvas.height / 2 + 10);
  }
}

// ====== 界面渲染 ======
function renderStartScreen() {
  drawBackground();
  updateClouds();
  drawClouds();
  updateGround();
  drawGround();

  const bobY = birdY + Math.sin(frame * 0.05) * 8;
  drawBird(birdX, bobY, 0);

  const s = uiScale();

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = isDark() ? '#FFD700' : '#FFF';
  ctx.font = `bold ${Math.round(64 * s)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Flappy Bird', canvas.width / 2, Math.round(canvas.height * 0.2));
  ctx.restore();

  const boxY = canvas.height / 2;
  ctx.fillStyle = isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const boxW = Math.round(300 * s);
  const boxH = Math.round(130 * s);
  const boxX = (canvas.width - boxW) / 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, Math.round(16 * s));
  ctx.fill();

  ctx.fillStyle = isDark() ? '#E0E0E0' : '#444';
  ctx.font = `${Math.round(22 * s)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('点击或按空格键', canvas.width / 2, boxY + Math.round(50 * s));
  ctx.fillText('开始游戏', canvas.width / 2, boxY + Math.round(86 * s));
  drawStartPowerupLegend(canvas.width / 2, boxY + Math.round(150 * s), s);

  if (highScore > 0) {
    ctx.fillStyle = isDark() ? '#FFD700' : '#E65100';
    ctx.font = `bold ${Math.round(20 * s)}px Arial`;
    ctx.fillText('\u{1F3C6} 最高分: ' + highScore, canvas.width / 2, boxY + Math.round(125 * s));
  }
}

function renderGameOverOverlay() {
  ctx.fillStyle = isDark() ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const s = uiScale();

  ctx.fillStyle = '#FF5252';
  ctx.font = `bold ${Math.round(56 * s)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - Math.round(100 * s));

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${Math.round(36 * s)}px Arial`;
  ctx.fillText('得分: ' + score, canvas.width / 2, canvas.height / 2 - Math.round(30 * s));

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${Math.round(28 * s)}px Arial`;
  ctx.fillText('\u{1F3C6} 最高分: ' + highScore, canvas.width / 2, canvas.height / 2 + Math.round(20 * s));

  const btnX = canvas.width / 2 - Math.round(120 * s);
  const btnY = canvas.height / 2 + Math.round(70 * s);
  const btnW = Math.round(240 * s);
  const btnH = Math.round(60 * s);

  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#4CAF50');
  btnGrad.addColorStop(1, '#388E3C');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, Math.round(30 * s));
  ctx.fill();

  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, Math.round(30 * s));
  ctx.stroke();

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${Math.round(28 * s)}px Arial`;
  ctx.fillText('重新开始', canvas.width / 2, btnY + Math.round(40 * s));

  window._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
}

function renderPausedOverlay() {
  ctx.fillStyle = isDark() ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const s = uiScale();

  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${Math.round(52 * s)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('暂停中', canvas.width / 2, canvas.height / 2 - Math.round(15 * s));

  ctx.font = `${Math.round(24 * s)}px Arial`;
  ctx.fillText('按 P 或 Esc 继续', canvas.width / 2, canvas.height / 2 + Math.round(35 * s));
}

// ====== 游戏更新（所有物理乘以 _dt 适配帧率） ======
function update() {
  birdSpeed += gravity * _dt;
  birdY += birdSpeed * _dt;
  updatePipes();
  updateCollectibles();
  updatePowerupTimers();

  if (checkCollision()) {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('flappyHighScore', highScore);
    }
    submitFlappyScore();
    state = STATE.GAME_OVER;
  }
}

function submitFlappyScore() {
  if (leaderboardSubmitted || !window.GagagaPlatform) return;
  leaderboardSubmitted = true;
  window.GagagaPlatform.submitScore('flappy-bird', { score }, `flappy:${Date.now()}:${score}`);
}

// ====== 主循环 ======
function gameLoop(timestamp) {
  // 帧率归一化计算
  if (!lastTimestamp) lastTimestamp = timestamp;
  const rawDelta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  _dt = Math.min(rawDelta, 50) / PHYSICS_DT; // 最大 50ms 防止切标签后跳帧

  if (state === STATE.COUNTDOWN) {
    frame += _dt;
    if (frame >= 210) {
      state = STATE.PLAYING;
      frame = 0;
    }
  } else if (state === STATE.PLAYING) {
    update();
    frame += _dt;
  } else if (state === STATE.START) {
    frame += _dt;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (state) {
    case STATE.START:
      renderStartScreen();
      break;
    case STATE.COUNTDOWN:
      renderCountdown();
      break;
    case STATE.PLAYING:
      drawBackground();
      updateClouds();
      drawClouds();
      coins.forEach(drawCoin);
      powerups.forEach(drawPowerup);
      drawBird(birdX, birdY, birdSpeed);
      pipes.forEach(drawPipe);
      updateGround();
      drawGround();
      drawScore();
      break;
    case STATE.PAUSED:
      drawBackground();
      drawClouds();
      coins.forEach(drawCoin);
      powerups.forEach(drawPowerup);
      drawBird(birdX, birdY, birdSpeed);
      pipes.forEach(drawPipe);
      drawGround();
      drawScore();
      renderPausedOverlay();
      break;
    case STATE.GAME_OVER:
      drawBackground();
      drawClouds();
      coins.forEach(drawCoin);
      powerups.forEach(drawPowerup);
      drawBird(birdX, birdY, birdSpeed);
      pipes.forEach(drawPipe);
      drawGround();
      drawScore();
      renderGameOverOverlay();
      break;
  }

  requestAnimationFrame(gameLoop);
}

// ====== 输入处理 ======
function handleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

  switch (state) {
    case STATE.START:
      startPlaying();
      break;
    case STATE.PLAYING:
      if (birdY > 0 && birdY < canvas.height - groundHeight) {
        birdSpeed = lift;
      }
      break;
    case STATE.GAME_OVER:
      const btn = window._restartBtn;
      if (btn && clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h) {
        goToStart();
      }
      break;
  }
}

function handleKeydown(e) {
  const isSpace = e.code === 'Space';
  const isPause = e.code === 'KeyP' || e.code === 'Escape';

  if (!isSpace && !isPause) return;
  e.preventDefault();

  if (isSpace) {
    switch (state) {
      case STATE.START:
        startPlaying();
        break;
      case STATE.PLAYING:
        if (birdY > 0 && birdY < canvas.height - groundHeight) {
          birdSpeed = lift;
        }
        break;
      case STATE.GAME_OVER:
        goToStart();
        break;
    }
  }

  if (isPause) {
    if (state === STATE.PLAYING) {
      state = STATE.PAUSED;
    } else if (state === STATE.PAUSED) {
      state = STATE.PLAYING;
    }
  }
}

canvas.addEventListener('click', handleClick);
document.addEventListener('keydown', handleKeydown);

requestAnimationFrame(gameLoop);
