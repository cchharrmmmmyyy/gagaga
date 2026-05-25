/**
 * SUPER MARIO BREAKOUT - Mario-themed Breakout game
 * 4 levels, power-ups, sound effects, fireball physics
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ====================== CONSTANTS ======================
const PADDLE_DEFAULT_W = 110;
const PADDLE_EXTENDED_W = 180;
const PADDLE_SHRUNK_W = 70;
const PADDLE_H = 14;
const PADDLE_RADIUS = 7;
const BALL_R = 8;
const BALL_SPEED = 2.35; // Reduced by ~1/3 from 3.5
const PADDLE_SPEED = 5.5;
const POWERUP_SIZE = 30;
const POWERUP_FALL_SPEED = 1.5;
const POWERUP_DROP_CHANCE = 0.22;
const EXTEND_DURATION = 10000;
const SLOW_DURATION = 8000;
const SHRINK_DURATION = 7000;
const BRICK_W = 78;
const BRICK_H = 24;
const BRICK_PAD = 8;
const BRICK_RADIUS = 4;
const OFFSET_TOP = 80;
const PIXEL_FONT = "'Courier New', Consolas, monospace";

// ====================== MARIO COLOR PALETTE ======================
const MARIO_RED = '#E52521';
const MARIO_BROWN = '#C4723E';
const MARIO_DARK_BROWN = '#8B4513';
const MARIO_GOLD = '#F5C842';
const MARIO_DARK_GOLD = '#D4A017';
const MARIO_PIPE_GREEN = '#5E9B3E';
const MARIO_DARK_GREEN = '#3D6B2E';
const MARIO_SKY_TOP = '#5B94D4';
const MARIO_SKY_BOT = '#8CC4F0';
const MARIO_BLUE = '#1E5AA8';
const MARIO_BLACK = '#111111';

const BRICK_THEMES = [
  { fill: '#B86F36', dark: '#5C2E13' },
  { fill: '#C97A3A', dark: '#6F3917' },
  { fill: '#A85A2A', dark: '#4F230E' },
  { fill: '#D18B46', dark: '#7B421C' },
  { fill: '#B86F36', dark: '#5C2E13' },
  { fill: '#C97A3A', dark: '#6F3917' },
  { fill: '#A85A2A', dark: '#4F230E' },
  { fill: '#D18B46', dark: '#7B421C' }
];

const WORLD_STYLES = [
  { skyTop: '#5B94D4', skyBot: '#8CC4F0', ground: '#B86F36', grass: '#7AC943', hill: '#4EA346', accent: '#E52521' },
  { skyTop: '#24183B', skyBot: '#3A245F', ground: '#6B4A2D', grass: '#7D6A9B', hill: '#342047', accent: '#5AD7FF' },
  { skyTop: '#5B94D4', skyBot: '#A7D9FF', ground: '#9C6C37', grass: '#6CC24A', hill: '#4FA64C', accent: '#F5C842' },
  { skyTop: '#3B3B46', skyBot: '#67626A', ground: '#6B3323', grass: '#D44524', hill: '#3A3030', accent: '#FF7A2A' }
];

// ====================== LEVELS (4 Worlds) ======================
const LEVELS = [
  {
    name: 'WORLD 1-1',
    subtitle: 'MUSHROOM PLAINS',
    cols: 6, rows: 4,
    layout: [
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1]
    ]
  },
  {
    name: 'WORLD 1-2',
    subtitle: 'UNDERGROUND',
    cols: 7, rows: 5,
    layout: [
      [2,2,2,2,2,2,2],
      [1,1,1,1,1,1,1],
      [2,1,1,1,1,1,2],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1]
    ]
  },
  {
    name: 'WORLD 1-3',
    subtitle: 'GHOST HOUSE',
    cols: 8, rows: 5,
    layout: [
      [2,2,2,2,2,2,2,2],
      [1,1,1,1,1,1,1,1],
      [3,3,3,3,3,3,3,3],
      [1,1,3,1,1,3,1,1],
      [1,2,1,1,1,1,2,1]
    ]
  },
  {
    name: 'WORLD 1-4',
    subtitle: 'CASTLE',
    cols: 9, rows: 6,
    layout: [
      [2,2,2,2,2,2,2,2,2],
      [1,1,2,1,1,1,2,1,1],
      [1,1,1,1,1,1,1,1,1],
      [3,1,1,3,1,3,1,1,3],
      [1,2,1,1,2,1,1,2,1],
      [1,1,1,1,1,1,1,1,1]
    ]
  }
];

// ====================== GAME STATE ======================
let state = 'MENU';
let currentLevel = 0;
let score = 0;
let lives = 3;
let comboCount = 0;

let paddleX = (canvas.width - PADDLE_DEFAULT_W) / 2;
let paddleW = PADDLE_DEFAULT_W;

let balls = [];
let powerups = [];
let bricks = [];
let particles = [];
let clouds = [];
let coinSpawns = [];

let effects = {
  extend: false, extendTimer: 0,
  slow: false, slowTimer: 0,
  shrink: false, shrinkTimer: 0
};

let levelIntroTimer = 0;
let animTime = 0;
let gameOverTimer = 0;
let frameCount = 0;
let shakeX = 0, shakeY = 0;

const keys = { right: false, left: false, space: false };

// ====================== CLOUDS ======================
function initClouds() {
  clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: Math.random() * canvas.width * 1.2 - canvas.width * 0.1,
      y: 30 + Math.random() * 100,
      scale: 0.5 + Math.random() * 0.8,
      speed: 0.15 + Math.random() * 0.25
    });
  }
}
initClouds();

// ====================== UTILITY ======================
function rand(min, max) { return Math.random() * (max - min) + min; }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ====================== SOUND MANAGER ======================
const SoundManager = {
  ctx: null,
  _ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  _play(freq, duration, type, vol) {
    try {
      this._ensure();
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(vol || 0.15, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + duration);
    } catch (e) { /* */ }
  },
  _sweep(f0, f1, dur, type, vol) {
    try {
      this._ensure();
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, this.ctx.currentTime);
      o.frequency.linearRampToValueAtTime(f1, this.ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.12, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch (e) { /* */ }
  },
  _arpeggio(notes, spacing) {
    this._ensure();
    if (!this.ctx) return;
    notes.forEach((f, i) => {
      try {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = i === 3 ? 'square' : 'sine';
        o.frequency.setValueAtTime(f, this.ctx.currentTime + i * spacing);
        g.gain.setValueAtTime(0.12, this.ctx.currentTime + i * spacing);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * spacing + 0.15);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(this.ctx.currentTime + i * spacing);
        o.stop(this.ctx.currentTime + i * spacing + 0.15);
      } catch (e) { /* */ }
    });
  },
  paddleHit() { this._sweep(400, 600, 0.05, 'sine', 0.1); },
  brickBreak() { this._play(180, 0.1, 'square', 0.08); },
  hardBrickHit() { this._play(800, 0.08, 'triangle', 0.08); },
  hardBrickBreak() { this._play(250, 0.15, 'sawtooth', 0.07); },
  wallBounce() { this._sweep(350, 450, 0.03, 'sine', 0.06); },
  powerupCollect() { this._arpeggio([523, 659, 784], 0.07); },
  oneUp() { this._arpeggio([523, 659, 784, 1047], 0.1); },
  coinCollect() { this._arpeggio([988, 1319], 0.06); },
  lifeLost() { this._arpeggio([330, 262, 220], 0.15); },
  gameOver() { this._arpeggio([440, 370, 330, 262], 0.25); },
  victory() { this._arpeggio([523, 659, 784, 1047, 784, 1047], 0.12); },
  levelComplete() { this._arpeggio([784, 659, 784, 1047], 0.1); }
};

