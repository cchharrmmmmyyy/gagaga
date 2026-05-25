/**
 * NEON BREAKOUT - Modern visual style
 * A Breakout game with level system and power-ups
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ====================== CONSTANTS ======================
const PADDLE_DEFAULT_W = 110;
const PADDLE_EXTENDED_W = 180;
const PADDLE_H = 14;
const PADDLE_RADIUS = 7;
const BALL_R = 8;
const BALL_SPEED = 3.5;
const PADDLE_SPEED = 4.5;
const POWERUP_SIZE = 22;
const POWERUP_FALL_SPEED = 1.5;
const POWERUP_DROP_CHANCE = 0.18;
const EXTEND_DURATION = 10000;
const SLOW_DURATION = 8000;
const BRICK_W = 78;
const BRICK_H = 24;
const BRICK_PAD = 8;
const BRICK_RADIUS = 6;
const OFFSET_TOP = 80;

// ====================== BRICK COLOR SCHEMES ======================
const BRICK_COLORS = [
  { fill: '#FF6B6B', glow: '#ff3355', highlight: '#ff9999' },
  { fill: '#FFA94D', glow: '#ff8800', highlight: '#ffcc88' },
  { fill: '#FFD43B', glow: '#ffcc00', highlight: '#ffe888' },
  { fill: '#69DB7C', glow: '#22cc44', highlight: '#a8f0b8' },
  { fill: '#4DABF7', glow: '#2288ff', highlight: '#88ccff' },
  { fill: '#9775FA', glow: '#7744ff', highlight: '#bbaaff' },
  { fill: '#F783AC', glow: '#ff4499', highlight: '#ffb3cc' },
  { fill: '#20C997', glow: '#00cc88', highlight: '#88eebb' }
];

const HARD_BRICK_COLOR = { fill: '#e0e0e0', glow: '#ffffff', highlight: '#ffffff' };
const HARD_BRICK_CRACKED = [
  { fill: '#b0b0b0', glow: '#cccccc', highlight: '#dddddd' },
  { fill: '#888888', glow: '#aaaaaa', highlight: '#bbbbbb' }
];

// ====================== LEVELS ======================
const LEVELS = [
  {
    name: 'STAGE 1',
    subtitle: 'BASIC TRAINING',
    cols: 6, rows: 4,
    layout: [
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1]
    ]
  },
  {
    name: 'STAGE 2',
    subtitle: 'HARDENED TARGETS',
    cols: 7, rows: 4,
    layout: [
      [2,2,2,2,2,2,2],
      [2,1,1,1,1,1,2],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1]
    ]
  },
  {
    name: 'STAGE 3',
    subtitle: 'ANOMALY ZONE',
    cols: 8, rows: 5,
    layout: [
      [2,2,2,2,2,2,2,2],
      [1,1,1,1,1,1,1,1],
      [3,3,3,3,3,3,3,3],
      [1,1,3,1,1,3,1,1],
      [1,1,1,1,1,1,1,1]
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
let starField = [];

let effects = {
  extend: false, extendTimer: 0,
  slow: false, slowTimer: 0
};

let levelIntroTimer = 0;
let animTime = 0;
let gameOverTimer = 0;
let frameCount = 0;
let shakeX = 0, shakeY = 0;

const keys = { right: false, left: false, space: false };

// ====================== STARFIELD ======================
function initStars() {
  starField = [];
  for (let i = 0; i < 120; i++) {
    starField.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.85,
      size: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.5 + 0.1,
      phase: Math.random() * Math.PI * 2,
      brightness: Math.random() * 0.5 + 0.3
    });
  }
}
initStars();

// ====================== UTILITY ======================
function rand(min, max) { return Math.random() * (max - min) + min; }
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ====================== BALL ======================
function createBall(x, y, dx, dy) {
  return { x, y, dx, dy, r: BALL_R, trail: [] };
}

function initBall() {
  const angle = -Math.PI / 2 + rand(-0.25, 0.25);
  const speed = effects.slow ? BALL_SPEED * 0.5 : BALL_SPEED;
  balls = [createBall(
    canvas.width / 2,
    canvas.height - 56,
    Math.cos(angle) * speed,
    Math.sin(angle) * speed
  )];
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
      const x = offsetX + c * (BRICK_W + BRICK_PAD);
      const y = OFFSET_TOP + r * (BRICK_H + BRICK_PAD);
      const hp = type === 2 ? 2 : 1;
      const colorIdx = r % BRICK_COLORS.length;
      bricks.push({
        x, y, w: BRICK_W, h: BRICK_H,
        type, hp, maxHp: hp,
        alive: true,
        color: type === 2 ? HARD_BRICK_COLOR : BRICK_COLORS[colorIdx],
        // Moving brick
        baseX: x,
        moveRange: type === 3 ? rand(28, 45) : 0,
        moveSpeed: rand(0.012, 0.025),
        movePhase: rand(0, Math.PI * 2)
      });
    }
  }
  powerups = [];
  particles = [];
}

// ====================== POWER-UPS ======================
const POWERUP_TYPES = [
  { id: 'extend', color: '#FF6B35', glow: '#ff4400', symbol: 'W', label: 'WIDE' },
  { id: 'multi',  color: '#00D4FF', glow: '#0088ff', symbol: 'M', label: 'MULTI' },
  { id: 'slow',   color: '#39FF14', glow: '#00cc00', symbol: 'S', label: 'SLOW' }
];

function spawnPowerup(x, y) {
  if (Math.random() > POWERUP_DROP_CHANCE) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  powerups.push({
    x: x - POWERUP_SIZE / 2, y: y - POWERUP_SIZE / 2,
    w: POWERUP_SIZE, h: POWERUP_SIZE,
    type, vy: POWERUP_FALL_SPEED,
    bob: rand(0, Math.PI * 2)
  });
}

function activatePowerup(id) {
  switch (id) {
    case 'extend':
      effects.extend = true; effects.extendTimer = EXTEND_DURATION;
      paddleW = PADDLE_EXTENDED_W;
      break;
    case 'multi':
      if (balls.length === 1) {
        const b = balls[0];
        const spd = Math.hypot(b.dx, b.dy);
        const a = Math.atan2(b.dy, b.dx);
        for (let i = -1; i <= 1; i += 2) {
          const na = a + i * 0.3;
          balls.push(createBall(b.x, b.y, Math.cos(na) * spd, Math.sin(na) * spd));
        }
        comboCount = 0;
      }
      break;
    case 'slow':
      effects.slow = true; effects.slowTimer = SLOW_DURATION;
      balls.forEach(b => {
        const spd = Math.hypot(b.dx, b.dy);
        if (spd > BALL_SPEED * 0.5) {
          const r = (BALL_SPEED * 0.5) / spd;
          b.dx *= r; b.dy *= r;
        }
      });
      break;
  }
}

// ====================== PARTICLES ======================
function spawnParticles(x, y, color, count, spread) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(1, spread || 4);
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
      life: rand(20, 50), maxLife: 50,
      size: rand(2, 5), color,
      gravity: 0.08
    });
  }
}

function spawnScorePopup(x, y, text) {
  particles.push({
    x, y, vx: 0, vy: -2, life: 40, maxLife: 40,
    size: 0, color: '#FFD700',
    isText: true, text, gravity: 0
  });
}

// ====================== DRAWING ======================
function drawBackground() {
  // Deep gradient
  const grad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height * 0.3, 0,
    canvas.width / 2, canvas.height * 0.3, canvas.height * 0.8
  );
  grad.addColorStop(0, '#1a1a3e');
  grad.addColorStop(0.3, '#0f0f2a');
  grad.addColorStop(0.7, '#080818');
  grad.addColorStop(1, '#04040e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Stars
  starField.forEach(star => {
    const twinkle = Math.sin(animTime * 0.001 * star.speed + star.phase) * 0.4 + 0.6;
    const alpha = star.brightness * twinkle;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawBricks() {
  bricks.forEach(brick => {
    if (!brick.alive) return;
    const { x, y, w, h } = brick;
    const isHard = brick.type === 2;
    const isDamaged = isHard && brick.hp < brick.maxHp;

    // Glow
    const glowColor = isDamaged ? '#88888844' : (brick.color.glow + '33');
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    // Fill
    let fillColor = brick.color.fill;
    if (isDamaged) {
      fillColor = '#999999';
    }
    drawRoundedRect(x, y, w, h, BRICK_RADIUS);

    const grad = ctx.createLinearGradient(x, y, x, y + h * 0.4);
    grad.addColorStop(0, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0.02)');

    ctx.fillStyle = fillColor;
    ctx.fill();

    // Border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top highlight
    ctx.fillStyle = grad;
    drawRoundedRect(x + 3, y + 2, w - 6, h * 0.35, BRICK_RADIUS - 2);
    ctx.fill();

    // Bottom glow line
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 4, y + h - 3, w - 8, 1);

    // Hard brick damage cracks
    if (isDamaged) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 6); ctx.lineTo(x + 18, y + 16); ctx.lineTo(x + 14, y + h - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w - 10, y + 5); ctx.lineTo(x + w - 18, y + 15); ctx.lineTo(x + w - 12, y + h - 5);
      ctx.stroke();
    }

    // Moving brick indicator
    if (brick.type === 3) {
      const pulse = Math.sin(animTime * 0.004 + x * 0.05) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.15})`;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
  });
  ctx.shadowBlur = 0;
}

function drawPaddle() {
  const x = paddleX, y = canvas.height - PADDLE_H;

  // Glow
  ctx.shadowColor = 'rgba(100, 180, 255, 0.3)';
  ctx.shadowBlur = 18;

  // Body gradient
  drawRoundedRect(x, y, paddleW, PADDLE_H, PADDLE_RADIUS);
  const grad = ctx.createLinearGradient(x, y, x, y + PADDLE_H);
  grad.addColorStop(0, '#7ec8ff');
  grad.addColorStop(0.3, '#4dabf7');
  grad.addColorStop(0.7, '#2d8fd5');
  grad.addColorStop(1, '#1a6aa8');
  ctx.fillStyle = grad;
  ctx.fill();

  // Border glow
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  drawRoundedRect(x + 4, y + 2, paddleW - 8, PADDLE_H * 0.35, PADDLE_RADIUS - 1);
  ctx.fill();

  // Center accent
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + paddleW / 2 - 15, y + 3, 30, PADDLE_H - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x + paddleW / 2 - 1, y + 3, 2, PADDLE_H - 6);

  // Edge markers
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x + 6, y + PADDLE_H / 2 - 3, 4, 6);
  ctx.fillRect(x + paddleW - 10, y + PADDLE_H / 2 - 3, 4, 6);

  ctx.shadowBlur = 0;
}

function drawBall(ball) {
  const { x, y, r } = ball;

  // Outer glow
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
  grad.addColorStop(0, 'rgba(100, 200, 255, 0.15)');
  grad.addColorStop(0.3, 'rgba(100, 200, 255, 0.08)');
  grad.addColorStop(1, 'rgba(100, 200, 255, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Core glow
  ctx.shadowColor = '#4dabf7';
  ctx.shadowBlur = 20;
  const core = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.2, '#b3e0ff');
  core.addColorStop(0.6, '#4dabf7');
  core.addColorStop(1, '#1a6aa8');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPowerups() {
  powerups.forEach(pu => {
    const cx = pu.x + pu.w / 2;
    const cy = pu.y + pu.h / 2 + Math.sin(animTime * 0.003 + pu.bob) * 2;

    // Glow
    ctx.shadowColor = pu.type.glow;
    ctx.shadowBlur = 15;

    // Hexagon shape
    const r = pu.w / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, pu.type.color);
    grad.addColorStop(1, pu.type.color + '99');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Symbol
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.type.symbol, cx, cy + 1);
  });
  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    if (p.isText) {
      ctx.fillStyle = p.color;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + 0.5 * alpha);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  });
  ctx.globalAlpha = 1;
}

function drawUI() {
  // Top bar background
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  drawRoundedRect(10, 8, 200, 44, 8);
  ctx.fill();
  drawRoundedRect(canvas.width - 210, 8, 200, 44, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  drawRoundedRect(10, 8, 200, 44, 8);
  ctx.stroke();
  drawRoundedRect(canvas.width - 210, 8, 200, 44, 8);
  ctx.stroke();

  // Score
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SCORE', 22, 16);
  ctx.fillStyle = '#fff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fontWeight = '300';
  ctx.fillText(String(score).padStart(6, '0'), 22, 30);

  // Stage
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(LEVELS[currentLevel].name, canvas.width / 2, 14);

  // Lives
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('LIVES', canvas.width - 22, 16);
  for (let i = 0; i < lives; i++) {
    const lx = canvas.width - 24 - i * 24;
    const ly = 33;
    ctx.shadowColor = 'rgba(255,100,100,0.3)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(lx - 1.5, ly - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active effects
  let ey = 60;
  if (effects.extend) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    drawRoundedRect(10, ey, 80, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#FF6B35';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WIDE', 16, ey + 6);
    const pct = effects.extendTimer / EXTEND_DURATION;
    ctx.fillStyle = 'rgba(255,107,53,0.2)';
    drawRoundedRect(48, ey + 5, 36, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#FF6B35';
    drawRoundedRect(48, ey + 5, 36 * pct, 10, 3);
    ctx.fill();
    ey += 26;
  }
  if (effects.slow) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    drawRoundedRect(10, ey, 80, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#39FF14';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SLOW', 16, ey + 6);
    const pct = effects.slowTimer / SLOW_DURATION;
    ctx.fillStyle = 'rgba(57,255,20,0.2)';
    drawRoundedRect(48, ey + 5, 36, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#39FF14';
    drawRoundedRect(48, ey + 5, 36 * pct, 10, 3);
    ctx.fill();
  }
}

// ====================== SCREENS ======================
function drawMenu() {
  drawBackground();

  // Center panel
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  drawRoundedRect(canvas.width / 2 - 220, 100, 440, 400, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  drawRoundedRect(canvas.width / 2 - 220, 100, 440, 400, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.shadowColor = 'rgba(77, 171, 247, 0.3)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#4dabf7';
  ctx.font = '300 42px system-ui, sans-serif';
  ctx.fillText('NEON', canvas.width / 2, 175);
  ctx.fillStyle = '#fff';
  ctx.font = '300 38px system-ui, sans-serif';
  ctx.fillText('BREAKOUT', canvas.width / 2, 225);
  ctx.shadowBlur = 0;

  // Decorative line
  const lineGrad = ctx.createLinearGradient(canvas.width / 2 - 120, 0, canvas.width / 2 + 120, 0);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.5, 'rgba(77,171,247,0.3)');
  lineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(canvas.width / 2 - 120, 253, 240, 1);

  // Controls
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('← →  Move', canvas.width / 2, 310);
  ctx.fillText('Space  Launch', canvas.width / 2, 340);
  ctx.fillText('P  Pause', canvas.width / 2, 370);

  // Start
  if (Math.floor(animTime / 600) % 2 === 0) {
    ctx.shadowColor = 'rgba(57, 255, 20, 0.3)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#39FF14';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('[ PRESS SPACE TO START ]', canvas.width / 2, 450);
    ctx.shadowBlur = 0;
  }
}

function drawLevelIntro() {
  drawBackground();
  drawBricks();

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(77, 171, 247, 0.3)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#4dabf7';
  ctx.font = '300 36px system-ui, sans-serif';
  ctx.fillText(LEVELS[currentLevel].name, canvas.width / 2, 210);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(LEVELS[currentLevel].subtitle, canvas.width / 2, 260);

  // Legend
  const ly = 340;
  ctx.font = '12px system-ui, sans-serif';

  ctx.fillStyle = BRICK_COLORS[0].fill;
  drawRoundedRect(canvas.width / 2 - 130, ly - 12, 28, 20, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  drawRoundedRect(canvas.width / 2 - 130, ly - 12, 28, 20, 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText('Normal Brick', canvas.width / 2 - 94, ly + 3);

  ctx.fillStyle = '#b0b0b0';
  drawRoundedRect(canvas.width / 2 + 30, ly - 12, 28, 20, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  drawRoundedRect(canvas.width / 2 + 30, ly - 12, 28, 20, 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText('Hard Brick', canvas.width / 2 + 66, ly + 3);

  if (currentLevel >= 2) {
    const ly2 = ly + 40;
    const col = BRICK_COLORS[2 % BRICK_COLORS.length];
    ctx.fillStyle = col.fill;
    drawRoundedRect(canvas.width / 2 - 130, ly2 - 12, 28, 20, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    drawRoundedRect(canvas.width / 2 - 130, ly2 - 12, 28, 20, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Moving Brick', canvas.width / 2 - 94, ly2 + 3);
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(255, 50, 50, 0.4)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff3355';
  ctx.font = '300 44px system-ui, sans-serif';
  ctx.fillText('GAME OVER', canvas.width / 2, 240);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Final Score', canvas.width / 2, 310);
  ctx.fillStyle = '#FFD700';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText(String(score).padStart(6, '0'), canvas.width / 2, 350);

  if (Math.floor(animTime / 500) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Press SPACE to restart', canvas.width / 2, 430);
  }
}

function drawWin() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#FFD700';
  ctx.font = '300 40px system-ui, sans-serif';
  ctx.fillText('VICTORY!', canvas.width / 2, 220);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('All Stages Cleared', canvas.width / 2, 280);
  ctx.fillText('Final Score', canvas.width / 2, 340);
  ctx.fillStyle = '#FFD700';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText(String(score).padStart(6, '0'), canvas.width / 2, 380);

  if (Math.floor(animTime / 500) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Press SPACE to play again', canvas.width / 2, 460);
  }
}

function drawPaused() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '300 32px system-ui, sans-serif';
  ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Press P to resume', canvas.width / 2, canvas.height / 2 + 35);
}

// ====================== PHYSICS ======================
function updateMovingBricks() {
  bricks.forEach(brick => {
    if (!brick.alive || brick.type !== 3) return;
    brick.x = brick.baseX + Math.sin(animTime * brick.moveSpeed + brick.movePhase) * brick.moveRange;
  });
}

function checkBrickCollision(ball) {
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const bx = brick.x, by = brick.y, bw = brick.w, bh = brick.h;
    const cx = ball.x, cy = ball.y, r = ball.r;

    const closestX = clamp(cx, bx, bx + bw);
    const closestY = clamp(cy, by, by + bh);
    const dx = cx - closestX, dy = cy - closestY;

    if (dx * dx + dy * dy < r * r) {
      const overlapX = r - Math.abs(dx);
      const overlapY = r - Math.abs(dy);

      if (overlapX < overlapY) ball.dx = -ball.dx;
      else ball.dy = -ball.dy;

      brick.hp--;
      if (brick.hp <= 0) {
        brick.alive = false;
        const col = brick.type === 2 ? '#c0c0c0' : brick.color.fill;
        spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, col, 14, 5);

        const points = brick.type === 2 ? 20 : 10;
        score += points;
        comboCount++;
        if (comboCount > 1) {
          const bonus = comboCount * 2;
          score += bonus;
          spawnScorePopup(brick.x + brick.w / 2, brick.y - 5, '+' + bonus);
        }
        spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
      } else {
        spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, '#ffa500', 5, 2);
        shakeX = 2; shakeY = 1;
      }
      return true;
    }
  }
  return false;
}

function checkPaddleCollision(ball) {
  const px = paddleX, py = canvas.height - PADDLE_H;
  const bx = ball.x, by = ball.y, r = ball.r;

  if (by + r > py && by - r < py + PADDLE_H &&
      bx + r > px && bx - r < px + paddleW) {
    const hitPos = ((bx - px) / paddleW) * 2 - 1;
    const angle = hitPos * Math.PI / 3;
    const speed = Math.hypot(ball.dx, ball.dy);
    ball.dx = Math.sin(angle) * speed;
    ball.dy = -Math.cos(angle) * speed;
    if (ball.dy > -1) ball.dy = -Math.abs(ball.dy);
    ball.y = py - r;
    return true;
  }
  return false;
}

function updateBall(ball) {
  const speedMult = effects.slow ? 0.5 : 1;
  const rawSpeed = Math.hypot(ball.dx, ball.dy);
  if (rawSpeed > 0) {
    const targetSpeed = BALL_SPEED * speedMult;
    const ratio = targetSpeed / rawSpeed;
    ball.dx *= ratio; ball.dy *= ratio;
  }

  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall bounce
  if (ball.x + ball.r > canvas.width) { ball.x = canvas.width - ball.r; ball.dx = -Math.abs(ball.dx); }
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx = Math.abs(ball.dx); }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy = Math.abs(ball.dy); }

  checkBrickCollision(ball);
  checkPaddleCollision(ball);

  // Trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 12) ball.trail.shift();
}

// ====================== GAME LOGIC ======================
function update() {
  animTime = Date.now();
  frameCount++;

  if (shakeX > 0) shakeX *= 0.85;
  if (shakeY > 0) shakeY *= 0.85;
  if (shakeX < 0.1) shakeX = 0;
  if (shakeY < 0.1) shakeY = 0;

  if (state === 'MENU') {
    if (keys.space) { startGame(); }
    return;
  }

  if (state === 'LEVEL_INTRO') {
    if (Date.now() - levelIntroTimer > 2000) {
      state = 'PLAYING';
      if (balls.length === 0) initBall();
    }
    return;
  }

  if (state === 'GAME_OVER') {
    gameOverTimer++;
    if (keys.space && gameOverTimer > 60) { startGame(); }
    return;
  }

  if (state === 'WIN') {
    if (keys.space) { startGame(); }
    return;
  }

  if (state === 'PAUSED') return;

  // ===== PLAYING =====
  updateMovingBricks();

  balls.forEach(updateBall);
  balls = balls.filter(b => b.y < canvas.height + 50);

  if (balls.length === 0) {
    lives--;
    if (lives <= 0) { state = 'GAME_OVER'; gameOverTimer = 0; return; }
    else { initBall(); state = 'LEVEL_INTRO'; levelIntroTimer = Date.now(); return; }
  }

  if (keys.right && paddleX < canvas.width - paddleW) paddleX += PADDLE_SPEED;
  if (keys.left && paddleX > 0) paddleX -= PADDLE_SPEED;

  // Power-ups
  powerups.forEach(pu => {
    pu.y += pu.vy;
    if (pu.y + pu.h > canvas.height - PADDLE_H &&
        pu.y < canvas.height &&
        pu.x + pu.w > paddleX &&
        pu.x < paddleX + paddleW) {
      activatePowerup(pu.type.id);
      spawnParticles(pu.x + pu.w / 2, pu.y + pu.h / 2, pu.type.color, 10, 3);
      pu.collected = true;
    }
  });
  powerups = powerups.filter(pu => pu.y < canvas.height + 20 && !pu.collected);

  // Effects timers
  if (effects.extend) {
    effects.extendTimer -= 16;
    if (effects.extendTimer <= 0) {
      effects.extend = false;
      paddleW = PADDLE_DEFAULT_W;
      if (paddleX + paddleW > canvas.width) paddleX = canvas.width - paddleW;
    }
  }
  if (effects.slow) {
    effects.slowTimer -= 16;
    if (effects.slowTimer <= 0) effects.slow = false;
  }

  // Particles
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += p.gravity || 0.1;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);

  // Level complete
  const remaining = bricks.filter(b => b.alive);
  if (remaining.length === 0) {
    if (currentLevel < LEVELS.length - 1) {
      currentLevel++;
      initLevel(currentLevel);
      state = 'LEVEL_INTRO';
      levelIntroTimer = Date.now();
      balls = [];
    } else {
      state = 'WIN';
    }
  }
}

// ====================== MAIN DRAW ======================
function draw() {
  ctx.save();

  // Screen shake
  if (shakeX > 0.1 || shakeY > 0.1) {
    ctx.translate(
      (Math.random() - 0.5) * shakeX,
      (Math.random() - 0.5) * shakeY
    );
  }

  ctx.clearRect(-5, -5, canvas.width + 10, canvas.height + 10);

  switch (state) {
    case 'MENU': drawMenu(); break;
    case 'LEVEL_INTRO': drawLevelIntro(); break;
    case 'PLAYING':
    case 'PAUSED':
      drawBackground();
      drawBricks();
      drawPowerups();
      // Ball trail
      balls.forEach(ball => {
        for (let i = 0; i < ball.trail.length - 1; i++) {
          const t = ball.trail[i];
          const alpha = (i / ball.trail.length) * 0.2;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#4dabf7';
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.r * (0.3 + 0.7 * i / ball.trail.length), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
      drawPaddle();
      balls.forEach(drawBall);
      drawParticles();
      drawUI();
      if (state === 'PAUSED') drawPaused();
      break;
    case 'GAME_OVER':
      drawBackground();
      drawBricks();
      drawPaddle();
      drawUI();
      drawGameOver();
      break;
    case 'WIN':
      drawBackground();
      drawWin();
      break;
  }

  ctx.restore();
}

// ====================== GAME LOOP ======================
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ====================== MANAGEMENT ======================
function startGame() {
  state = 'LEVEL_INTRO';
  levelIntroTimer = Date.now();
  currentLevel = 0; score = 0; lives = 3; comboCount = 0;
  effects.extend = false; effects.slow = false;
  paddleW = PADDLE_DEFAULT_W;
  paddleX = (canvas.width - paddleW) / 2;
  initLevel(0);
  balls = [];
  keys.space = false;
}

// ====================== INPUT ======================
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'Right') keys.right = true;
  if (e.key === 'ArrowLeft' || e.key === 'Left') keys.left = true;
  if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); keys.space = true; }
  if ((e.key === 'p' || e.key === 'P') && state === 'PLAYING') state = 'PAUSED';
  else if ((e.key === 'p' || e.key === 'P') && state === 'PAUSED') state = 'PLAYING';
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowRight' || e.key === 'Right') keys.right = false;
  if (e.key === 'ArrowLeft' || e.key === 'Left') keys.left = false;
  if (e.key === ' ' || e.key === 'Space') keys.space = false;
});

function resizeCanvas() {
  const maxW = window.innerWidth - 80;
  const maxH = window.innerHeight - 120;
  const scale = Math.min(1, maxW / 800, maxH / 600);
  canvas.style.width = (800 * scale) + 'px';
  canvas.style.height = (600 * scale) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

gameLoop();
