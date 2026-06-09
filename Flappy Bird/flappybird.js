const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let canvasScale = 1;
let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;

// ====== 鐢诲竷灏哄 ======
function resizeCanvas() {
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  canvasScale = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(viewWidth * canvasScale);
  canvas.height = Math.floor(viewHeight * canvasScale);
  canvas.style.width = viewWidth + 'px';
  canvas.style.height = viewHeight + 'px';
  ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ====== 閰嶇疆 ======
const birdSize = 30;
const gravity = 0.4;
const lift = -9;
const pipeWidth = 80;
const pipeGap = 245;
const pipeSpeed = 2.5;
const maxDifficultyLevel = 6;
const groundHeight = 50;
const coinRadius = 20;
const powerupSize = 56;
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
const PIXEL_FONT = '"Courier New", monospace';

// 甯х巼褰掍竴鍖栵紙鍙傝€冪綉绔欏仛娉曪級
const PHYSICS_DT = 1000 / 60; // 16.67ms锛屽熀鍑?60fps
let lastTimestamp = 0;
let _dt = 1; // 褰撳墠甯х殑鏃堕棿缂╂斁鍥犲瓙

// ====== UI 缂╂斁 ======
function uiScale() {
  return Math.min(viewWidth, viewHeight) / 700;
}

// ====== 娓告垙鐘舵€?======
const STATE = { ANNOUNCEMENT: 'ANNOUNCEMENT', START: 'START', COUNTDOWN: 'COUNTDOWN', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER' };
let state = STATE.ANNOUNCEMENT;

// ====== 娓告垙鍙橀噺 ======
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
  [POWERUPS.SHIELD]: [],
  [POWERUPS.DASH]: [],
  [POWERUPS.SHRINK]: []
};
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let leaderboardSubmitted = false;
let groundOffset = 0;
let clouds = [];

function syncChromeButtons() {
  const homeButton = document.getElementById('homeButton');
  if (!homeButton) return;
  homeButton.style.display = [STATE.COUNTDOWN, STATE.PLAYING, STATE.PAUSED].includes(state) ? 'none' : '';
}

function resetGameState() {
  birdX = Math.floor(viewWidth / 4);
  birdY = viewHeight / 2;
  birdSpeed = 0;
  pipes = [];
  pipeSpawnTimer = 0;
  frame = 0;
  score = 0;
  coins = [];
  coinCount = 0;
  powerups = [];
  activePowerups = {
    [POWERUPS.SHIELD]: [],
    [POWERUPS.DASH]: [],
    [POWERUPS.SHRINK]: []
  };
  leaderboardSubmitted = false;
  groundOffset = 0;
  clouds = [];
  for (let i = 0; i < 3; i++) {
    clouds.push({
      x: Math.random() * viewWidth,
      y: 30 + Math.random() * (viewHeight * 0.15),
      size: 25 + Math.random() * 20
    });
  }
}

resetGameState();

// ====== 涓婚 ======
function getTheme() {
  return document.documentElement.dataset.theme || 'light';
}

function isDark() {
  return getTheme() === 'dark';
}

function pixelRect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function pixelBox(x, y, width, height, fill, border = '#1B1B2F', borderSize = 4) {
  pixelRect(x, y, width, height, border);
  pixelRect(x + borderSize, y + borderSize, width - borderSize * 2, height - borderSize * 2, fill);
}

function pixelText(text, x, y, size, color, align = 'center') {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.font = `bold ${Math.round(size)}px ${PIXEL_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (size >= 18) {
    ctx.fillStyle = '#1B1B2F';
    ctx.fillText(text, Math.round(x + 2), Math.round(y + 2));
  }
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}

// ====== 鑳屾櫙 ======
function drawBackground() {
  pixelRect(0, 0, viewWidth, viewHeight - groundHeight, isDark() ? '#171738' : '#79D7F5');
  pixelRect(0, Math.round(viewHeight * 0.18), viewWidth, Math.round(18 * uiScale()), isDark() ? '#202052' : '#A7ECFF');
  pixelRect(0, Math.round(viewHeight * 0.34), viewWidth, Math.round(12 * uiScale()), isDark() ? '#24245C' : '#BDF3FF');

  const mountainY = viewHeight - groundHeight - 56;
  for (let x = -20; x < viewWidth; x += 96) {
    pixelRect(x + 16, mountainY + 28, 64, 28, isDark() ? '#263057' : '#91BFD7');
    pixelRect(x + 32, mountainY + 14, 32, 14, isDark() ? '#303968' : '#B9DCEB');
  }
}

function drawClouds() {
  const cloudColor = isDark() ? 'rgba(255,255,255,0.12)' : '#F7FCFF';
  const shadeColor = isDark() ? 'rgba(255,255,255,0.07)' : '#DDF6FF';
  clouds.forEach(cloud => {
    const unit = Math.max(8, Math.round(cloud.size / 2));
    pixelRect(cloud.x, cloud.y, unit * 4, unit, shadeColor);
    pixelRect(cloud.x + unit, cloud.y - unit, unit * 3, unit, cloudColor);
    pixelRect(cloud.x + unit * 2, cloud.y - unit * 2, unit * 2, unit, cloudColor);
    pixelRect(cloud.x + unit * 4, cloud.y, unit * 2, unit, cloudColor);
  });
}

function updateClouds() {
  clouds.forEach(cloud => {
    cloud.x -= 0.5 * _dt;
    if (cloud.x + cloud.size * 2 < 0) {
      cloud.x = viewWidth + cloud.size;
      cloud.y = 30 + Math.random() * (viewHeight * 0.15);
    }
  });
}

function drawGround() {
  const groundY = viewHeight - groundHeight;
  pixelRect(0, groundY, viewWidth, groundHeight, isDark() ? '#25442E' : '#68B344');
  pixelRect(0, groundY, viewWidth, 8, isDark() ? '#3C8A45' : '#A2E85D');
  pixelRect(0, groundY + 28, viewWidth, groundHeight - 28, isDark() ? '#5E3E24' : '#986337');

  for (let x = -groundOffset; x < viewWidth; x += 24) {
    pixelRect(x, groundY + 8, 12, 12, isDark() ? '#316B37' : '#7DCE4F');
    pixelRect(x + 12, groundY + 20, 12, 8, isDark() ? '#6A4529' : '#B8783C');
  }
}

function updateGround() {
  groundOffset = (groundOffset + currentPipeSpeed() * _dt) % 20;
}

// ====== 楦?======
function drawBird(x, y, speed) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const shieldLayers = activePowerups[POWERUPS.SHIELD].length;
  const dashLayers = activePowerups[POWERUPS.DASH].length;
  const shrinkLayers = activePowerups[POWERUPS.SHRINK].length;
  const shrinkScale = Math.max(0.18, Math.pow(0.68, shrinkLayers));
  ctx.translate(x + birdSize / 2, y + birdSize / 2);
  ctx.rotate(Math.min(Math.max(speed * 0.1, -0.5), 1));
  ctx.scale(shrinkScale, shrinkScale);

  if (shieldLayers > 0) {
    ctx.strokeStyle = '#7EE7FF';
    ctx.lineWidth = 3;
    for (let layer = 0; layer < Math.min(shieldLayers, 4); layer++) {
      const size = birdSize * (1.55 + layer * 0.22);
      ctx.strokeRect(Math.round(-size / 2), Math.round(-size / 2), Math.round(size), Math.round(size));
    }
  }

  if (dashLayers > 0) {
    for (let layer = 0; layer < Math.min(dashLayers, 5); layer++) {
      pixelRect(-birdSize * (1.6 + layer * 0.35), -6, birdSize * 0.7, 12, '#FF7043');
      pixelRect(-birdSize * (2 + layer * 0.35), -3, birdSize * 0.4, 6, '#FFD166');
    }
  }

  const px = 4;
  pixelRect(-16, -12, 28, 24, '#6B3E1F');
  pixelRect(-12, -16, 24, 8, '#FFE16A');
  pixelRect(-16, -8, 32, 20, '#FFD23F');
  pixelRect(-8, 8, 20, 8, '#EFA92A');
  pixelRect(6, -8, 12, 12, '#FFFFFF');
  pixelRect(10, -4, 4, 4, '#151515');
  pixelRect(16, 0, 12, 8, '#FF7A2F');
  pixelRect(20, 4, 8, 4, '#D94F1C');
  pixelRect(-24, 0, 12, 12, '#F4B32F');
  pixelRect(-20, 4, 8, 8, '#D68A1E');
  pixelRect(-12, 12, px * 2, px, '#6B3E1F');

  ctx.restore();
}

// ====== 绠￠亾 ======
function drawCoin(coin) {
  ctx.save();
  ctx.translate(coin.x, coin.y);
  pixelRect(-14, -18, 28, 36, '#8A4D0F');
  pixelRect(-18, -14, 36, 28, '#8A4D0F');
  pixelRect(-10, -14, 20, 28, '#FFD23F');
  pixelRect(-14, -10, 28, 20, '#FFD23F');
  pixelRect(-6, -10, 12, 20, '#FFF176');
  pixelText('$', 0, 1, 19, '#FFF8B0');
  ctx.restore();
}

function drawPowerup(powerup) {
  const half = powerupSize / 2;
  ctx.save();
  ctx.translate(powerup.x, powerup.y);
  pixelBox(-half, -half, powerupSize, powerupSize, POWERUP_COLORS[powerup.type], '#1B1B2F', 5);
  pixelRect(-half + 8, -half + 8, powerupSize - 16, 8, 'rgba(255,255,255,0.28)');
  pixelText(POWERUP_LABELS[powerup.type], 0, 2, 28, '#FFFFFF');
  ctx.restore();
}

function spawnCollectiblesForPipe(pipe) {
  const gapTop = pipe.height;
  const gap = pipe.gap || pipeGap;
  const gapBottom = pipe.height + gap;
  const centerY = gapTop + gap / 2;
  const wave = Math.random() > 0.5 ? 1 : -1;

  coins.push({
    x: pipe.x + pipeWidth + 95,
    y: Math.max(gapTop + coinRadius + 8, Math.min(gapBottom - coinRadius - 8, centerY + wave * 42)),
    r: coinRadius
  });

  if (Math.random() < 0.45) {
    powerups.push({
      x: pipe.x + pipeWidth + 170,
      y: Math.max(gapTop + halfPowerupSize(), Math.min(gapBottom - halfPowerupSize(), centerY - wave * 38)),
      type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
    });
  }
}

function halfPowerupSize() {
  return powerupSize / 2 + 8;
}

function getBirdRadius() {
  const baseRadius = birdSize / 2 * 0.8;
  return baseRadius * Math.max(0.18, Math.pow(0.65, activePowerups[POWERUPS.SHRINK].length));
}

function collectByDistance(item, radius) {
  const birdCenterX = birdX + birdSize / 2;
  const birdCenterY = birdY + birdSize / 2;
  return Math.hypot(birdCenterX - item.x, birdCenterY - item.y) <= getBirdRadius() + radius;
}

function activatePowerup(type) {
  if (type === POWERUPS.SHIELD) {
    if (activePowerups[type].length >= 3) return;
    activePowerups[type].push(600);
  } else if (type === POWERUPS.DASH) {
    activePowerups[type].push(300);
  } else if (type === POWERUPS.SHRINK) {
    activePowerups[type].push(480);
  }
}

function updatePowerupTimers() {
  Object.keys(activePowerups).forEach(type => {
    if (type === POWERUPS.SHIELD) return;
    activePowerups[type] = activePowerups[type]
      .map(remaining => remaining - _dt)
      .filter(remaining => remaining > 0);
  });
}

function updateCollectibles() {
  coins.forEach(coin => {
    coin.x -= currentPipeSpeed() * _dt;
    if (!coin.collected && collectByDistance(coin, coin.r)) {
      coin.collected = true;
      coinCount++;
      score++;
    }
  });
  coins = coins.filter(coin => !coin.collected && coin.x + coin.r > 0);

  powerups.forEach(powerup => {
    powerup.x -= currentPipeSpeed() * _dt;
    if (!powerup.collected && collectByDistance(powerup, powerupSize * 0.55)) {
      powerup.collected = true;
      activatePowerup(powerup.type);
    }
  });
  powerups = powerups.filter(powerup => !powerup.collected && powerup.x + powerupSize > 0);
}

function absorbPipeHit(pipe) {
  if (activePowerups[POWERUPS.DASH].length > 0) {
    pipe.destroyed = true;
    score += 2;
    coinCount += 1;
    birdSpeed = Math.min(birdSpeed, -2);
    return true;
  }

  if (activePowerups[POWERUPS.SHIELD].length > 0) {
    activePowerups[POWERUPS.SHIELD].shift();
    pipe.destroyed = true;
    birdSpeed = lift * 0.45;
    return true;
  }

  return false;
}

function drawPipe(pipe) {
  const gap = pipe.gap || pipeGap;
  const pipeFill = isDark() ? '#3FB85A' : '#53D85D';
  const pipeShade = isDark() ? '#24783F' : '#2FA344';
  const pipeHighlight = isDark() ? '#75E088' : '#B7F56D';

  function drawPipeBody(x, y, width, height, capAtBottom) {
    pixelBox(x, y, width, height, pipeFill, '#173B25', 5);
    pixelRect(x + 8, y + 5, 10, Math.max(0, height - 10), pipeHighlight);
    pixelRect(x + width - 18, y + 5, 10, Math.max(0, height - 10), pipeShade);
    const capY = capAtBottom ? y + height - 22 : y;
    pixelBox(x - 6, capY, width + 12, 22, pipeFill, '#173B25', 5);
    for (let brickY = y + 12; brickY < y + height - 16; brickY += 28) {
      pixelRect(x + 8, brickY, width - 16, 3, 'rgba(23,59,37,0.35)');
    }
  }

  drawPipeBody(pipe.x, 0, pipeWidth, pipe.height, true);
  drawPipeBody(pipe.x, pipe.height + gap, pipeWidth, viewHeight - pipe.height - gap - groundHeight, false);
}

function difficultyLevel() {
  return Math.min(maxDifficultyLevel, Math.floor(score / 8));
}

function currentPipeSpeed() {
  return pipeSpeed + difficultyLevel() * 0.12;
}

function currentPipeGap() {
  return Math.max(210, pipeGap - difficultyLevel() * 5);
}

function currentPipeSpawnInterval() {
  return Math.max(104, 120 - difficultyLevel() * 2);
}

function updatePipes() {
  // 绠￠亾鐢熸垚璁℃椂鍣紙_dt 褰掍竴鍖栧埌 60fps锛?20 = 2 绉掞級
  pipeSpawnTimer += _dt;
  const spawnInterval = currentPipeSpawnInterval();
  if (frame > 0 && pipeSpawnTimer >= spawnInterval) {
    pipeSpawnTimer -= spawnInterval;
    const gap = currentPipeGap();
    const maxPipe = viewHeight - gap - groundHeight - 100;
    const height = Math.random() * Math.max(maxPipe, 1) + 50;
    const pipe = { x: viewWidth, height, gap };
    pipes.push(pipe);
    spawnCollectiblesForPipe(pipe);
  }

  pipes.forEach(pipe => {
    pipe.x -= currentPipeSpeed() * _dt;
    if (pipe.x + pipeWidth < birdX && !pipe.passed) {
      pipe.passed = true;
      score++;
    }
  });

  pipes = pipes.filter(pipe => !pipe.destroyed && pipe.x + pipeWidth > 0);
}

function checkCollision() {
  if (birdY < 0 || birdY + birdSize > viewHeight - groundHeight) return true;

  const birdCenterX = birdX + birdSize / 2;
  const birdCenterY = birdY + birdSize / 2;
  const birdRadius = getBirdRadius();

  for (const pipe of pipes) {
    const gap = pipe.gap || pipeGap;
    if (birdCenterX + birdRadius < pipe.x || birdCenterX - birdRadius > pipe.x + pipeWidth) continue;
    if (birdCenterY - birdRadius < pipe.height || birdCenterY + birdRadius > pipe.height + gap) {
      return !absorbPipeHit(pipe);
    }
  }

  return false;
}

// ====== 鍒嗘暟 ======
function drawScore() {
  ctx.save();
  const s = uiScale();
  pixelBox(viewWidth / 2 - Math.round(58 * s), Math.round(14 * s), Math.round(116 * s), Math.round(58 * s), '#FFE16A', '#1B1B2F', Math.max(3, Math.round(4 * s)));
  pixelText(String(score), viewWidth / 2, Math.round(43 * s), Math.round(34 * s), '#FFFFFF');

  pixelBox(Math.round(18 * s), Math.round(18 * s), Math.round(128 * s), Math.round(40 * s), '#5C3B22', '#1B1B2F', Math.max(3, Math.round(4 * s)));
  pixelText('金币 ' + coinCount, Math.round(30 * s), Math.round(38 * s), Math.round(17 * s), '#FFD23F', 'left');

  let badgeX = Math.round(24 * s);
  const badgeY = Math.round(72 * s);
  Object.keys(activePowerups).forEach(type => {
    if (activePowerups[type].length <= 0) return;
    const layers = activePowerups[type].length;
    const badgeW = Math.round(108 * s);
    const badgeH = Math.round(30 * s);
    pixelBox(badgeX, badgeY, badgeW, badgeH, POWERUP_COLORS[type], '#1B1B2F', Math.max(2, Math.round(3 * s)));
    const badgeText = type === POWERUPS.SHIELD
      ? POWERUP_LABELS[type] + ' x' + layers
      : POWERUP_LABELS[type] + ' x' + layers + ' ' + Math.ceil(Math.max(...activePowerups[type]) / 60) + 's';
    pixelText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2, Math.round(13 * s), '#FFFFFF');
    badgeX += badgeW + Math.round(8 * s);
  });
  ctx.restore();
}
// ====== 鐘舵€佸垏鎹?======
function startPlaying() {
  state = STATE.COUNTDOWN;
  frame = 0;
  pipeSpawnTimer = 0;
  birdY = viewHeight / 2;
  birdSpeed = 0;
  pipes = [];
  score = 0;
  coins = [];
  coinCount = 0;
  powerups = [];
  activePowerups = {
    [POWERUPS.SHIELD]: [],
    [POWERUPS.DASH]: [],
    [POWERUPS.SHRINK]: []
  };
  leaderboardSubmitted = false;
}

function goToStart() {
  state = STATE.START;
  resetGameState();
}

// ====== 鍊掕鏃?======
function drawStartPowerupLegend(centerX, y, s) {
  const items = [
    { color: '#FFD54F', label: '$ 金币加分' },
    { color: POWERUP_COLORS[POWERUPS.SHIELD], label: '盾 最多三层' },
    { color: POWERUP_COLORS[POWERUPS.DASH], label: '冲 撞碎管道' },
    { color: POWERUP_COLORS[POWERUPS.SHRINK], label: '小 缩小身体' }
  ];
  const textSize = Math.max(12, Math.round(15 * s));
  const gap = Math.round(10 * s);
  const chipH = Math.round(28 * s);

  ctx.save();
  ctx.font = `bold ${textSize}px ${PIXEL_FONT}`;
  const chipWidths = items.map(item => Math.round(ctx.measureText(item.label).width + 28 * s));
  const maxRowW = viewWidth - Math.round(32 * s);
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
      pixelBox(x, rowY, width, chipH, item.color, '#1B1B2F', Math.max(2, Math.round(3 * s)));
      pixelText(item.label, x + width / 2, rowY + chipH / 2, textSize, '#FFF');
      x += width + gap;
    });
  });
  ctx.restore();
}

function drawAnnouncementBoard(centerX, y, s) {
  const lines = [
    '金币和技能调整为像素风中等尺寸',
    '技能可无上限叠加',
    '护盾无时间限制，最多叠加三层',
    '分数越高，管道会逐步变快变窄',
    '金币排行榜改为累计金币',
    '商店系统即将上线'
  ];
  const boardW = Math.min(viewWidth - Math.round(32 * s), Math.round(540 * s));
  const boardH = Math.round(266 * s);
  const boardX = centerX - boardW / 2;
  const boardY = y - boardH / 2;
  const btnW = Math.round(126 * s);
  const btnH = Math.round(38 * s);
  const btnX = centerX - btnW / 2;
  const btnY = boardY + boardH - Math.round(52 * s);

  ctx.save();
  pixelRect(0, 0, viewWidth, viewHeight, 'rgba(0, 0, 0, 0.55)');
  pixelBox(boardX, boardY, boardW, boardH, isDark() ? '#202052' : '#FFF3C4', '#1B1B2F', Math.max(5, Math.round(6 * s)));
  pixelRect(boardX + Math.round(12 * s), boardY + Math.round(12 * s), boardW - Math.round(24 * s), Math.round(8 * s), isDark() ? '#363681' : '#FFD23F');
  pixelText('更新公告', centerX, boardY + Math.round(38 * s), Math.round(24 * s), isDark() ? '#FFD23F' : '#E65100');

  lines.forEach((line, index) => {
    pixelText('▸ ' + line, boardX + Math.round(44 * s), boardY + Math.round((78 + index * 22) * s), Math.round(14 * s), isDark() ? '#F7FCFF' : '#2C2C38', 'left');
  });

  pixelBox(btnX, btnY, btnW, btnH, '#4CAF50', '#1B1B2F', Math.max(3, Math.round(4 * s)));
  pixelText('已阅读', centerX, btnY + btnH / 2, Math.round(15 * s), '#FFFFFF');
  ctx.restore();

  window._announcementBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
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
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  const s = uiScale();
  const remaining = 210 - frame;
  ctx.textAlign = 'center';

  if (remaining > 150) {
    pixelText('3', viewWidth / 2, viewHeight / 2 + 10, Math.round(112 * s), '#FFFFFF');
  } else if (remaining > 90) {
    pixelText('2', viewWidth / 2, viewHeight / 2 + 10, Math.round(112 * s), '#FFFFFF');
  } else if (remaining > 30) {
    pixelText('1', viewWidth / 2, viewHeight / 2 + 10, Math.round(112 * s), '#FFFFFF');
  } else {
    pixelText('GO!', viewWidth / 2, viewHeight / 2 + 10, Math.round(82 * s), '#53D85D');
  }
}

// ====== 鐣岄潰娓叉煋 ======
function renderStartScreen() {
  drawBackground();
  updateClouds();
  drawClouds();
  updateGround();
  drawGround();

  const bobY = birdY + Math.sin(frame * 0.05) * 8;
  drawBird(birdX, bobY, 0);

  const s = uiScale();
  pixelText('FLAPPY BIRD', viewWidth / 2, Math.round(viewHeight * 0.2), Math.round(46 * s), '#FFD23F');

  const boxY = viewHeight / 2;
  const boxW = Math.round(330 * s);
  const boxH = Math.round(132 * s);
  const boxX = (viewWidth - boxW) / 2;
  pixelBox(boxX, boxY, boxW, boxH, isDark() ? '#202052' : '#FFF3C4', '#1B1B2F', Math.max(5, Math.round(6 * s)));
  pixelText('点击或按空格键', viewWidth / 2, boxY + Math.round(46 * s), Math.round(20 * s), isDark() ? '#FFFFFF' : '#2C2C38');
  pixelText('开始游戏', viewWidth / 2, boxY + Math.round(82 * s), Math.round(24 * s), '#53D85D');

  if (highScore > 0) {
    pixelText('最高分 ' + highScore, viewWidth / 2, boxY + Math.round(118 * s), Math.round(15 * s), '#FFD23F');
  }
  drawStartPowerupLegend(viewWidth / 2, boxY + Math.round(154 * s), s);
}
function renderAnnouncementScreen() {
  drawBackground();
  updateClouds();
  drawClouds();
  updateGround();
  drawGround();

  const bobY = birdY + Math.sin(frame * 0.05) * 8;
  drawBird(birdX, bobY, 0);
  drawAnnouncementBoard(viewWidth / 2, viewHeight / 2, uiScale());
}

function renderGameOverOverlay() {
  pixelRect(0, 0, viewWidth, viewHeight, isDark() ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.5)');

  const s = uiScale();
  const panelW = Math.round(360 * s);
  const panelH = Math.round(260 * s);
  const panelX = viewWidth / 2 - panelW / 2;
  const panelY = viewHeight / 2 - Math.round(150 * s);
  pixelBox(panelX, panelY, panelW, panelH, isDark() ? '#202052' : '#FFF3C4', '#1B1B2F', Math.max(5, Math.round(6 * s)));

  pixelText('GAME OVER', viewWidth / 2, panelY + Math.round(44 * s), Math.round(32 * s), '#FF5252');
  pixelText('得分 ' + score, viewWidth / 2, panelY + Math.round(92 * s), Math.round(22 * s), '#FFFFFF');
  pixelText('金币 ' + coinCount, viewWidth / 2, panelY + Math.round(126 * s), Math.round(18 * s), '#FFD23F');
  pixelText('最高分 ' + highScore, viewWidth / 2, panelY + Math.round(156 * s), Math.round(18 * s), '#FFD23F');

  const btnX = viewWidth / 2 - Math.round(112 * s);
  const btnY = panelY + Math.round(188 * s);
  const btnW = Math.round(224 * s);
  const btnH = Math.round(50 * s);
  pixelBox(btnX, btnY, btnW, btnH, '#4CAF50', '#1B1B2F', Math.max(4, Math.round(5 * s)));
  pixelText('重新开始', viewWidth / 2, btnY + btnH / 2, Math.round(21 * s), '#FFFFFF');

  window._restartBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
}
function renderPausedOverlay() {
  pixelRect(0, 0, viewWidth, viewHeight, isDark() ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.42)');
  const s = uiScale();
  const boxW = Math.round(300 * s);
  const boxH = Math.round(112 * s);
  const boxX = viewWidth / 2 - boxW / 2;
  const boxY = viewHeight / 2 - boxH / 2;
  pixelBox(boxX, boxY, boxW, boxH, isDark() ? '#202052' : '#FFF3C4', '#1B1B2F', Math.max(5, Math.round(6 * s)));
  pixelText('暂停中', viewWidth / 2, boxY + Math.round(42 * s), Math.round(28 * s), '#FFFFFF');
  pixelText('按 P 或 Esc 继续', viewWidth / 2, boxY + Math.round(78 * s), Math.round(15 * s), '#FFD23F');
}
// ====== 娓告垙鏇存柊锛堟墍鏈夌墿鐞嗕箻浠?_dt 閫傞厤甯х巼锛?======
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
  window.GagagaPlatform.submitScore('flappy-bird', { score, coins: coinCount }, `flappy:${Date.now()}:${score}:${coinCount}`);
}

// ====== 涓诲惊鐜?======
function gameLoop(timestamp) {
  // 甯х巼褰掍竴鍖栬绠?
  if (!lastTimestamp) lastTimestamp = timestamp;
  const rawDelta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  _dt = Math.min(rawDelta, 50) / PHYSICS_DT; // 鏈€澶?50ms 闃叉鍒囨爣绛惧悗璺冲抚

  if (state === STATE.COUNTDOWN) {
    frame += _dt;
    if (frame >= 210) {
      state = STATE.PLAYING;
      frame = 0;
    }
  } else if (state === STATE.PLAYING) {
    update();
    frame += _dt;
  } else if (state === STATE.START || state === STATE.ANNOUNCEMENT) {
    frame += _dt;
  }
  syncChromeButtons();

  ctx.clearRect(0, 0, viewWidth, viewHeight);

  switch (state) {
    case STATE.ANNOUNCEMENT:
      renderAnnouncementScreen();
      break;
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

// ====== 杈撳叆澶勭悊 ======
function handleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (viewWidth / rect.width);
  const clickY = (e.clientY - rect.top) * (viewHeight / rect.height);

  switch (state) {
    case STATE.ANNOUNCEMENT:
      const announcementBtn = window._announcementBtn;
      if (announcementBtn && clickX >= announcementBtn.x && clickX <= announcementBtn.x + announcementBtn.w && clickY >= announcementBtn.y && clickY <= announcementBtn.y + announcementBtn.h) {
        state = STATE.START;
      }
      break;
    case STATE.START:
      startPlaying();
      break;
    case STATE.PLAYING:
      if (birdY > 0 && birdY < viewHeight - groundHeight) {
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
      case STATE.ANNOUNCEMENT:
        state = STATE.START;
        break;
      case STATE.START:
        startPlaying();
        break;
      case STATE.PLAYING:
        if (birdY > 0 && birdY < viewHeight - groundHeight) {
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