// ====================== BALL ======================
function createBall(x, y, dx, dy) {
  return { x, y, dx, dy, r: BALL_R, trail: [] };
}

function initBall() {
  const angle = -Math.PI / 2 + rand(-0.2, 0.2);
  const speed = effects.slow ? BALL_SPEED * 0.5 : BALL_SPEED;
  balls = [createBall(canvas.width / 2, canvas.height - 60, Math.cos(angle) * speed, Math.sin(angle) * speed)];
}

// ====================== BRICKS ======================
function initLevel(levelIdx) {
  const level = LEVELS[levelIdx];
  bricks = [];
  const totalW = level.cols * (BRICK_W + BRICK_PAD) - BRICK_PAD;
  const offsetX = (canvas.width - totalW) / 2;
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const type = level.layout[r][c];
      if (type === 0) continue;
      bricks.push({
        x: offsetX + c * (BRICK_W + BRICK_PAD),
        y: OFFSET_TOP + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W, h: BRICK_H, type,
        hp: type === 2 ? 2 : 1, maxHp: type === 2 ? 2 : 1,
        alive: true, color: BRICK_THEMES[r % BRICK_THEMES.length],
        baseX: offsetX + c * (BRICK_W + BRICK_PAD),
        moveRange: type === 3 ? rand(25, 42) : 0,
        moveSpeed: rand(0.01, 0.02),
        movePhase: rand(0, Math.PI * 2)
      });
    }
  }
  powerups = []; particles = []; coinSpawns = [];
}

// ====================== POWER-UPS ======================
const POWERUP_TYPES = [
  { id: 'extend', color: '#E52521', glow: '#ff6644', label: 'MUSHROOM', draw: 'mushroom_red' },
  { id: 'multi',  color: '#FF6B35', glow: '#ff4400', label: 'FLOWER', draw: 'flower' },
  { id: 'slow',   color: '#FFD700', glow: '#ffcc00', label: 'STAR', draw: 'star' },
  { id: 'life',   color: '#39FF14', glow: '#00ff00', label: '1-UP', draw: 'mushroom_green' },
  { id: 'poison', color: '#9944CC', glow: '#7722aa', label: 'POISON', draw: 'mushroom_purple' }
];

function spawnPowerup(x, y) {
  if (Math.random() > POWERUP_DROP_CHANCE) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  powerups.push({
    x: x - POWERUP_SIZE / 2, y: y - POWERUP_SIZE / 2,
    w: POWERUP_SIZE, h: POWERUP_SIZE, type, vy: POWERUP_FALL_SPEED, bob: rand(0, Math.PI * 2)
  });
}

