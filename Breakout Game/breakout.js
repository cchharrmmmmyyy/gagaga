/**
 * Breakout Adventure Pixel
 * Original 8/16-bit platform inspired Breakout. No third-party game assets.
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

const STATE = {
  LOADING: 'LOADING',
  MENU: 'MENU',
  LEVEL_INTRO: 'LEVEL_INTRO',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER',
  WIN: 'WIN'
};

const PAL = {
  ink: '#101018',
  black: '#05070d',
  white: '#fff6ce',
  sky: '#5cc8ff',
  sky2: '#8fe8ff',
  grass: '#39b54a',
  grassDark: '#188a3a',
  dirt: '#b86b32',
  dirtDark: '#74421f',
  brick: '#c84a2f',
  brickLight: '#f08342',
  brickDark: '#7b241d',
  coin: '#ffd447',
  coinDark: '#c78300',
  pipe: '#2ab84a',
  pipeDark: '#0d7a30',
  water: '#2aa8e8',
  cave: '#252044',
  cave2: '#4b3d6f',
  castle: '#707680',
  lava: '#ff6a21',
  panel: '#17213d',
  red: '#e23b2f',
  blue: '#2775d1',
  purple: '#7a4bd6'
};

const BRICK = {
  '1': { id: 'normal', hp: 1, score: 20, fill: PAL.brick, top: PAL.brickLight, label: '' },
  '2': { id: 'hard', hp: 2, score: 35, fill: PAL.castle, top: '#c7ced8', label: '' },
  '?': { id: 'question', hp: 1, score: 25, fill: PAL.coin, top: '#fff08a', label: '?' },
  'C': { id: 'coin', hp: 1, score: 40, fill: '#f2a91f', top: PAL.coin, label: 'C' },
  'M': { id: 'moving', hp: 1, score: 35, fill: PAL.blue, top: '#7fc9ff', label: '' },
  'B': { id: 'bomb', hp: 1, score: 45, fill: '#343044', top: '#77708d', label: '!' },
  'X': { id: 'boss', hp: 6, score: 180, fill: PAL.purple, top: '#c5a6ff', label: 'X', boss: true }
};

const LEVELS = [
  {
    id: 'grassland', name: 'WORLD 1-1', title: 'SUNNY FIELD', theme: 'grass',
    ballSpeed: 360, paddleSpeed: 560,
    dropRates: { normal: 0.12, question: 1, coin: 0.35 },
    specialRules: { wind: 0 },
    layout: ['000??000', '01111110', '01C11C10', '01111110', '00011000']
  },
  {
    id: 'cavern', name: 'WORLD 1-2', title: 'DEEP CAVERN', theme: 'cave',
    ballSpeed: 382, paddleSpeed: 545,
    dropRates: { normal: 0.13, question: 1, coin: 0.3 },
    specialRules: { wind: 0 },
    layout: ['022??220', '02111120', '02B00B20', '01122110', '00111100']
  },
  {
    id: 'lagoon', name: 'WORLD 1-3', title: 'SHELL LAGOON', theme: 'water',
    ballSpeed: 392, paddleSpeed: 535,
    dropRates: { normal: 0.16, question: 1, coin: 0.38 },
    specialRules: { wind: 0.00003 },
    layout: ['0M1111M0', '01?CC?10', '01122110', '0B1001B0', '00111100']
  },
  {
    id: 'skyway', name: 'WORLD 1-4', title: 'CLOUD RUN', theme: 'sky',
    ballSpeed: 410, paddleSpeed: 525,
    dropRates: { normal: 0.18, question: 1, coin: 0.34 },
    specialRules: { wind: 0.00008 },
    layout: ['M1M??M1M', '01111110', '00C22C00', '011BB110', '0M1111M0']
  },
  {
    id: 'castle', name: 'WORLD 1-5', title: 'EMBER FORT', theme: 'castle',
    ballSpeed: 425, paddleSpeed: 515,
    dropRates: { normal: 0.2, question: 1, coin: 0.28 },
    specialRules: { wind: 0 },
    layout: ['222XX222', '2B1??1B2', '01M11M10', '011CC110', '00211200']
  }
];

const CONFIG = {
  paddle: { baseW: 116, wideW: 178, h: 18, y: H - 48 },
  ball: { r: 8 },
  brick: { w: 78, h: 28, gap: 8, top: 94 },
  power: { size: 28, fall: 150 },
  launchAngle: -Math.PI / 2
};

const input = {
  left: false,
  right: false,
  pointerActive: false,
  pointerX: W / 2,
  launch: false
};

const audio = {
  play() {
    // Placeholder for future original sound effects.
  }
};

const game = {
  state: STATE.MENU,
  levelIndex: 0,
  score: 0,
  lives: 3,
  balls: [],
  bricks: [],
  powerups: [],
  particles: [],
  effects: {},
  paddle: { x: W / 2 - CONFIG.paddle.baseW / 2, w: CONFIG.paddle.baseW },
  time: 0,
  stateTime: 0,
  lastTime: 0,
  combo: 0,
  message: '',
  readyPulse: 0
};

const POWERUPS = [
  {
    id: 'wide', label: 'WIDE', glyph: 'W', color: '#38d66b', duration: 10000, weight: 16,
    apply(g) { g.paddle.w = CONFIG.paddle.wideW; },
    expire(g) { g.paddle.w = CONFIG.paddle.baseW; g.paddle.x = clamp(g.paddle.x, 0, W - g.paddle.w); }
  },
  {
    id: 'multi', label: 'MULTI', glyph: 'M', color: '#38a8ff', duration: 0, weight: 13,
    apply(g) {
      const source = g.balls[0] || createBall(W / 2, CONFIG.paddle.y - 16, 0, -currentLevel().ballSpeed);
      const speed = ballSpeed(source);
      [-0.45, 0.45].forEach(offset => {
        const angle = Math.atan2(source.vy, source.vx) + offset;
        g.balls.push(createBall(source.x, source.y, Math.cos(angle) * speed, Math.sin(angle) * speed));
      });
    },
    expire() {}
  },
  {
    id: 'slow', label: 'SLOW', glyph: 'S', color: '#6ee75d', duration: 8500, weight: 14,
    apply(g) { g.balls.forEach(b => normalizeBall(b, currentLevel().ballSpeed * 0.72)); },
    expire(g) { g.balls.forEach(b => normalizeBall(b, currentLevel().ballSpeed)); }
  },
  {
    id: 'fire', label: 'FIRE', glyph: 'F', color: '#ff6a21', duration: 7000, weight: 10,
    apply() {},
    expire() {}
  },
  {
    id: 'magnet', label: 'MAG', glyph: 'G', color: '#b76bff', duration: 9000, weight: 10,
    apply() {},
    expire() {}
  },
  {
    id: 'shield', label: 'SHLD', glyph: 'D', color: '#31e2e8', duration: 12000, weight: 9,
    apply() {},
    expire() {}
  },
  {
    id: 'life', label: 'LIFE', glyph: 'L', color: '#ff4f6b', duration: 0, weight: 5,
    apply(g) { g.lives = Math.min(5, g.lives + 1); spawnText(W - 84, 72, '+1 LIFE', '#ff4f6b'); },
    expire() {}
  },
  {
    id: 'coin', label: 'COIN', glyph: 'C', color: PAL.coin, duration: 0, weight: 16,
    apply(g) { g.score += 120; spawnText(W / 2, 78, '+120', PAL.coin); },
    expire() {}
  }
];

function currentLevel() {
  return LEVELS[game.levelIndex] || LEVELS[0];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function iround(v) {
  return Math.round(v);
}

function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(iround(x), iround(y), iround(w), iround(h));
}

function box(x, y, w, h, fill, border = PAL.black, size = 4) {
  px(x, y, w, h, border);
  px(x + size, y + size, w - size * 2, h - size * 2, fill);
}

function lineRect(x, y, w, h, color, size = 4) {
  px(x, y, w, size, color);
  px(x, y + h - size, w, size, color);
  px(x, y, size, h, color);
  px(x + w - size, y, size, h, color);
}

function createBall(x, y, vx, vy) {
  return { x, y, vx, vy, r: CONFIG.ball.r, trail: [], stuck: false };
}

function ballSpeed(ball) {
  return Math.hypot(ball.vx, ball.vy) || currentLevel().ballSpeed;
}

function normalizeBall(ball, speed) {
  const current = ballSpeed(ball);
  ball.vx = (ball.vx / current) * speed;
  ball.vy = (ball.vy / current) * speed;
}

function setState(next, message = '') {
  game.state = next;
  game.stateTime = 0;
  game.message = message;
}

function resetRun() {
  game.levelIndex = 0;
  game.score = 0;
  game.lives = 3;
  game.combo = 0;
  game.effects = {};
  game.powerups = [];
  game.particles = [];
  game.paddle = { x: W / 2 - CONFIG.paddle.baseW / 2, w: CONFIG.paddle.baseW };
  loadLevel(0);
  setState(STATE.LEVEL_INTRO, LEVELS[0].name);
}

function loadLevel(index) {
  const level = LEVELS[index];
  const cols = Math.max(...level.layout.map(row => row.length));
  const totalW = cols * CONFIG.brick.w + (cols - 1) * CONFIG.brick.gap;
  const left = (W - totalW) / 2;
  game.bricks = [];
  game.powerups = [];
  game.balls = [];
  game.combo = 0;
  clearTimedEffects();

  level.layout.forEach((row, r) => {
    [...row].forEach((key, c) => {
      const def = BRICK[key];
      if (!def) return;
      const w = def.boss ? CONFIG.brick.w * 1.55 : CONFIG.brick.w;
      const x = left + c * (CONFIG.brick.w + CONFIG.brick.gap) - (def.boss ? CONFIG.brick.w * 0.275 : 0);
      const y = CONFIG.brick.top + r * (CONFIG.brick.h + CONFIG.brick.gap);
      game.bricks.push({
        key, def, x, y, baseX: x, w, h: CONFIG.brick.h, hp: def.hp, maxHp: def.hp,
        alive: true, wobble: rand(0, Math.PI * 2), moveRange: def.id === 'moving' ? rand(28, 46) : 0
      });
    });
  });
}

function clearTimedEffects() {
  Object.keys(game.effects).forEach(id => {
    const power = POWERUPS.find(p => p.id === id);
    if (power && game.effects[id].duration) power.expire(game);
  });
  game.effects = {};
}

function readyBall() {
  const x = game.paddle.x + game.paddle.w / 2;
  const y = CONFIG.paddle.y - CONFIG.ball.r - 4;
  game.balls = [createBall(x, y, 0, -currentLevel().ballSpeed)];
  game.balls[0].stuck = true;
  setState(STATE.READY, 'READY');
}

function launchBalls() {
  if (game.state !== STATE.READY) return;
  game.balls.forEach(ball => {
    const offset = ((ball.x - (game.paddle.x + game.paddle.w / 2)) / game.paddle.w) * 0.55;
    const angle = CONFIG.launchAngle + offset;
    ball.vx = Math.cos(angle) * currentLevel().ballSpeed;
    ball.vy = Math.sin(angle) * currentLevel().ballSpeed;
    ball.stuck = false;
  });
  setState(STATE.PLAYING);
}

function loseLife() {
  if (hasEffect('shield')) {
    removeEffect('shield');
    spawnText(W / 2, H - 86, 'SHIELD SAVE', '#31e2e8');
    readyBall();
    return;
  }
  game.lives -= 1;
  clearTimedEffects();
  if (game.lives <= 0) {
    setState(STATE.GAME_OVER, 'GAME OVER');
  } else {
    readyBall();
  }
}

function completeLevel() {
  const bonus = game.lives * 75;
  game.score += bonus;
  spawnText(W / 2, 256, `LIFE BONUS +${bonus}`, PAL.coin);
  if (game.levelIndex >= LEVELS.length - 1) setState(STATE.WIN, 'VICTORY');
  else setState(STATE.LEVEL_CLEAR, 'CLEAR');
}

function nextLevel() {
  game.levelIndex += 1;
  loadLevel(game.levelIndex);
  setState(STATE.LEVEL_INTRO, currentLevel().name);
}

function hasEffect(id) {
  return Boolean(game.effects[id]);
}

function addEffect(power) {
  power.apply(game);
  if (!power.duration) return;
  game.effects[power.id] = { duration: power.duration, remaining: power.duration };
}

function removeEffect(id) {
  const active = game.effects[id];
  if (!active) return;
  const power = POWERUPS.find(p => p.id === id);
  if (power) power.expire(game);
  delete game.effects[id];
}

function pickPowerup(brick) {
  const rates = currentLevel().dropRates;
  const chance = rates[brick.def.id] ?? rates.normal ?? 0;
  if (Math.random() > chance) return null;
  const pool = POWERUPS.flatMap(power => Array(power.weight).fill(power));
  return pool[Math.floor(Math.random() * pool.length)];
}

function spawnPowerup(x, y, forced = null) {
  const power = forced || POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  game.powerups.push({ x: x - CONFIG.power.size / 2, y, vy: CONFIG.power.fall, power, spin: rand(0, Math.PI * 2) });
}

function spawnParticles(x, y, color, count = 12, speed = 150) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * rand(30, speed),
      vy: Math.sin(angle) * rand(30, speed) - 30,
      life: rand(0.35, 0.8),
      maxLife: 0.8,
      size: rand(3, 7),
      color
    });
  }
}

function spawnText(x, y, text, color = PAL.white) {
  game.particles.push({ x, y, vx: 0, vy: -46, life: 0.85, maxLife: 0.85, size: 0, color, text });
}

function hitBrick(brick, ball) {
  if (hasEffect('fire') && !brick.def.boss) brick.hp = 0;
  else brick.hp -= 1;

  spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.def.fill, 9, 130);

  if (brick.hp > 0) return;
  brick.alive = false;
  game.combo += 1;
  const comboBonus = Math.max(0, game.combo - 1) * 5;
  game.score += brick.def.score + comboBonus;
  if (comboBonus) spawnText(brick.x + brick.w / 2, brick.y, `+${comboBonus}`, PAL.coin);

  if (brick.def.id === 'coin') {
    game.score += 80;
    spawnText(brick.x + brick.w / 2, brick.y, '+80', PAL.coin);
  }

  if (brick.def.id === 'bomb') {
    explodeBrick(brick, ball);
  } else {
    const power = pickPowerup(brick);
    if (power) spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2, power);
  }
}

function explodeBrick(center, ball) {
  spawnParticles(center.x + center.w / 2, center.y + center.h / 2, PAL.lava, 28, 270);
  game.bricks.forEach(brick => {
    if (!brick.alive || brick === center) return;
    const dx = brick.x + brick.w / 2 - (center.x + center.w / 2);
    const dy = brick.y + brick.h / 2 - (center.y + center.h / 2);
    if (Math.hypot(dx, dy) < 118) hitBrick(brick, ball);
  });
}

function circleRectCollision(ball, rect) {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

function bounceFromRect(ball, rect) {
  const prevX = ball.x - ball.vx * 0.016;
  const prevY = ball.y - ball.vy * 0.016;
  const fromSide = prevX < rect.x || prevX > rect.x + rect.w;
  const fromTopBottom = prevY < rect.y || prevY > rect.y + rect.h;
  if (fromSide && !fromTopBottom) ball.vx *= -1;
  else ball.vy *= -1;
}

function update(delta) {
  game.time += delta;
  game.stateTime += delta;

  if (input.launch) {
    input.launch = false;
    if (game.state === STATE.MENU || game.state === STATE.GAME_OVER || game.state === STATE.WIN) resetRun();
    else if (game.state === STATE.READY) launchBalls();
    else if (game.state === STATE.LEVEL_CLEAR) nextLevel();
  }

  if (game.state === STATE.LEVEL_INTRO && game.stateTime > 1.65) readyBall();
  if (![STATE.READY, STATE.PLAYING].includes(game.state)) {
    updateParticles(delta);
    return;
  }

  updatePaddle(delta);
  updateEffects(delta);
  updateBricks();
  updateBalls(delta);
  updatePowerups(delta);
  updateParticles(delta);

  if (game.state === STATE.PLAYING && game.bricks.every(brick => !brick.alive)) completeLevel();
}

function updatePaddle(delta) {
  const level = currentLevel();
  if (input.pointerActive) {
    game.paddle.x = input.pointerX - game.paddle.w / 2;
  } else {
    const dir = Number(input.right) - Number(input.left);
    game.paddle.x += dir * level.paddleSpeed * delta;
  }
  game.paddle.x = clamp(game.paddle.x, 0, W - game.paddle.w);
  if (game.state === STATE.READY && game.balls[0]) {
    game.balls[0].x = game.paddle.x + game.paddle.w / 2;
    game.balls[0].y = CONFIG.paddle.y - game.balls[0].r - 4;
  }
}

function updateEffects(delta) {
  Object.entries({ ...game.effects }).forEach(([id, active]) => {
    active.remaining -= delta * 1000;
    if (active.remaining <= 0) removeEffect(id);
  });
}

function updateBricks() {
  game.bricks.forEach(brick => {
    if (!brick.alive || brick.def.id !== 'moving') return;
    brick.x = brick.baseX + Math.sin(game.time * 2.2 + brick.wobble) * brick.moveRange;
  });
}

function updateBalls(delta) {
  if (game.state !== STATE.PLAYING) return;
  const level = currentLevel();

  game.balls.forEach(ball => {
    ball.vx += level.specialRules.wind * level.ballSpeed * level.ballSpeed * delta;
    if (hasEffect('magnet') && ball.vy > 0 && ball.y > H * 0.55) {
      const target = game.paddle.x + game.paddle.w / 2;
      ball.vx += clamp((target - ball.x) * 0.75, -130, 130) * delta;
    }

    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    const paddleRect = { x: game.paddle.x, y: CONFIG.paddle.y, w: game.paddle.w, h: CONFIG.paddle.h };
    if (ball.vy > 0 && circleRectCollision(ball, paddleRect)) {
      const hit = ((ball.x - game.paddle.x) / game.paddle.w) * 2 - 1;
      const speed = ballSpeed(ball);
      const angle = hit * Math.PI * 0.36;
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      ball.y = CONFIG.paddle.y - ball.r - 1;
      game.combo = 0;
      audio.play('paddle');
    }

    for (const brick of game.bricks) {
      if (!brick.alive || !circleRectCollision(ball, brick)) continue;
      if (!hasEffect('fire') || brick.def.boss) bounceFromRect(ball, brick);
      hitBrick(brick, ball);
      audio.play('brick');
      break;
    }

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 10) ball.trail.shift();
  });

  game.balls = game.balls.filter(ball => ball.y - ball.r < H + 22);
  if (game.state === STATE.PLAYING && game.balls.length === 0) loseLife();
}

function updatePowerups(delta) {
  game.powerups.forEach(item => {
    item.y += item.vy * delta;
    item.spin += delta * 4;
    const s = CONFIG.power.size;
    if (
      item.y + s > CONFIG.paddle.y &&
      item.y < CONFIG.paddle.y + CONFIG.paddle.h &&
      item.x + s > game.paddle.x &&
      item.x < game.paddle.x + game.paddle.w
    ) {
      addEffect(item.power);
      spawnText(item.x + s / 2, item.y, item.power.label, item.power.color);
      spawnParticles(item.x + s / 2, item.y + s / 2, item.power.color, 12, 140);
      item.collected = true;
    }
  });
  game.powerups = game.powerups.filter(item => !item.collected && item.y < H + 40);
}

function updateParticles(delta) {
  game.particles.forEach(p => {
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += 260 * delta;
    p.life -= delta;
  });
  game.particles = game.particles.filter(p => p.life > 0);
}

function render() {
  ctx.imageSmoothingEnabled = false;
  drawBackground();
  drawWorldDecor();
  drawBricks();
  drawPowerups();
  drawPaddle();
  drawBalls();
  drawParticles();
  drawHud();

  if (game.state === STATE.LOADING) drawLoading();
  if (game.state === STATE.MENU) drawMenu();
  if (game.state === STATE.LEVEL_INTRO) drawLevelIntro();
  if (game.state === STATE.READY) drawReady();
  if (game.state === STATE.PAUSED) drawPause();
  if (game.state === STATE.LEVEL_CLEAR) drawLevelClear();
  if (game.state === STATE.GAME_OVER) drawGameOver();
  if (game.state === STATE.WIN) drawWin();
}

function drawBackground() {
  drawPixelBackground(currentLevel().theme);
}

function drawPixelBackground(theme) {
  if (theme === 'cave') {
    px(0, 0, W, H, PAL.cave);
    px(0, 360, W, 240, '#342443');
    drawCaveBlocks();
    return;
  }
  if (theme === 'castle') {
    px(0, 0, W, H, '#596078');
    px(0, 372, W, 228, '#3c3540');
    drawCastleWall();
    return;
  }
  px(0, 0, W, H, theme === 'sky' ? '#63d7ff' : PAL.sky);
  px(0, 340, W, 260, theme === 'water' ? '#1a9bd6' : '#72d348');
  if (theme === 'water') {
    px(0, 350, W, 16, '#9af5ff');
    for (let x = 0; x < W; x += 48) {
      px(x, 388 + Math.sin(game.time * 2 + x) * 2, 26, 4, '#d9ffff');
      px(x + 16, 420, 26, 4, '#74dff2');
    }
  }
  if (theme === 'sky') {
    px(0, 372, W, 228, '#79d96b');
    for (let x = -30; x < W; x += 128) drawPixelCloud(x, 374, 2);
  }
  drawHills(theme);
  drawGroundTiles(theme);
}

function drawHills(theme) {
  if (theme === 'water') {
    drawBlockHill(78, 314, 104, '#f0d184', '#c58b3c');
    drawBlockHill(620, 320, 92, '#f0d184', '#c58b3c');
    return;
  }
  if (theme === 'sky') return;
  drawBlockHill(84, 302, 118, '#77d455', '#39a342');
  drawBlockHill(568, 294, 150, '#8ee05d', '#43a743');
}

function drawBlockHill(x, y, w, fill, dark) {
  const step = 8;
  for (let row = 0; row < 8; row++) {
    const inset = row * step;
    px(x + inset, y + row * step, w - inset * 2, step, fill);
  }
  px(x + 20, y + 24, 16, 16, dark);
  px(x + w - 44, y + 32, 16, 16, dark);
}

function drawGroundTiles(theme) {
  const top = theme === 'cave' || theme === 'castle' ? 420 : 430;
  const topColor = theme === 'water' ? '#f3d58b' : theme === 'castle' ? '#707680' : theme === 'cave' ? '#5d4774' : PAL.grass;
  const bodyColor = theme === 'water' ? '#c88b43' : theme === 'castle' ? '#4e535c' : theme === 'cave' ? '#352747' : PAL.dirt;
  px(0, top, W, 18, PAL.black);
  px(0, top + 4, W, 18, topColor);
  px(0, top + 22, W, H - top - 22, bodyColor);
  for (let x = 0; x < W; x += 32) {
    px(x, top + 22, 4, H - top - 22, theme === 'castle' ? '#363a42' : '#6f3f21');
    px(x + 16, top + 46, 4, 22, 'rgba(0,0,0,0.14)');
  }
}

function drawCaveBlocks() {
  for (let x = 0; x < W; x += 48) {
    px(x, 0, 24, 40 + (x % 96), '#17122a');
    px(x + 12, 28, 16, 16, '#51437c');
  }
  px(80, 326, 96, 16, '#6f5782');
  px(620, 312, 112, 16, '#6f5782');
}

function drawCastleWall() {
  for (let y = 304; y < 430; y += 32) {
    for (let x = (y / 32) % 2 ? -32 : 0; x < W; x += 64) {
      box(x, y, 64, 32, '#67707c', '#363a42', 3);
    }
  }
  for (let x = 44; x < W; x += 142) {
    px(x, 278, 58, 112, '#4b4f59');
    px(x - 8, 254, 74, 24, PAL.black);
    px(x - 4, 258, 66, 16, '#808892');
    px(x + 20, 318, 18, 32, '#242833');
  }
  for (let x = 0; x < W; x += 72) {
    px(x, 520, 44, 8, PAL.lava);
    px(x + 16, 528, 52, 8, '#ffb02f');
  }
}

function drawWorldDecor() {
  const theme = currentLevel().theme;
  if (theme !== 'cave' && theme !== 'castle') {
    drawPixelCloud(90, 72, 2);
    drawPixelCloud(620, 58, 2);
    drawPixelCloud(420, 122, 1);
  }
  if (theme === 'grass') {
    drawTube(32, 344, 54, 86);
    drawTube(704, 336, 62, 94);
    drawFlag(642, 292);
  }
  if (theme === 'water') {
    drawShell(96, 402);
    drawShell(674, 402);
    drawTube(716, 332, 54, 98);
  }
  if (theme === 'sky') {
    drawFloatingTiles();
    drawFlag(694, 304);
  }
  if (theme === 'cave') {
    drawCrystal(70, 372, '#31e2e8');
    drawCrystal(694, 356, '#ff65d8');
  }
  if (theme === 'castle') {
    drawTorch(82, 392);
    drawTorch(690, 392);
  }
}

function drawPixelCloud(x, y, scale = 2) {
  const s = 8 * scale;
  px(x + s, y + s, s * 5, s * 2, PAL.white);
  px(x, y + s * 2, s * 8, s * 2, PAL.white);
  px(x + s * 2, y, s * 2, s, PAL.white);
  px(x + s * 5, y + s, s * 2, s, PAL.white);
  px(x + s, y + s * 3, s * 6, s, '#d7f7ff');
}

function drawTube(x, y, w, h) {
  box(x, y + 20, w, h - 20, PAL.pipe, PAL.black, 5);
  box(x - 10, y, w + 20, 28, '#42d962', PAL.black, 5);
  px(x + 10, y + 28, 8, h - 32, '#6cff83');
  px(x + w - 16, y + 28, 8, h - 32, PAL.pipeDark);
}

function drawFlag(x, y) {
  px(x, y, 6, 112, PAL.black);
  px(x + 6, y + 6, 62, 34, PAL.red);
  px(x + 6, y + 34, 42, 10, '#b82222');
  px(x + 20, y + 14, 18, 18, PAL.coin);
}

function drawShell(x, y) {
  box(x, y, 42, 24, '#ffd4ab', PAL.black, 4);
  px(x + 8, y + 8, 6, 12, '#d28762');
  px(x + 20, y + 6, 6, 14, '#d28762');
  px(x + 32, y + 8, 6, 12, '#d28762');
}

function drawFloatingTiles() {
  for (let x = 60; x < W; x += 148) {
    box(x, 334 + Math.sin(game.time + x) * 4, 72, 18, PAL.white, PAL.black, 4);
  }
}

function drawCrystal(x, y, color) {
  px(x + 12, y, 16, 12, '#ffffff');
  px(x + 4, y + 12, 32, 36, color);
  px(x + 12, y + 48, 16, 14, '#135f8c');
  lineRect(x + 4, y + 12, 32, 50, PAL.black, 4);
}

function drawTorch(x, y) {
  px(x + 10, y + 28, 10, 38, '#5c3824');
  px(x + 2, y + 12, 26, 22, PAL.lava);
  px(x + 8, y, 14, 18, '#ffd447');
  lineRect(x + 2, y + 12, 26, 22, PAL.black, 3);
}

function drawBricks() {
  game.bricks.forEach(brick => {
    if (!brick.alive) return;
    const x = iround(brick.x);
    const y = iround(brick.y);
    const w = iround(brick.w);
    const h = iround(brick.h);
    const damage = brick.hp / brick.maxHp;

    box(x + 4, y + 4, w, h, 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.28)', 0);
    box(x, y, w, h, brick.def.fill, PAL.black, 4);
    px(x + 4, y + 4, w - 8, 5, brick.def.top);
    px(x + 4, y + h - 8, w - 8, 4, 'rgba(0,0,0,0.22)');

    if (brick.def.id === 'normal') drawBrickLines(x, y, w, h);
    if (brick.def.id === 'hard') drawStoneCracks(x, y, w, h, damage);
    if (brick.def.id === 'question') drawMysteryBrick(x, y, w, h);
    if (brick.def.id === 'coin') drawCoinGlyph(x + w / 2, y + h / 2, 1.25);
    if (brick.def.id === 'moving') drawArrowGlyph(x, y, w, h);
    if (brick.def.id === 'bomb') drawBombGlyph(x, y, w, h);
    if (brick.def.boss) drawBossGlyph(x, y, w, h, damage);
  });
}

function drawBrickLines(x, y, w, h) {
  px(x + 4, y + 14, w - 8, 3, PAL.brickDark);
  for (let bx = x + 18; bx < x + w - 8; bx += 28) px(bx, y + 4, 3, 10, PAL.brickDark);
  for (let bx = x + 32; bx < x + w - 8; bx += 28) px(bx, y + 17, 3, 7, PAL.brickDark);
}

function drawStoneCracks(x, y, w, h, damage) {
  px(x + 14, y + 8, 18, 4, '#555b65');
  px(x + 26, y + 12, 4, 12, '#555b65');
  px(x + w - 28, y + 8, 4, 16, damage < 1 ? '#555b65' : '#89909b');
}

function drawMysteryBrick(x, y, w, h) {
  px(x + 10, y + 7, 10, 10, '#fff08a');
  px(x + w - 20, y + 7, 10, 10, PAL.coinDark);
  ctx.fillStyle = PAL.black;
  ctx.font = '900 20px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + w / 2, y + h / 2 + 1);
}

function drawCoinGlyph(cx, cy, scale = 1) {
  const s = 4 * scale;
  px(cx - 3 * s, cy - 4 * s, 6 * s, 8 * s, PAL.black);
  px(cx - 2 * s, cy - 3 * s, 4 * s, 6 * s, PAL.coin);
  px(cx - s, cy - 2 * s, s, 4 * s, '#fff08a');
  px(cx + s, cy - 2 * s, s, 4 * s, PAL.coinDark);
}

function drawArrowGlyph(x, y, w, h) {
  px(x + 14, y + h - 10, w - 28, 4, '#d7f7ff');
  px(x + w - 24, y + h - 14, 8, 12, '#d7f7ff');
}

function drawBombGlyph(x, y, w, h) {
  px(x + w / 2 - 8, y + 8, 16, 14, PAL.black);
  px(x + w / 2 + 4, y + 4, 12, 5, PAL.lava);
  px(x + w / 2 + 14, y + 2, 5, 5, PAL.coin);
}

function drawBossGlyph(x, y, w, h, damage) {
  px(x + w / 2 - 28, y + 8, 16, 8, PAL.white);
  px(x + w / 2 + 12, y + 8, 16, 8, PAL.white);
  px(x + w / 2 - 22, y + 10, 6, 6, PAL.black);
  px(x + w / 2 + 18, y + 10, 6, 6, PAL.black);
  px(x + 12, y + h - 7, (w - 24) * damage, 3, PAL.coin);
}

function drawPaddle() {
  const p = game.paddle;
  const y = CONFIG.paddle.y;
  box(p.x + 4, y + 6, p.w, CONFIG.paddle.h, 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.35)', 0);
  box(p.x, y, p.w, CONFIG.paddle.h, PAL.pipe, PAL.black, 4);
  px(p.x + 8, y + 4, p.w - 16, 4, '#6cff83');
  px(p.x + p.w / 2 - 18, y - 8, 36, 8, PAL.red);
  px(p.x + p.w / 2 - 12, y - 12, 24, 4, PAL.coin);
  if (hasEffect('magnet')) {
    px(p.x + 12, y - 18, p.w - 24, 4, '#b76bff');
    px(p.x + 20, y - 26, p.w - 40, 4, '#e9c8ff');
  }
  if (hasEffect('shield')) {
    px(24, H - 22, W - 48, 6, PAL.black);
    px(28, H - 20, W - 56, 2, '#31e2e8');
  }
}

function drawBalls() {
  game.balls.forEach(ball => {
    ball.trail.forEach((p, i) => {
      const t = i / ball.trail.length;
      const size = Math.max(3, Math.floor(t * 8));
      px(p.x - size / 2, p.y - size / 2, size, size, hasEffect('fire') ? '#ffb02f' : '#d7f7ff');
    });
    const x = iround(ball.x);
    const y = iround(ball.y);
    const fire = hasEffect('fire');
    px(x - 8, y - 8, 16, 16, PAL.black);
    px(x - 6, y - 6, 12, 12, fire ? PAL.lava : '#38a8ff');
    px(x - 4, y - 4, 5, 5, '#ffffff');
    px(x + 3, y + 2, 4, 4, fire ? '#b82222' : '#124c94');
  });
}

function drawPowerups() {
  game.powerups.forEach(item => {
    const s = CONFIG.power.size;
    const bob = Math.sin(item.spin) * 3;
    const x = iround(item.x);
    const y = iround(item.y + bob);
    box(x, y, s, s, item.power.color, PAL.black, 4);
    px(x + 5, y + 5, s - 10, 4, '#ffffff');
    ctx.fillStyle = PAL.black;
    ctx.font = '900 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.power.glyph, x + s / 2, y + s / 2 + 2);
  });
}

function drawParticles() {
  game.particles.forEach(p => {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    if (p.text) {
      ctx.fillStyle = p.color;
      ctx.font = '900 16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      px(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, p.color);
    }
  });
  ctx.globalAlpha = 1;
}

function drawHud() {
  px(0, 0, W, 72, PAL.black);
  px(0, 68, W, 4, '#3c4f7a');
  ctx.fillStyle = PAL.white;
  ctx.font = '900 13px "Courier New", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 18, 12);
  ctx.fillText(String(game.score).padStart(6, '0'), 18, 34);
  ctx.textAlign = 'center';
  ctx.fillText(currentLevel().name, W / 2, 12);
  ctx.fillStyle = PAL.coin;
  ctx.fillText(currentLevel().title, W / 2, 34);

  ctx.fillStyle = PAL.white;
  ctx.textAlign = 'right';
  ctx.fillText('LIFE', W - 18, 12);
  for (let i = 0; i < game.lives; i++) drawPixelHeart(W - 32 - i * 24, 44);

  let x = 246;
  Object.entries(game.effects).forEach(([id, active]) => {
    const power = POWERUPS.find(p => p.id === id);
    if (!power) return;
    drawEffectBadge(x, 14, power, active.remaining / active.duration);
    x += 86;
  });
}

function drawPixelHeart(x, y) {
  px(x - 8, y - 8, 6, 6, '#ff4f6b');
  px(x + 2, y - 8, 6, 6, '#ff4f6b');
  px(x - 10, y - 2, 20, 8, '#ff4f6b');
  px(x - 6, y + 6, 12, 6, '#ff4f6b');
  px(x - 2, y + 12, 4, 4, '#ff4f6b');
}

function drawEffectBadge(x, y, power, pct) {
  box(x, y, 72, 42, PAL.panel, PAL.black, 3);
  ctx.fillStyle = power.color;
  ctx.font = '900 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(power.label, x + 36, y + 6);
  px(x + 8, y + 27, 56, 6, PAL.black);
  px(x + 10, y + 29, 52 * clamp(pct, 0, 1), 2, power.color);
}

function drawOverlay(title, lines, action) {
  ctx.globalAlpha = 0.72;
  px(0, 0, W, H, PAL.black);
  ctx.globalAlpha = 1;
  box(W / 2 - 238, 154, 476, 282, PAL.panel, PAL.black, 6);
  px(W / 2 - 222, 170, 444, 8, PAL.red);
  px(W / 2 - 222, 412, 444, 8, PAL.red);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.coin;
  ctx.font = '900 32px "Courier New", monospace';
  ctx.fillText(title, W / 2, 214);
  ctx.font = '900 16px "Courier New", monospace';
  ctx.fillStyle = PAL.white;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 270 + i * 30));
  if (Math.floor(game.time * 2) % 2 === 0) {
    ctx.fillStyle = '#6cff83';
    ctx.fillText(action, W / 2, 382);
  }
}

function drawMenu() {
  drawOverlay('PIXEL BREAKOUT', ['ARCADE PLATFORM STYLE', '5 WORLDS  8 POWER UPS'], 'PRESS SPACE OR CLICK');
}

function drawLoading() {
  drawOverlay('LOADING', ['BUILDING PIXEL WORLD'], 'PLEASE WAIT');
}

function drawLevelIntro() {
  drawOverlay(currentLevel().name, [currentLevel().title, 'BREAK ALL BLOCKS'], 'GET READY');
}

function drawReady() {
  game.readyPulse += 0.04;
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.black;
  ctx.font = '900 18px "Courier New", monospace';
  ctx.fillText('SPACE / CLICK TO LAUNCH', W / 2 + 3, H - 92 + Math.sin(game.readyPulse) * 3 + 3);
  ctx.fillStyle = PAL.white;
  ctx.fillText('SPACE / CLICK TO LAUNCH', W / 2, H - 92 + Math.sin(game.readyPulse) * 3);
}

function drawPause() {
  drawOverlay('PAUSE', ['GAME PAUSED'], 'PRESS P TO RESUME');
}

function drawLevelClear() {
  drawOverlay('STAGE CLEAR', [`SCORE ${game.score}`, `NEXT ${LEVELS[game.levelIndex + 1].name}`], 'SPACE OR CLICK');
}

function drawGameOver() {
  drawOverlay('GAME OVER', [`FINAL SCORE ${game.score}`, 'TRY AGAIN'], 'SPACE OR CLICK');
}

function drawWin() {
  drawOverlay('VICTORY', [`ALL ${LEVELS.length} WORLDS CLEAR`, `FINAL SCORE ${game.score}`], 'SPACE OR CLICK');
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return ((event.clientX - rect.left) / rect.width) * W;
}

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') input.left = true;
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') input.right = true;
  if (event.key === ' ' || event.key === 'Spacebar') { event.preventDefault(); input.launch = true; }
  if (event.key === 'p' || event.key === 'P') {
    if (game.state === STATE.PLAYING || game.state === STATE.READY) setState(STATE.PAUSED);
    else if (game.state === STATE.PAUSED) setState(game.balls.some(b => b.stuck) ? STATE.READY : STATE.PLAYING);
  }
});

document.addEventListener('keyup', event => {
  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') input.left = false;
  if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') input.right = false;
});

canvas.addEventListener('pointerdown', event => {
  input.pointerActive = true;
  input.pointerX = pointerToCanvas(event);
  input.launch = true;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', event => {
  if (!input.pointerActive) return;
  input.pointerX = pointerToCanvas(event);
});

canvas.addEventListener('pointerup', event => {
  input.pointerActive = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointercancel', () => {
  input.pointerActive = false;
});

function loop(now) {
  const delta = Math.min(0.033, (now - game.lastTime) / 1000 || 0);
  game.lastTime = now;
  if (game.state !== STATE.PAUSED) update(delta);
  render();
  requestAnimationFrame(loop);
}

loadLevel(0);
requestAnimationFrame(loop);
