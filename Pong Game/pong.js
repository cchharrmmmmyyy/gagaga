/**
 * Pixel Pong Adventure
 * Original pixel-platform arena Pong with quest levels, versus mode, power-ups,
 * skills, arena hazards, and a boss round.
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

const STATE = {
  MENU: 'MENU',
  MODE_SELECT: 'MODE_SELECT',
  INTRO: 'INTRO',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  ROUND_OVER: 'ROUND_OVER',
  GAME_OVER: 'GAME_OVER',
  WIN: 'WIN'
};

const MODE = {
  QUEST: 'QUEST',
  VERSUS: 'VERSUS'
};

const PAL = {
  black: '#05070d',
  ink: '#101018',
  white: '#fff6ce',
  sky: '#5cc8ff',
  sky2: '#8fe8ff',
  panel: '#17213d',
  red: '#e23b2f',
  redDark: '#7b241d',
  green: '#39b54a',
  greenDark: '#188a3a',
  dirt: '#b86b32',
  dirtDark: '#74421f',
  brick: '#c84a2f',
  brickLight: '#f08342',
  coin: '#ffd447',
  coinDark: '#c78300',
  pipe: '#2ab84a',
  pipeDark: '#0d7a30',
  water: '#2aa8e8',
  cave: '#252044',
  cave2: '#4b3d6f',
  castle: '#707680',
  lava: '#ff6a21',
  blue: '#2775d1',
  purple: '#7a4bd6',
  cyan: '#31e2e8'
};

const LEVELS = [
  {
    id: 'grass', name: 'WORLD 1-1', title: 'SUNNY RALLY', theme: 'grass',
    target: 3, ai: 0.56, ball: 245, hazard: 'bricks', powerRate: 8,
    obstacles: [
      { type: 'block', x: 374, y: 142, w: 52, h: 28, hp: 3 },
      { type: 'block', x: 374, y: 230, w: 52, h: 28, hp: 3 }
    ]
  },
  {
    id: 'cave', name: 'WORLD 1-2', title: 'ECHO CAVERN', theme: 'cave',
    target: 4, ai: 0.64, ball: 270, hazard: 'stone', powerRate: 7,
    obstacles: [
      { type: 'bumper', x: 392, y: 104, w: 16, h: 56 },
      { type: 'bumper', x: 392, y: 240, w: 16, h: 56 },
      { type: 'block', x: 364, y: 184, w: 72, h: 32, hp: 4 }
    ]
  },
  {
    id: 'water', name: 'WORLD 1-3', title: 'TIDE COURT', theme: 'water',
    target: 4, ai: 0.68, ball: 285, hazard: 'current', wind: 48, powerRate: 7,
    obstacles: [
      { type: 'gate', x: 386, y: 74, w: 28, h: 72, phase: 0 },
      { type: 'gate', x: 386, y: 254, w: 28, h: 72, phase: Math.PI }
    ]
  },
  {
    id: 'sky', name: 'WORLD 1-4', title: 'CLOUD DUEL', theme: 'sky',
    target: 5, ai: 0.73, ball: 305, hazard: 'clouds', wind: 36, powerRate: 6,
    obstacles: [
      { type: 'moving', x: 358, y: 116, w: 84, h: 18, baseY: 116, range: 58, phase: 0 },
      { type: 'moving', x: 358, y: 266, w: 84, h: 18, baseY: 266, range: 58, phase: Math.PI }
    ]
  },
  {
    id: 'castle', name: 'WORLD 1-5', title: 'EMBER BOSS', theme: 'castle',
    target: 6, ai: 0.82, ball: 325, hazard: 'boss', wind: 0, powerRate: 5,
    boss: true,
    obstacles: [
      { type: 'flame', x: 390, y: 90, w: 20, h: 62, phase: 0 },
      { type: 'flame', x: 390, y: 248, w: 20, h: 62, phase: Math.PI }
    ]
  }
];

const POWERUPS = [
  { id: 'wide', label: 'WIDE', glyph: 'W', color: '#38d66b', duration: 8 },
  { id: 'fast', label: 'FAST', glyph: 'F', color: PAL.lava, duration: 0 },
  { id: 'slow', label: 'SLOW', glyph: 'S', color: '#6ee75d', duration: 5 },
  { id: 'fire', label: 'FIRE', glyph: 'R', color: '#ff8a22', duration: 6 },
  { id: 'shield', label: 'SHLD', glyph: 'D', color: PAL.cyan, duration: 8 },
  { id: 'ghost', label: 'GHOST', glyph: 'G', color: '#b76bff', duration: 5 },
  { id: 'multi', label: 'MULTI', glyph: 'M', color: '#38a8ff', duration: 0 },
  { id: 'coin', label: 'COIN', glyph: 'C', color: PAL.coin, duration: 0 }
];

const input = {
  p1Up: false,
  p1Down: false,
  p2Up: false,
  p2Down: false,
  p1Skill: false,
  p2Skill: false,
  confirm: false,
  pointerActive: false,
  pointerY: H / 2
};

const game = {
  state: STATE.MENU,
  mode: MODE.QUEST,
  levelIndex: 0,
  p1: makePaddle('p1', 26),
  p2: makePaddle('p2', W - 44),
  balls: [],
  powerups: [],
  particles: [],
  obstacles: [],
  score: { p1: 0, p2: 0 },
  rally: 0,
  time: 0,
  stateTime: 0,
  lastTime: 0,
  message: '',
  winner: '',
  shake: 0,
  pausedFrom: STATE.MENU
};

let leaderboardSubmitted = false;

function makePaddle(id, x) {
  return {
    id,
    x,
    y: H / 2 - 46,
    w: 18,
    h: 92,
    baseH: 92,
    speed: 335,
    charge: 0,
    effects: {},
    shield: false,
    isBoss: false
  };
}

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

function setState(next, message = '') {
  game.state = next;
  game.stateTime = 0;
  game.message = message;
  if (next === STATE.GAME_OVER || next === STATE.WIN) submitPongResult(next);
}

function startQuest() {
  game.mode = MODE.QUEST;
  game.levelIndex = 0;
  startLevel();
}

function startVersus() {
  game.mode = MODE.VERSUS;
  game.levelIndex = 0;
  startLevel();
}

function startLevel() {
  leaderboardSubmitted = false;
  const level = currentLevel();
  game.score = { p1: 0, p2: 0 };
  game.rally = 0;
  game.powerups = [];
  game.particles = [];
  game.p1 = makePaddle('p1', 26);
  game.p2 = makePaddle('p2', W - 44);
  game.p2.isBoss = Boolean(level.boss && game.mode === MODE.QUEST);
  if (game.p2.isBoss) {
    game.p2.h = 138;
    game.p2.baseH = 138;
    game.p2.speed = 260;
  }
  game.obstacles = level.obstacles.map(ob => ({ ...ob }));
  resetBall(rand(0, 1) > 0.5 ? 1 : -1);
  setState(STATE.INTRO, level.name);
}

function submitPongResult(finalState) {
  if (leaderboardSubmitted || !window.GagagaPlatform) return;
  leaderboardSubmitted = true;
  const p1Won = finalState === STATE.WIN || game.score.p1 > game.score.p2;
  window.GagagaPlatform.submitScore('pong', {
    result: p1Won ? 'win' : 'loss',
    mode: game.mode,
  }, `pong:${Date.now()}:${game.score.p1}-${game.score.p2}`);
}

function resetBall(dir) {
  const level = currentLevel();
  game.balls = [createBall(W / 2, H / 2, dir * level.ball, rand(-80, 80), level.ball)];
}

function createBall(x, y, vx, vy, baseSpeed) {
  return {
    x, y, vx, vy,
    size: 12,
    baseSpeed,
    fireOwner: null,
    ghost: 0,
    trail: []
  };
}

function serve() {
  setState(STATE.PLAYING);
}

function endRound(winner) {
  game.winner = winner;
  game.score[winner] += 1;
  game.rally = 0;
  clearRoundEffects();
  spawnText(W / 2, 62, winner === 'p1' ? 'P1 SCORES' : opponentName() + ' SCORES', PAL.coin);
  if (game.score[winner] >= currentLevel().target) {
    if (game.mode === MODE.QUEST && winner === 'p1') {
      if (game.levelIndex >= LEVELS.length - 1) setState(STATE.WIN, 'VICTORY');
      else setState(STATE.ROUND_OVER, 'CLEAR');
    } else if (game.mode === MODE.QUEST) {
      setState(STATE.GAME_OVER, 'GAME OVER');
    } else {
      setState(STATE.GAME_OVER, winner === 'p1' ? 'P1 WINS' : 'P2 WINS');
    }
    return;
  }
  resetBall(winner === 'p1' ? 1 : -1);
  setState(STATE.READY, 'READY');
}

function nextLevel() {
  game.levelIndex += 1;
  startLevel();
}

function clearRoundEffects() {
  [game.p1, game.p2].forEach(p => {
    p.h = p.baseH;
    p.effects = {};
    p.shield = false;
  });
}

function opponentName() {
  return game.mode === MODE.VERSUS ? 'P2' : (currentLevel().boss ? 'BOSS' : 'CPU');
}

function update(delta) {
  game.time += delta;
  game.stateTime += delta;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - delta * 18);

  if (input.confirm) {
    input.confirm = false;
    if (game.state === STATE.MENU) setState(STATE.MODE_SELECT);
    else if (game.state === STATE.MODE_SELECT) startQuest();
    else if (game.state === STATE.INTRO || game.state === STATE.READY) serve();
    else if (game.state === STATE.ROUND_OVER) nextLevel();
    else if (game.state === STATE.GAME_OVER || game.state === STATE.WIN) setState(STATE.MENU);
  }

  if (game.state === STATE.INTRO && game.stateTime > 1.45) setState(STATE.READY);
  if (game.state !== STATE.PLAYING) {
    updateParticles(delta);
    return;
  }

  updatePaddles(delta);
  updateAI(delta);
  updateEffects(delta);
  updateObstacles(delta);
  updateBalls(delta);
  updatePowerups(delta);
  updateParticles(delta);
}

function updatePaddles(delta) {
  movePlayer(game.p1, input.p1Up, input.p1Down, delta);
  if (game.mode === MODE.VERSUS) movePlayer(game.p2, input.p2Up, input.p2Down, delta);
  if (input.pointerActive) game.p1.y = input.pointerY - game.p1.h / 2;
  game.p1.y = clamp(game.p1.y, 72, H - game.p1.h - 18);
  game.p2.y = clamp(game.p2.y, 72, H - game.p2.h - 18);

  if (input.p1Skill) {
    input.p1Skill = false;
    useSkill(game.p1, 1);
  }
  if (input.p2Skill) {
    input.p2Skill = false;
    useSkill(game.p2, -1);
  }
}

function movePlayer(paddle, up, down, delta) {
  const dir = Number(down) - Number(up);
  paddle.y += dir * paddle.speed * delta;
}

function updateAI(delta) {
  if (game.mode === MODE.VERSUS) return;
  const level = currentLevel();
  const targetBall = game.balls
    .filter(b => b.vx > 0)
    .sort((a, b) => b.x - a.x)[0] || game.balls[0];
  if (!targetBall) return;
  const bossWave = game.p2.isBoss ? Math.sin(game.time * 2.4) * 42 : 0;
  const target = targetBall.y - game.p2.h / 2 + bossWave;
  const error = game.p2.isBoss ? Math.sin(game.time * 3.7) * 16 : Math.sin(game.time * 2.1) * 28;
  const desired = target + error;
  const speed = game.p2.speed * level.ai;
  game.p2.y += clamp(desired - game.p2.y, -speed * delta, speed * delta);

  if (game.p2.isBoss && game.p2.charge >= 85 && Math.random() < delta * 0.55) {
    useSkill(game.p2, -1);
  }
}

function useSkill(paddle, dir) {
  if (paddle.charge < 100) return;
  paddle.charge = 0;
  paddle.shield = true;
  paddle.effects.skill = { remaining: 2.4, duration: 2.4 };
  game.balls.forEach(ball => {
    const closeToPaddle = paddle.id === 'p1' ? ball.x < W * 0.42 : ball.x > W * 0.58;
    if (!closeToPaddle) return;
    ball.vx = Math.abs(ball.vx) * dir * 1.28;
    ball.vy += rand(-80, 80);
    ball.fireOwner = paddle.id;
    normalizeBall(ball, Math.min(520, speedOf(ball) * 1.22));
  });
  spawnText(paddle.x + (paddle.id === 'p1' ? 54 : -36), paddle.y + paddle.h / 2, 'POWER SHOT', PAL.coin);
  game.shake = 4;
}

function updateEffects(delta) {
  [game.p1, game.p2].forEach(paddle => {
    Object.entries({ ...paddle.effects }).forEach(([id, effect]) => {
      effect.remaining -= delta;
      if (effect.remaining > 0) return;
      delete paddle.effects[id];
      if (id === 'wide') paddle.h = paddle.baseH;
      if (id === 'shield' || id === 'skill') paddle.shield = false;
    });
  });
}

function updateObstacles(delta) {
  game.obstacles.forEach(ob => {
    if (ob.type === 'moving') ob.y = ob.baseY + Math.sin(game.time * 2 + ob.phase) * ob.range;
    if (ob.type === 'gate') ob.open = Math.sin(game.time * 2.6 + ob.phase) > 0.18;
    if (ob.type === 'flame') ob.active = Math.sin(game.time * 3 + ob.phase) > -0.25;
  });

  if (currentLevel().boss && game.mode === MODE.QUEST && Math.floor(game.time) % 6 === 0 && game.stateTime > 1) {
    const hasBossOrb = game.powerups.some(p => p.fake);
    if (!hasBossOrb && Math.random() < delta * 0.8) {
      game.powerups.push({ x: W - 120, y: rand(100, H - 80), vy: 0, vx: -95, power: POWERUPS[1], fake: true, spin: 0 });
    }
  }
}

function updateBalls(delta) {
  const level = currentLevel();
  game.balls.forEach(ball => {
    if (level.wind) ball.vy += Math.sin(game.time * 1.4 + ball.x * 0.01) * level.wind * delta;
    if (ball.ghost > 0) ball.ghost -= delta;

    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    if (ball.y < 78) {
      ball.y = 78;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y + ball.size > H - 18) {
      ball.y = H - 18 - ball.size;
      ball.vy = -Math.abs(ball.vy);
    }

    collidePaddle(ball, game.p1, 1);
    collidePaddle(ball, game.p2, -1);
    collideObstacles(ball);

    if (ball.x < -40) endRound('p2');
    if (ball.x > W + 40) endRound('p1');

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 9) ball.trail.shift();
  });
  game.balls = game.balls.filter(ball => ball.x > -60 && ball.x < W + 60);
  if (!game.balls.length && game.state === STATE.PLAYING) resetBall(game.winner === 'p1' ? 1 : -1);
}

function collidePaddle(ball, paddle, dir) {
  if (!rectsOverlap(ball.x, ball.y, ball.size, ball.size, paddle.x, paddle.y, paddle.w, paddle.h)) return;
  const offset = ((ball.y + ball.size / 2) - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
  const speed = Math.min(560, speedOf(ball) + 14 + game.rally * 1.5);
  ball.vx = Math.abs(ball.vx) * dir;
  ball.vy = offset * speed * 0.62;
  normalizeBall(ball, speed);
  ball.x = dir > 0 ? paddle.x + paddle.w + 1 : paddle.x - ball.size - 1;
  game.rally += 1;
  paddle.charge = clamp(paddle.charge + 14, 0, 100);
  spawnParticles(ball.x + ball.size / 2, ball.y + ball.size / 2, paddle.id === 'p1' ? PAL.green : PAL.red, 8);

  if (game.rally > 0 && game.rally % currentLevel().powerRate === 0) {
    spawnPowerup(W / 2 - 14, rand(106, H - 78));
  }
}

function collideObstacles(ball) {
  game.obstacles.forEach(ob => {
    if (ob.hp <= 0 || ob.open || (ball.ghost > 0 && ob.type !== 'flame')) return;
    if (!rectsOverlap(ball.x, ball.y, ball.size, ball.size, ob.x, ob.y, ob.w, ob.h)) return;
    if (ob.type === 'flame' && !ob.active) return;

    if (ob.type === 'block') {
      if (ball.fireOwner) ob.hp = 0;
      else ob.hp -= 1;
      if (ob.hp <= 0) {
        spawnParticles(ob.x + ob.w / 2, ob.y + ob.h / 2, PAL.brick, 18);
        spawnPowerup(ob.x + ob.w / 2, ob.y + ob.h / 2);
      }
    }

    if (ob.type === 'flame') {
      normalizeBall(ball, Math.min(560, speedOf(ball) * 1.18));
      spawnParticles(ball.x, ball.y, PAL.lava, 14);
    }

    const overlapX = Math.min(ball.x + ball.size - ob.x, ob.x + ob.w - ball.x);
    const overlapY = Math.min(ball.y + ball.size - ob.y, ob.y + ob.h - ball.y);
    if (overlapX < overlapY) ball.vx *= -1;
    else ball.vy *= -1;
    game.shake = Math.max(game.shake, 2);
  });
}

function updatePowerups(delta) {
  game.powerups.forEach(item => {
    item.spin += delta * 4;
    item.x += (item.vx || 0) * delta;
    item.y += (item.vy || 0) * delta;
    [game.p1, game.p2].forEach(paddle => {
      if (!rectsOverlap(item.x, item.y, 28, 28, paddle.x, paddle.y, paddle.w, paddle.h)) return;
      if (item.fake && paddle.id === 'p1') {
        spawnText(item.x, item.y, 'TRICK!', PAL.lava);
        normalizeBall(game.balls[0], speedOf(game.balls[0]) * 1.12);
      } else {
        applyPowerup(item.power, paddle);
      }
      item.collected = true;
    });
  });
  game.powerups = game.powerups.filter(item => !item.collected && item.x > -50 && item.x < W + 50 && item.y < H + 40);
}

function applyPowerup(power, paddle) {
  spawnText(paddle.x + (paddle.id === 'p1' ? 50 : -36), paddle.y + paddle.h / 2, power.label, power.color);
  if (power.id === 'wide') {
    paddle.h = Math.min(154, paddle.baseH + 46);
    paddle.effects.wide = { remaining: power.duration, duration: power.duration };
  }
  if (power.id === 'fast') {
    game.balls.forEach(ball => normalizeBall(ball, Math.min(570, speedOf(ball) * 1.18)));
  }
  if (power.id === 'slow') {
    game.balls.forEach(ball => normalizeBall(ball, Math.max(180, speedOf(ball) * 0.72)));
  }
  if (power.id === 'fire') {
    game.balls.forEach(ball => { ball.fireOwner = paddle.id; });
    paddle.effects.fire = { remaining: power.duration, duration: power.duration };
  }
  if (power.id === 'shield') {
    paddle.shield = true;
    paddle.effects.shield = { remaining: power.duration, duration: power.duration };
  }
  if (power.id === 'ghost') {
    game.balls.forEach(ball => { ball.ghost = power.duration; });
  }
  if (power.id === 'multi') {
    const source = game.balls[0];
    if (source && game.balls.length < 3) {
      [-0.42, 0.42].forEach(angle => {
        const speed = speedOf(source);
        const base = Math.atan2(source.vy, source.vx);
        game.balls.push(createBall(source.x, source.y, Math.cos(base + angle) * speed, Math.sin(base + angle) * speed, source.baseSpeed));
      });
    }
  }
  if (power.id === 'coin') {
    game.score[paddle.id] += 1;
  }
  spawnParticles(paddle.x, paddle.y + paddle.h / 2, power.color, 12);
}

function spawnPowerup(x, y) {
  const power = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
  game.powerups.push({ x: x - 14, y: y - 14, vy: rand(-12, 12), vx: rand(-22, 22), power, spin: rand(0, Math.PI * 2) });
}

function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * rand(40, 180),
      vy: Math.sin(angle) * rand(40, 180),
      size: rand(3, 7),
      life: rand(0.3, 0.75),
      maxLife: 0.75,
      color
    });
  }
}

function spawnText(x, y, text, color) {
  game.particles.push({ x, y, vx: 0, vy: -44, size: 0, life: 0.9, maxLife: 0.9, color, text });
}

function updateParticles(delta) {
  game.particles.forEach(p => {
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.vy += 160 * delta;
    p.life -= delta;
  });
  game.particles = game.particles.filter(p => p.life > 0);
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function speedOf(ball) {
  if (!ball) return currentLevel().ball;
  return Math.hypot(ball.vx, ball.vy) || ball.baseSpeed;
}

function normalizeBall(ball, speed) {
  if (!ball) return;
  const current = speedOf(ball);
  ball.vx = (ball.vx / current) * speed;
  ball.vy = (ball.vy / current) * speed;
}

function render() {
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (game.shake > 0) ctx.translate(rand(-game.shake, game.shake), rand(-game.shake, game.shake));
  drawBackground();
  drawArena();
  drawObstacles();
  drawPowerups();
  drawPaddle(game.p1, PAL.green);
  drawPaddle(game.p2, game.p2.isBoss ? PAL.purple : PAL.red);
  drawBalls();
  drawParticles();
  drawHud();
  ctx.restore();

  if (game.state === STATE.MENU) drawMenu();
  if (game.state === STATE.MODE_SELECT) drawModeSelect();
  if (game.state === STATE.INTRO) drawIntro();
  if (game.state === STATE.READY) drawReady();
  if (game.state === STATE.PAUSED) drawPause();
  if (game.state === STATE.ROUND_OVER) drawRoundOver();
  if (game.state === STATE.GAME_OVER) drawGameOver();
  if (game.state === STATE.WIN) drawWin();
}

function drawBackground() {
  const theme = currentLevel().theme;
  if (theme === 'cave') {
    px(0, 0, W, H, PAL.cave);
    px(0, 282, W, 118, '#342443');
    for (let x = 0; x < W; x += 48) {
      px(x, 70, 24, 26 + (x % 96), '#17122a');
      px(x + 12, 110, 16, 16, PAL.cave2);
    }
    return;
  }
  if (theme === 'castle') {
    px(0, 0, W, H, '#596078');
    px(0, 282, W, 118, '#3c3540');
    for (let y = 116; y < 290; y += 32) {
      for (let x = (y / 32) % 2 ? -32 : 0; x < W; x += 64) box(x, y, 64, 32, '#67707c', '#363a42', 3);
    }
    for (let x = 0; x < W; x += 70) {
      px(x, 362, 42, 8, PAL.lava);
      px(x + 16, 370, 50, 8, '#ffb02f');
    }
    return;
  }
  px(0, 0, W, H, theme === 'sky' ? '#63d7ff' : PAL.sky);
  if (theme === 'water') {
    px(0, 268, W, 132, '#1a9bd6');
    px(0, 270, W, 14, '#9af5ff');
    for (let x = 0; x < W; x += 54) {
      px(x, 316 + Math.sin(game.time * 2 + x) * 2, 28, 4, '#d9ffff');
      px(x + 20, 348, 28, 4, '#74dff2');
    }
  } else {
    px(0, 284, W, 116, '#72d348');
  }
  drawPixelCloud(74, 86, 2);
  drawPixelCloud(602, 70, 2);
  drawPixelCloud(392, 120, 1);
  if (theme === 'grass') {
    drawBlockHill(92, 238, 110, '#77d455', '#39a342');
    drawBlockHill(582, 230, 140, '#8ee05d', '#43a743');
  }
  if (theme === 'sky') {
    for (let x = -20; x < W; x += 132) drawPixelCloud(x, 284, 2);
  }
}

function drawArena() {
  px(0, 58, W, 14, PAL.black);
  px(0, H - 18, W, 18, PAL.black);
  for (let y = 86; y < H - 34; y += 24) px(W / 2 - 3, y, 6, 12, PAL.white);

  if (currentLevel().theme === 'grass') {
    drawTube(88, 296, 46, 86);
    drawTube(668, 292, 54, 90);
  }
  if (currentLevel().theme === 'water') {
    drawShell(92, 350);
    drawShell(674, 350);
  }
  if (currentLevel().theme === 'castle') {
    drawTorch(74, 318);
    drawTorch(700, 318);
  }
}

function drawPixelCloud(x, y, scale) {
  const s = 8 * scale;
  px(x + s, y + s, s * 5, s * 2, PAL.white);
  px(x, y + s * 2, s * 8, s * 2, PAL.white);
  px(x + s * 2, y, s * 2, s, PAL.white);
  px(x + s * 5, y + s, s * 2, s, PAL.white);
  px(x + s, y + s * 3, s * 6, s, '#d7f7ff');
}

function drawBlockHill(x, y, w, fill, dark) {
  for (let row = 0; row < 7; row++) {
    const inset = row * 8;
    px(x + inset, y + row * 8, w - inset * 2, 8, fill);
  }
  px(x + 20, y + 24, 16, 16, dark);
  px(x + w - 44, y + 32, 16, 16, dark);
}

function drawTube(x, y, w, h) {
  box(x, y + 20, w, h - 20, PAL.pipe, PAL.black, 5);
  box(x - 10, y, w + 20, 28, '#42d962', PAL.black, 5);
  px(x + 10, y + 28, 8, h - 32, '#6cff83');
  px(x + w - 16, y + 28, 8, h - 32, PAL.pipeDark);
}

function drawShell(x, y) {
  box(x, y, 42, 24, '#ffd4ab', PAL.black, 4);
  px(x + 8, y + 8, 6, 12, '#d28762');
  px(x + 20, y + 6, 6, 14, '#d28762');
  px(x + 32, y + 8, 6, 12, '#d28762');
}

function drawTorch(x, y) {
  px(x + 10, y + 28, 10, 38, '#5c3824');
  px(x + 2, y + 12, 26, 22, PAL.lava);
  px(x + 8, y, 14, 18, PAL.coin);
  px(x + 2, y + 12, 26, 4, PAL.black);
}

function drawObstacles() {
  game.obstacles.forEach(ob => {
    if (ob.hp <= 0 || ob.open) return;
    if (ob.type === 'block') {
      box(ob.x, ob.y, ob.w, ob.h, PAL.brick, PAL.black, 4);
      px(ob.x + 4, ob.y + 4, ob.w - 8, 5, PAL.brickLight);
      px(ob.x + 12, ob.y + 15, ob.w - 24, 4, PAL.redDark);
    }
    if (ob.type === 'bumper') {
      box(ob.x, ob.y, ob.w, ob.h, PAL.castle, PAL.black, 4);
      px(ob.x + 4, ob.y + 8, ob.w - 8, 8, '#c7ced8');
    }
    if (ob.type === 'moving') {
      box(ob.x, ob.y, ob.w, ob.h, PAL.white, PAL.black, 4);
      px(ob.x + 10, ob.y + 6, ob.w - 20, 4, '#d7f7ff');
    }
    if (ob.type === 'gate') {
      box(ob.x, ob.y, ob.w, ob.h, PAL.water, PAL.black, 4);
      px(ob.x + 6, ob.y + 8, ob.w - 12, ob.h - 16, '#9af5ff');
    }
    if (ob.type === 'flame' && ob.active) {
      box(ob.x, ob.y, ob.w, ob.h, PAL.lava, PAL.black, 4);
      px(ob.x + 5, ob.y + 8, ob.w - 10, ob.h - 16, PAL.coin);
    }
  });
}

function drawPaddle(p, color) {
  box(p.x + 4, p.y + 5, p.w, p.h, 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.35)', 0);
  box(p.x, p.y, p.w, p.h, color, PAL.black, 4);
  px(p.x + 5, p.y + 8, 4, p.h - 16, '#ffffff');
  px(p.x + p.w - 7, p.y + 8, 3, p.h - 16, 'rgba(0,0,0,0.22)');
  if (p.shield) {
    const sx = p.id === 'p1' ? p.x + p.w + 8 : p.x - 16;
    box(sx, p.y + 10, 8, p.h - 20, PAL.cyan, PAL.black, 2);
  }
}

function drawBalls() {
  game.balls.forEach(ball => {
    ball.trail.forEach((p, i) => {
      const size = Math.max(3, Math.floor((i / ball.trail.length) * 9));
      px(p.x - size / 2, p.y - size / 2, size, size, ball.fireOwner ? PAL.lava : '#d7f7ff');
    });
    const color = ball.fireOwner ? PAL.lava : (ball.ghost > 0 ? '#b76bff' : '#38a8ff');
    box(ball.x, ball.y, ball.size, ball.size, color, PAL.black, 3);
    px(ball.x + 3, ball.y + 3, 4, 4, '#ffffff');
  });
}

function drawPowerups() {
  game.powerups.forEach(item => {
    const bob = Math.sin(item.spin) * 3;
    const color = item.fake ? PAL.lava : item.power.color;
    box(item.x, item.y + bob, 28, 28, color, PAL.black, 4);
    px(item.x + 5, item.y + bob + 5, 18, 4, '#ffffff');
    ctx.fillStyle = PAL.black;
    ctx.font = '900 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.fake ? '!' : item.power.glyph, item.x + 14, item.y + bob + 16);
  });
}

function drawParticles() {
  game.particles.forEach(p => {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    if (p.text) {
      ctx.fillStyle = p.color;
      ctx.font = '900 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    } else {
      px(p.x, p.y, p.size, p.size, p.color);
    }
  });
  ctx.globalAlpha = 1;
}

function drawHud() {
  px(0, 0, W, 58, PAL.black);
  ctx.fillStyle = PAL.white;
  ctx.font = '900 13px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('P1', 18, 10);
  ctx.fillText(String(game.score.p1), 18, 30);
  drawCharge(58, 34, game.p1.charge, PAL.green);

  ctx.textAlign = 'center';
  ctx.fillText(currentLevel().name, W / 2, 8);
  ctx.fillStyle = PAL.coin;
  ctx.fillText(currentLevel().title, W / 2, 29);

  ctx.fillStyle = PAL.white;
  ctx.textAlign = 'right';
  ctx.fillText(opponentName(), W - 18, 10);
  ctx.fillText(String(game.score.p2), W - 18, 30);
  drawCharge(W - 178, 34, game.p2.charge, game.p2.isBoss ? PAL.purple : PAL.red);

  let y = 64;
  drawActiveEffects(game.p1, 14, y);
  drawActiveEffects(game.p2, W - 152, y);
}

function drawCharge(x, y, value, color) {
  box(x, y, 116, 12, PAL.panel, PAL.black, 2);
  px(x + 4, y + 4, 108 * (value / 100), 4, color);
}

function drawActiveEffects(paddle, x, y) {
  Object.entries(paddle.effects).forEach(([id, effect], i) => {
    const power = POWERUPS.find(p => p.id === id);
    const label = power ? power.label : 'SKILL';
    const color = power ? power.color : PAL.coin;
    box(x, y + i * 18, 138, 14, PAL.panel, PAL.black, 2);
    px(x + 4, y + 5 + i * 18, 78 * (effect.remaining / effect.duration), 4, color);
    ctx.fillStyle = PAL.white;
    ctx.font = '900 10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, x + 132, y + 3 + i * 18);
  });
}

function drawOverlay(title, lines, action) {
  ctx.globalAlpha = 0.72;
  px(0, 0, W, H, PAL.black);
  ctx.globalAlpha = 1;
  box(W / 2 - 236, 92, 472, 226, PAL.panel, PAL.black, 6);
  px(W / 2 - 220, 108, 440, 8, PAL.red);
  px(W / 2 - 220, 294, 440, 8, PAL.red);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.coin;
  ctx.font = '900 28px "Courier New", monospace';
  ctx.fillText(title, W / 2, 146);
  ctx.font = '900 15px "Courier New", monospace';
  ctx.fillStyle = PAL.white;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 194 + i * 25));
  if (Math.floor(game.time * 2) % 2 === 0) {
    ctx.fillStyle = '#6cff83';
    ctx.fillText(action, W / 2, 270);
  }
}

function drawMenu() {
  drawOverlay('PIXEL PONG ADVENTURE', ['QUEST MODE + VERSUS MODE', 'POWER UPS  SKILLS  BOSS ROUND'], 'PRESS ENTER');
}

function drawModeSelect() {
  drawOverlay('SELECT MODE', ['ENTER: QUEST', '2: LOCAL VERSUS'], '1 QUEST / 2 VERSUS');
}

function drawIntro() {
  drawOverlay(currentLevel().name, [currentLevel().title, `FIRST TO ${currentLevel().target}`], 'GET READY');
}

function drawReady() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAL.black;
  ctx.font = '900 16px "Courier New", monospace';
  ctx.fillText('ENTER / CLICK TO SERVE', W / 2 + 3, H - 48 + 3);
  ctx.fillStyle = PAL.white;
  ctx.fillText('ENTER / CLICK TO SERVE', W / 2, H - 48);
}

function drawPause() {
  drawOverlay('PAUSE', ['MATCH PAUSED'], 'PRESS P TO RESUME');
}

function drawRoundOver() {
  drawOverlay('STAGE CLEAR', [`SCORE ${game.score.p1}-${game.score.p2}`, `NEXT ${LEVELS[game.levelIndex + 1].name}`], 'PRESS ENTER');
}

function drawGameOver() {
  drawOverlay(game.message || 'GAME OVER', [`FINAL ${game.score.p1}-${game.score.p2}`, 'RUN IT BACK'], 'PRESS ENTER');
}

function drawWin() {
  drawOverlay('VICTORY', [`ALL ${LEVELS.length} WORLDS CLEAR`, `FINAL ${game.score.p1}-${game.score.p2}`], 'PRESS ENTER');
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return ((event.clientY - rect.top) / rect.height) * H;
}

document.addEventListener('keydown', event => {
  if (event.key === 'w' || event.key === 'W') input.p1Up = true;
  if (event.key === 's' || event.key === 'S') input.p1Down = true;
  if (event.key === 'ArrowUp') {
    if (game.mode === MODE.VERSUS) input.p2Up = true;
    else input.p1Up = true;
  }
  if (event.key === 'ArrowDown') {
    if (game.mode === MODE.VERSUS) input.p2Down = true;
    else input.p1Down = true;
  }
  if (event.key === 'f' || event.key === 'F' || event.key === ' ') {
    event.preventDefault();
    input.p1Skill = true;
  }
  if (event.key === '/') input.p2Skill = true;
  if (event.key === 'Enter') input.confirm = true;
  if (event.key === '1' && game.state === STATE.MODE_SELECT) startQuest();
  if (event.key === '2' && game.state === STATE.MODE_SELECT) startVersus();
  if (event.key === 'p' || event.key === 'P') {
    if (game.state === STATE.PLAYING || game.state === STATE.READY) {
      game.pausedFrom = game.state;
      setState(STATE.PAUSED);
    } else if (game.state === STATE.PAUSED) {
      setState(game.pausedFrom || STATE.PLAYING);
    }
  }
});

document.addEventListener('keyup', event => {
  if (event.key === 'w' || event.key === 'W') input.p1Up = false;
  if (event.key === 's' || event.key === 'S') input.p1Down = false;
  if (event.key === 'ArrowUp') {
    input.p1Up = false;
    input.p2Up = false;
  }
  if (event.key === 'ArrowDown') {
    input.p1Down = false;
    input.p2Down = false;
  }
});

canvas.addEventListener('pointerdown', event => {
  input.pointerActive = true;
  input.pointerY = pointerToCanvas(event);
  input.confirm = true;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', event => {
  if (!input.pointerActive) return;
  input.pointerY = pointerToCanvas(event);
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

requestAnimationFrame(loop);