function activatePowerup(id) {
  switch (id) {
    case 'extend':
      effects.shrink = false; effects.shrinkTimer = 0;
      effects.extend = true; effects.extendTimer = EXTEND_DURATION;
      paddleW = PADDLE_EXTENDED_W;
      SoundManager.powerupCollect();
      break;
    case 'multi':
      if (balls.length === 1) {
        const b = balls[0], spd = Math.hypot(b.dx, b.dy), a = Math.atan2(b.dy, b.dx);
        for (let i = -1; i <= 1; i += 2) balls.push(createBall(b.x, b.y, Math.cos(a + i * 0.3) * spd, Math.sin(a + i * 0.3) * spd));
        comboCount = 0;
      }
      SoundManager.powerupCollect();
      break;
    case 'slow':
      effects.slow = true; effects.slowTimer = SLOW_DURATION;
      balls.forEach(b => { const spd = Math.hypot(b.dx, b.dy); if (spd > BALL_SPEED * 0.5) { const r = (BALL_SPEED * 0.5) / spd; b.dx *= r; b.dy *= r; } });
      SoundManager.powerupCollect();
      break;
    case 'life':
      lives++; SoundManager.oneUp();
      break;
    case 'poison':
      effects.extend = false; effects.extendTimer = 0;
      effects.shrink = true; effects.shrinkTimer = SHRINK_DURATION;
      paddleW = Math.min(PADDLE_SHRUNK_W, paddleW);
      SoundManager.powerupCollect();
      break;
  }
}

// ====================== PARTICLES ======================
function spawnParticles(x, y, color, count, spread) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    particles.push({
      x, y, vx: Math.cos(a) * rand(1, spread || 4), vy: Math.sin(a) * rand(1, spread || 4) - 1,
      life: rand(20, 50), maxLife: 50, size: rand(2, 5), color, gravity: 0.08
    });
  }
}

function spawnScorePopup(x, y, text, color) {
  particles.push({
    x, y, vx: 0, vy: -2.5, life: 40, maxLife: 40, size: 0, color: color || '#FFD700',
    isText: true, text, gravity: 0
  });
}

// ====================== MARIO DRAWING HELPERS ======================
function pixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawPixelText(text, x, y, size, fill, shadow) {
  ctx.font = `900 ${size}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(text, x + Math.max(2, size * 0.08), y + Math.max(2, size * 0.08));
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawCloud(cx, cy, scale) {
  const u = 12 * scale;
  pixelRect(cx, cy, u * 6, u * 2, '#FFFFFF');
  pixelRect(cx + u, cy - u, u * 4, u, '#FFFFFF');
  pixelRect(cx + u * 2, cy - u * 2, u * 2, u, '#FFFFFF');
  pixelRect(cx + u * 0.6, cy + u * 0.4, u * 4.8, u * 0.65, 'rgba(190,225,255,0.65)');
}

function drawHills() {
  const style = WORLD_STYLES[currentLevel] || WORLD_STYLES[0];
  ctx.fillStyle = style.hill;
  ctx.beginPath(); ctx.ellipse(135, canvas.height - 58, 155, 82, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(590, canvas.height - 52, 230, 96, 0, Math.PI, 0); ctx.fill();
  pixelRect(80, canvas.height - 93, 16, 16, 'rgba(255,255,255,0.25)');
  pixelRect(148, canvas.height - 116, 16, 16, 'rgba(255,255,255,0.25)');
  pixelRect(520, canvas.height - 130, 18, 18, 'rgba(255,255,255,0.22)');
  pixelRect(650, canvas.height - 92, 18, 18, 'rgba(255,255,255,0.22)');
}

function drawGroundTiles() {
  const style = WORLD_STYLES[currentLevel] || WORLD_STYLES[0];
  pixelRect(0, canvas.height - 36, canvas.width, 8, style.grass);
  pixelRect(0, canvas.height - 28, canvas.width, 28, style.ground);
  for (let x = 0; x < canvas.width; x += 32) {
    pixelRect(x, canvas.height - 28, 30, 26, style.ground);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, canvas.height - 28, 30, 26);
    pixelRect(x + 8, canvas.height - 18, 5, 5, 'rgba(255,255,255,0.15)');
  }
}

function drawCastleSilhouette() {
  const y = canvas.height - 144;
  pixelRect(540, y + 34, 172, 108, '#3B2E2E');
  pixelRect(560, y, 34, 142, '#3B2E2E');
  pixelRect(646, y - 22, 42, 164, '#3B2E2E');
  for (let x = 540; x < 704; x += 28) pixelRect(x, y + 22, 18, 18, '#2B2020');
  for (let x = 568; x < 686; x += 48) pixelRect(x, y + 70, 18, 24, '#FF7A2A');
}

function drawMarioLikeRunner(x, y) {
  pixelRect(x + 8, y, 18, 12, MARIO_RED);
  pixelRect(x + 2, y + 10, 28, 14, '#F0B080');
  pixelRect(x + 8, y + 24, 24, 18, MARIO_RED);
  pixelRect(x + 4, y + 40, 8, 18, MARIO_BLUE);
  pixelRect(x + 24, y + 40, 8, 18, MARIO_BLUE);
  pixelRect(x + 2, y + 56, 13, 7, '#5C2E13');
  pixelRect(x + 22, y + 56, 13, 7, '#5C2E13');
  pixelRect(x + 23, y + 14, 4, 4, MARIO_BLACK);
  pixelRect(x - 7, y + 26, 10, 8, '#F0B080');
  pixelRect(x + 31, y + 25, 10, 8, '#F0B080');
}

function drawBrickTexture(x, y, w, h) {
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 2, y + h / 2); ctx.lineTo(x + w - 2, y + h / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y + h - 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 4, y + h * 0.25); ctx.lineTo(x + w * 0.4, y + h * 0.25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.6, y + h * 0.75); ctx.lineTo(x + w - 4, y + h * 0.75); ctx.stroke();
}

function drawQuestionBlock(x, y, w, h, damaged) {
  ctx.fillStyle = damaged ? MARIO_DARK_GOLD : MARIO_GOLD;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = MARIO_BLACK; ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  pixelRect(x + 4, y + 4, w - 8, 5, 'rgba(255,255,255,0.28)');
  pixelRect(x + 5, y + 5, 4, 4, '#FFF2A2');
  pixelRect(x + w - 9, y + 5, 4, 4, '#FFF2A2');
  pixelRect(x + 5, y + h - 9, 4, 4, '#A96900');
  pixelRect(x + w - 9, y + h - 9, 4, 4, '#A96900');
  drawPixelText('?', x + w / 2, y + h / 2 + 1, Math.min(22, h + 2), damaged ? '#7B4B00' : '#FFFFFF', '#A96900');
}

function drawPipeBlock(x, y, w, h) {
  pixelRect(x, y, w, h, MARIO_PIPE_GREEN);
  pixelRect(x, y, w, 7, '#7ED957');
  pixelRect(x + 5, y + 3, 8, h - 6, '#9DFF7A');
  pixelRect(x + w - 14, y + 4, 8, h - 8, MARIO_DARK_GREEN);
  ctx.strokeStyle = MARIO_BLACK; ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
}

// ====================== DRAWING ======================
function drawBackground() {
  const style = WORLD_STYLES[currentLevel] || WORLD_STYLES[0];
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, style.skyTop);
  grad.addColorStop(0.68, style.skyBot);
  grad.addColorStop(1, style.grass);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (currentLevel === 1) {
    for (let y = 70; y < canvas.height - 40; y += 42) {
      for (let x = (y / 42) % 2 ? -20 : 0; x < canvas.width; x += 64) {
        pixelRect(x, y, 32, 20, 'rgba(255,255,255,0.05)');
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.strokeRect(x, y, 32, 20);
      }
    }
  } else {
    clouds.forEach(c => { c.x += c.speed * 0.3; if (c.x > canvas.width + 80) c.x = -120; drawCloud(c.x, c.y, c.scale); });
    drawHills();
  }
  if (currentLevel === 3) drawCastleSilhouette();
  drawGroundTiles();
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawBricks() {
  bricks.forEach(b => {
    if (!b.alive) return;
    pixelRect(b.x + 4, b.y + 4, b.w, b.h, 'rgba(0,0,0,0.18)');
    if (b.type === 3) {
      drawPipeBlock(b.x, b.y, b.w, b.h);
      const pulse = Math.sin(animTime * 0.003 + b.x * 0.03) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.08})`;
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    } else if (b.type === 2) {
      drawQuestionBlock(b.x, b.y, b.w, b.h, b.hp < b.maxHp);
      if (b.hp < b.maxHp) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x + 10, b.y + 5); ctx.lineTo(b.x + 18, b.y + 14); ctx.lineTo(b.x + 14, b.y + b.h - 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x + b.w - 10, b.y + 6); ctx.lineTo(b.x + b.w - 16, b.y + 13); ctx.lineTo(b.x + b.w - 12, b.y + b.h - 4); ctx.stroke();
      }
    } else {
      pixelRect(b.x, b.y, b.w, b.h, b.color.fill);
      ctx.strokeStyle = MARIO_BLACK; ctx.lineWidth = 3; ctx.strokeRect(b.x, b.y, b.w, b.h);
      pixelRect(b.x + 3, b.y + 3, b.w - 6, 5, 'rgba(255,255,255,0.16)');
      drawBrickTexture(b.x, b.y, b.w, b.h);
    }
  });
}

function drawPaddle() {
  const x = paddleX, y = canvas.height - PADDLE_H;
  pixelRect(x + 4, y + 4, paddleW, PADDLE_H, 'rgba(0,0,0,0.25)');
  const grad = ctx.createLinearGradient(x, y, x, y + PADDLE_H);
  grad.addColorStop(0, MARIO_PIPE_GREEN); grad.addColorStop(0.3, '#6BAF4A');
  grad.addColorStop(0.7, MARIO_PIPE_GREEN); grad.addColorStop(1, MARIO_DARK_GREEN);
  ctx.fillStyle = grad; ctx.fillRect(x, y, paddleW, PADDLE_H);
  pixelRect(x - 5, y - 8, paddleW + 10, 10, MARIO_PIPE_GREEN);
  pixelRect(x - 2, y - 6, paddleW + 4, 4, '#9DFF7A');
  ctx.strokeStyle = MARIO_BLACK; ctx.lineWidth = 3;
  ctx.strokeRect(x - 5, y - 8, paddleW + 10, 10);
  ctx.strokeRect(x, y, paddleW, PADDLE_H);
  for (let i = 0; i < 4; i++) {
    const sx = x + 10 + (paddleW - 20) * (i / 3);
    pixelRect(sx, y + 4, 4, PADDLE_H - 7, 'rgba(0,0,0,0.12)');
    pixelRect(sx + 4, y + 4, 2, PADDLE_H - 7, 'rgba(255,255,255,0.12)');
  }
  if (effects.extend) { ctx.strokeStyle = '#39FF14'; ctx.lineWidth = 3; ctx.strokeRect(x - 5, y - 8, paddleW + 10, PADDLE_H + 8); }
  if (effects.shrink) { ctx.strokeStyle = '#FF4444'; ctx.lineWidth = 3; ctx.strokeRect(x - 5, y - 8, paddleW + 10, PADDLE_H + 8); }
}

function drawFireBall(ball) {
  const { x, y, r } = ball;
  // Fire trail
  for (let i = 0; i < ball.trail.length; i++) {
    const t = ball.trail[i], p = i / ball.trail.length;
    ctx.globalAlpha = p * 0.25;
    ctx.fillStyle = `hsl(${20 + (1 - p) * 20}, 100%, 50%)`;
    ctx.beginPath(); ctx.arc(t.x, t.y, r * (0.3 + 0.7 * p), 0, Math.PI * 2); ctx.fill();
    if (i < ball.trail.length - 2 && Math.random() > 0.5) {
      ctx.fillStyle = `hsl(30, 100%, ${60 + p * 30}%)`;
      ctx.beginPath(); ctx.arc(t.x + rand(-3, 3), t.y + rand(-3, 3), r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Outer glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  glow.addColorStop(0, 'rgba(255, 100, 0, 0.2)'); glow.addColorStop(0.5, 'rgba(255, 50, 0, 0.08)'); glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
  // Core
  ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 25;
  const core = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
  core.addColorStop(0, '#FFFFFF'); core.addColorStop(0.2, '#FFE040'); core.addColorStop(0.5, '#FF6B35');
  core.addColorStop(0.8, '#E52521'); core.addColorStop(1, '#CC2200');
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
}

function drawPowerupIcon(type, cx, cy, size) {
  const r = size * 0.45;
  if (type.draw.startsWith('mushroom')) {
    const cap = type.draw === 'mushroom_green' ? '#39FF14' : (type.draw === 'mushroom_purple' ? '#9944CC' : MARIO_RED);
    ctx.fillStyle = cap; ctx.beginPath(); ctx.arc(cx, cy - 1, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.4, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.4, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F5E6D0'; ctx.fillRect(cx - r * 0.3, cy - 1, r * 0.6, r * 0.7);
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - r * 0.15, cy + r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.15, cy + r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
  } else if (type.draw === 'flower') {
    ctx.fillStyle = '#3D8C40'; ctx.fillRect(cx - 2, cy + r * 0.1, 4, r * 0.6);
    ctx.fillStyle = '#FF4444';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.35, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.4, cy + r * 0.2, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.4, cy + r * 0.2, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2); ctx.fill();
  } else if (type.draw === 'star') {
    ctx.fillStyle = '#FFD700'; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI / 5) - Math.PI / 2, sr = i % 2 === 0 ? r : r * 0.4;
      const px = cx + Math.cos(a) * sr, py = cy + Math.sin(a) * sr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawPowerups() {
  powerups.forEach(pu => {
    const cx = pu.x + pu.w / 2, cy = pu.y + pu.h / 2 + Math.sin(animTime * 0.003 + pu.bob) * 2;
    ctx.shadowColor = pu.type.glow; ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(cx, cy, pu.w / 2 + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, pu.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    drawPowerupIcon(pu.type, cx, cy, pu.w - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `900 7px ${PIXEL_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(pu.type.label, cx, cy + pu.w / 2 + 2);
  });
  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife; ctx.globalAlpha = alpha;
    if (p.isText) {
      ctx.fillStyle = p.color; ctx.font = `900 16px ${PIXEL_FONT}`;
      ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color; const s = p.size * (0.5 + 0.5 * alpha);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  });
  ctx.globalAlpha = 1;
}

function drawCoinSpawns() {
  coinSpawns.forEach(c => {
    const alpha = c.life / c.maxLife; ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#DAA520'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#8A5A00'; ctx.font = `900 ${c.size}px ${PIXEL_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C', c.x, c.y + 0.5);
  });
  ctx.globalAlpha = 1;
}

function drawUI() {
  ctx.font = `900 18px ${PIXEL_FONT}`;
  // Score panel
  pixelRect(10, 8, 200, 46, 'rgba(0,0,0,0.45)');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(10, 8, 200, 46);
  ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(28, 28, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8A5A00'; ctx.font = `900 9px ${PIXEL_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C', 28, 28);
  ctx.fillStyle = '#fff'; ctx.font = `900 18px ${PIXEL_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('x ' + score, 42, 30);
  // Level name
  drawPixelText(LEVELS[currentLevel].name, canvas.width / 2, 17, 16, '#FFFFFF', MARIO_BLACK);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `900 10px ${PIXEL_FONT}`; ctx.textAlign = 'center'; ctx.fillText(LEVELS[currentLevel].subtitle, canvas.width / 2, 37);
  // Lives panel
  pixelRect(canvas.width - 210, 8, 200, 46, 'rgba(0,0,0,0.45)');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(canvas.width - 210, 8, 200, 46);
  ctx.fillStyle = '#39FF14'; ctx.font = `900 11px ${PIXEL_FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('1UP', canvas.width - 24, 18);
  for (let i = 0; i < lives; i++) {
    const lx = canvas.width - 34 - i * 22, ly = 34;
    ctx.fillStyle = '#39FF14'; ctx.beginPath(); ctx.arc(lx, ly - 2, 6, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#F5E6D0'; ctx.fillRect(lx - 3, ly - 1, 6, 7);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx - 2.5, ly - 4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lx + 2.5, ly - 4, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // Active effects
  let ey = 62;
  if (effects.extend) {
    pixelRect(10, ey, 98, 20, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = '#39FF14'; ctx.font = `900 8px ${PIXEL_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('MUSHROOM', 16, ey + 10);
    const pct = effects.extendTimer / EXTEND_DURATION;
    ctx.fillStyle = 'rgba(57,255,20,0.2)'; drawRoundedRect(60, ey + 5, 30, 10, 3); ctx.fill();
    ctx.fillStyle = '#39FF14'; drawRoundedRect(60, ey + 5, 30 * pct, 10, 3); ctx.fill();
    ey += 26;
  }
  if (effects.shrink) {
    pixelRect(10, ey, 98, 20, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = '#FF4444'; ctx.font = `900 8px ${PIXEL_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('POISON', 16, ey + 10);
    const pct = effects.shrinkTimer / SHRINK_DURATION;
    ctx.fillStyle = 'rgba(255,68,68,0.2)'; drawRoundedRect(60, ey + 5, 30, 10, 3); ctx.fill();
    ctx.fillStyle = '#FF4444'; drawRoundedRect(60, ey + 5, 30 * pct, 10, 3); ctx.fill();
    ey += 26;
  }
  if (effects.slow) {
    pixelRect(10, ey, 98, 20, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = '#FFD700'; ctx.font = `900 8px ${PIXEL_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('STAR', 16, ey + 10);
    const pct = effects.slowTimer / SLOW_DURATION;
    ctx.fillStyle = 'rgba(255,215,0,0.2)'; drawRoundedRect(60, ey + 5, 30, 10, 3); ctx.fill();
    ctx.fillStyle = '#FFD700'; drawRoundedRect(60, ey + 5, 30 * pct, 10, 3); ctx.fill();
  }
}

// ====================== SCREENS ======================
function drawMenu() {
  drawBackground();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPipeBlock(56, 356, 74, 126);
  drawPipeBlock(canvas.width - 130, 340, 74, 142);
  drawQuestionBlock(170, 268, 46, 46, false);
  drawQuestionBlock(canvas.width - 216, 292, 46, 46, false);
  drawMarioLikeRunner(112, 430);
  for (let x = 260; x < 540; x += 48) drawQuestionBlock(x, 104, 36, 36, false);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawPixelText('SUPER MARIO', canvas.width / 2, 170, 52, MARIO_RED, MARIO_BLACK);
  drawPixelText('BREAKOUT', canvas.width / 2, 224, 50, MARIO_GOLD, MARIO_BLACK);
  pixelRect(canvas.width / 2 - 188, 258, 376, 6, MARIO_BLACK);
  pixelRect(canvas.width / 2 - 184, 258, 368, 3, '#FFFFFF');
  for (let i = 0; i < 5; i++) {
    const cx = canvas.width / 2 - 120 + i * 60;
    const cy = 292 + Math.sin(animTime * 0.004 + i) * 5;
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8A5A00'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#8A5A00'; ctx.font = `900 9px ${PIXEL_FONT}`; ctx.fillText('C', cx, cy + 1);
  }
  drawPixelText('LEFT / RIGHT OR MOUSE', canvas.width / 2, 350, 16, '#FFFFFF', MARIO_BLACK);
  drawPixelText('SPACE START   P PAUSE', canvas.width / 2, 380, 16, '#FFFFFF', MARIO_BLACK);
  if (Math.floor(animTime / 600) % 2 === 0) {
    drawPixelText('[ PRESS SPACE ]', canvas.width / 2, 454, 20, '#FFD700', MARIO_BLACK);
  }
}

function drawLevelIntro() {
  drawBackground(); drawBricks();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawPixelText(LEVELS[currentLevel].name, canvas.width / 2, 190, 42, MARIO_RED, MARIO_BLACK);
  drawPixelText(LEVELS[currentLevel].subtitle, canvas.width / 2, 240, 18, '#FFD700', MARIO_BLACK);
  pixelRect(canvas.width / 2 - 116, 270, 232, 4, '#FFFFFF');
  let ly = 320; ctx.font = `900 12px ${PIXEL_FONT}`;
  pixelRect(canvas.width / 2 - 140, ly - 12, 28, 20, MARIO_BROWN);
  ctx.strokeStyle = MARIO_BLACK; ctx.lineWidth = 2; ctx.strokeRect(canvas.width / 2 - 140, ly - 12, 28, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.fillText('BRICK BLOCK', canvas.width / 2 - 104, ly + 3);
  drawQuestionBlock(canvas.width / 2 + 20, ly - 14, 28, 24, false);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.fillText('? BLOCK', canvas.width / 2 + 56, ly + 3);
  if (currentLevel >= 2) {
    ly += 42; drawPipeBlock(canvas.width / 2 - 140, ly - 12, 28, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'left'; ctx.fillText('MOVING PIPE', canvas.width / 2 - 104, ly + 3);
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawPixelText('GAME OVER', canvas.width / 2, 210, 50, MARIO_RED, MARIO_BLACK);
  drawPixelText('FINAL SCORE', canvas.width / 2, 290, 16, '#FFFFFF', MARIO_BLACK);
  drawPixelText(String(score), canvas.width / 2, 335, 34, '#FFD700', MARIO_BLACK);
  drawPixelText('THANKS FOR PLAYING!', canvas.width / 2, 385, 13, '#FFFFFF', MARIO_BLACK);
  if (Math.floor(animTime / 500) % 2 === 0) {
    drawPixelText('PRESS SPACE TO TRY AGAIN', canvas.width / 2, 440, 15, '#FFFFFF', MARIO_BLACK);
  }
}

function drawWin() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (frameCount % 8 === 0) spawnParticles(rand(100, canvas.width - 100), rand(80, 300), ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6B35','#FF44AA'][Math.floor(Math.random()*6)], 8, 6);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawPixelText('YOU WIN!', canvas.width / 2, 180, 46, '#FFD700', MARIO_BLACK);
  drawPixelText('ALL WORLDS CLEARED!', canvas.width / 2, 240, 19, '#FFFFFF', MARIO_BLACK);
  drawPixelText('THANK YOU MARIO!', canvas.width / 2, 275, 14, '#FFFFFF', MARIO_BLACK);
  drawPixelText('FINAL SCORE', canvas.width / 2, 330, 16, '#FFFFFF', MARIO_BLACK);
  drawPixelText(String(score), canvas.width / 2, 370, 34, '#FFD700', MARIO_BLACK);
  if (Math.floor(animTime / 500) % 2 === 0) {
    drawPixelText('PRESS SPACE TO PLAY AGAIN', canvas.width / 2, 450, 15, '#FFFFFF', MARIO_BLACK);
  }
}

function drawPaused() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawPixelText('PAUSED', canvas.width / 2, canvas.height / 2 - 15, 38, '#FFD700', MARIO_BLACK);
  drawPixelText('PRESS P TO RESUME', canvas.width / 2, canvas.height / 2 + 35, 15, '#FFFFFF', MARIO_BLACK);
}

// ====================== PHYSICS ======================
function updateMovingBricks() {
  bricks.forEach(b => { if (b.alive && b.type === 3) b.x = b.baseX + Math.sin(animTime * b.moveSpeed + b.movePhase) * b.moveRange; });
}

function checkBrickCollision(ball) {
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const bx = brick.x, by = brick.y, bw = brick.w, bh = brick.h, cx = ball.x, cy = ball.y, r = ball.r;
    const closestX = clamp(cx, bx, bx + bw), closestY = clamp(cy, by, by + bh);
    const dx = cx - closestX, dy = cy - closestY;
    if (dx * dx + dy * dy < r * r) {
      if ((r - Math.abs(dx)) < (r - Math.abs(dy))) ball.dx = -ball.dx; else ball.dy = -ball.dy;
      brick.hp--;
      if (brick.hp <= 0) {
        brick.alive = false;
        const col = brick.type === 2 ? MARIO_GOLD : (brick.type === 3 ? MARIO_PIPE_GREEN : brick.color.fill);
        spawnParticles(bx + bw / 2, by + bh / 2, col, 20, 5);
        const pts = brick.type === 2 ? 20 : 10; score += pts; comboCount++;
        if (comboCount > 1) { const bonus = comboCount * 2; score += bonus; spawnScorePopup(bx + bw / 2, by - 5, '+' + bonus, bonus > 10 ? '#FF6B35' : '#FFD700'); }
        if (Math.random() < 0.3) { coinSpawns.push({ x: bx + bw / 2, y: by, vy: -3, vx: rand(-1, 1), life: 25, maxLife: 25, size: 8 }); score += 5; SoundManager.coinCollect(); }
        spawnPowerup(bx + bw / 2, by + bh / 2);
        if (brick.type === 2) SoundManager.hardBrickBreak(); else SoundManager.brickBreak();
      } else { spawnParticles(bx + bw / 2, by + bh / 2, '#ffa500', 6, 2); shakeX = 3; shakeY = 1.5; SoundManager.hardBrickHit(); }
      return true;
    }
  }
  return false;
}

function checkPaddleCollision(ball) {
  const px = paddleX, py = canvas.height - PADDLE_H, bx = ball.x, by = ball.y, r = ball.r;
  if (by + r > py && by - r < py + PADDLE_H && bx + r > px && bx - r < px + paddleW) {
    const hitPos = ((bx - px) / paddleW) * 2 - 1, angle = hitPos * Math.PI / 3;
    const spd = effects.slow ? BALL_SPEED * 0.5 : BALL_SPEED;
    ball.dx = Math.sin(angle) * spd; ball.dy = -Math.cos(angle) * spd;
    if (ball.dy > -0.5) ball.dy = -Math.abs(ball.dy);
    ball.y = py - r;
    SoundManager.paddleHit();
    spawnParticles(bx, py, '#7FBF5A', 3, 1.5);
    return true;
  }
  return false;
}

function updateBall(ball) {
  const spdMult = effects.slow ? 0.5 : 1;
  const raw = Math.hypot(ball.dx, ball.dy);
  if (raw > 0) { const target = BALL_SPEED * spdMult; const r = target / raw; ball.dx *= r; ball.dy *= r; }
  ball.x += ball.dx; ball.y += ball.dy;
  if (ball.x + ball.r > canvas.width) { ball.x = canvas.width - ball.r; ball.dx = -Math.abs(ball.dx); SoundManager.wallBounce(); }
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx = Math.abs(ball.dx); SoundManager.wallBounce(); }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy = Math.abs(ball.dy); SoundManager.wallBounce(); }
  checkBrickCollision(ball); checkPaddleCollision(ball);
  ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 15) ball.trail.shift();
}

// ====================== GAME LOGIC ======================
function update() {
  animTime = performance.now(); frameCount++;
  if (shakeX > 0) shakeX *= 0.85; if (shakeY > 0) shakeY *= 0.85;
  if (shakeX < 0.1) shakeX = 0; if (shakeY < 0.1) shakeY = 0;
  if (state === 'MENU') { if (keys.space) startGame(); return; }
  if (state === 'LEVEL_INTRO') { if (Date.now() - levelIntroTimer > 2000) { state = 'PLAYING'; if (balls.length === 0) initBall(); } return; }
  if (state === 'GAME_OVER') { gameOverTimer++; if (keys.space && gameOverTimer > 60) startGame(); return; }
  if (state === 'WIN') { if (keys.space) startGame(); return; }
  if (state === 'PAUSED') return;
  updateMovingBricks();
  balls.forEach(updateBall); balls = balls.filter(b => b.y < canvas.height + 50);
  if (balls.length === 0) {
    lives--;
    if (lives <= 0) { state = 'GAME_OVER'; gameOverTimer = 0; SoundManager.gameOver(); return; }
    else { initBall(); state = 'LEVEL_INTRO'; levelIntroTimer = Date.now(); SoundManager.lifeLost(); return; }
  }
  if (keys.right && paddleX < canvas.width - paddleW) paddleX += PADDLE_SPEED;
  if (keys.left && paddleX > 0) paddleX -= PADDLE_SPEED;
  powerups.forEach(pu => {
    pu.y += pu.vy;
    if (pu.y + pu.h > canvas.height - PADDLE_H && pu.y < canvas.height && pu.x + pu.w > paddleX && pu.x < paddleX + paddleW) {
      activatePowerup(pu.type.id); spawnParticles(pu.x + pu.w / 2, pu.y + pu.h / 2, pu.type.color, 12, 4); pu.collected = true;
    }
  });
  powerups = powerups.filter(pu => pu.y < canvas.height + 20 && !pu.collected);
  if (effects.extend) { effects.extendTimer -= 16; if (effects.extendTimer <= 0) { effects.extend = false; paddleW = effects.shrink ? PADDLE_SHRUNK_W : PADDLE_DEFAULT_W; if (paddleX + paddleW > canvas.width) paddleX = canvas.width - paddleW; } }
  if (effects.shrink) { effects.shrinkTimer -= 16; if (effects.shrinkTimer <= 0) { effects.shrink = false; paddleW = effects.extend ? PADDLE_EXTENDED_W : PADDLE_DEFAULT_W; if (paddleX + paddleW > canvas.width) paddleX = canvas.width - paddleW; } }
  if (effects.slow) { effects.slowTimer -= 16; if (effects.slowTimer <= 0) effects.slow = false; }
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += p.gravity || 0.1; p.life--; });
  particles = particles.filter(p => p.life > 0);
  coinSpawns.forEach(c => { c.x += c.vx; c.y += c.vy; c.vy += 0.2; c.life--; });
  coinSpawns = coinSpawns.filter(c => c.life > 0);
  const remaining = bricks.filter(b => b.alive);
  if (remaining.length === 0) {
    if (currentLevel < LEVELS.length - 1) {
      currentLevel++; initLevel(currentLevel); state = 'LEVEL_INTRO'; levelIntroTimer = Date.now(); balls = []; SoundManager.levelComplete();
    } else { state = 'WIN'; SoundManager.victory(); }
  }
}

// ====================== MAIN DRAW ======================
function draw() {
  ctx.save();
  if (shakeX > 0.1 || shakeY > 0.1) ctx.translate((Math.random() - 0.5) * shakeX, (Math.random() - 0.5) * shakeY);
  ctx.clearRect(-5, -5, canvas.width + 10, canvas.height + 10);
  switch (state) {
    case 'MENU': drawMenu(); break;
    case 'LEVEL_INTRO': drawLevelIntro(); break;
    case 'PLAYING': case 'PAUSED':
      drawBackground(); drawBricks(); drawPowerups(); drawCoinSpawns();
      balls.forEach(ball => drawFireBall(ball));
      drawPaddle(); drawParticles(); drawUI();
      if (state === 'PAUSED') drawPaused();
      break;
    case 'GAME_OVER': drawBackground(); drawBricks(); drawPaddle(); drawUI(); drawGameOver(); break;
    case 'WIN': drawBackground(); drawWin(); break;
  }
  ctx.restore();
}

// ====================== GAME LOOP ======================
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

// ====================== MANAGEMENT ======================
function startGame() {
  state = 'LEVEL_INTRO'; levelIntroTimer = Date.now();
  currentLevel = 0; score = 0; lives = 3; comboCount = 0;
  effects.extend = false; effects.extendTimer = 0; effects.slow = false; effects.slowTimer = 0; effects.shrink = false; effects.shrinkTimer = 0;
  paddleW = PADDLE_DEFAULT_W; paddleX = (canvas.width - paddleW) / 2;
  initLevel(0); balls = []; keys.space = false;
}

// ====================== INPUT ======================
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'Right') keys.right = true;
  if (e.key === 'ArrowLeft' || e.key === 'Left') keys.left = true;
  if (e.key === ' ' || e.key === 'Space') {
    e.preventDefault();
    SoundManager._ensure();
    if (state === 'MENU' || state === 'WIN' || (state === 'GAME_OVER' && gameOverTimer > 60)) {
      startGame();
    } else {
      keys.space = true;
    }
  }
  if ((e.key === 'p' || e.key === 'P') && state === 'PLAYING') state = 'PAUSED';
  else if ((e.key === 'p' || e.key === 'P') && state === 'PAUSED') state = 'PLAYING';
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowRight' || e.key === 'Right') keys.right = false;
  if (e.key === 'ArrowLeft' || e.key === 'Left') keys.left = false;
  if (e.key === ' ' || e.key === 'Space') keys.space = false;
});
// Mouse control
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width;
  const mx = (e.clientX - rect.left) * scaleX;
  if (state === 'PLAYING' || state === 'PAUSED') paddleX = clamp(mx - paddleW / 2, 0, canvas.width - paddleW);
});
// Touch control
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect(), scaleX = canvas.width / rect.width;
  const tx = (e.touches[0].clientX - rect.left) * scaleX;
  if (state === 'PLAYING' || state === 'PAUSED') paddleX = clamp(tx - paddleW / 2, 0, canvas.width - paddleW);
}, { passive: false });

function resizeCanvas() {
  const maxW = window.innerWidth - 140, maxH = window.innerHeight - 190;
  const s = Math.min(1, maxW / 800, maxH / 600);
  canvas.style.width = (800 * s) + 'px'; canvas.style.height = (600 * s) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

gameLoop();
