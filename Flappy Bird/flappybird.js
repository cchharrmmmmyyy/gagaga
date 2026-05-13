const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ====== 配置 ======
const birdSize = 30;
const gravity = 0.18;
const lift = -5.5;
const pipeWidth = 50;
const pipeGap = 110;
const pipeSpeed = 2;
const groundHeight = 60;

// ====== 游戏状态 ======
const STATE = { START: 'START', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER' };
let state = STATE.START;

// ====== 游戏变量 ======
let birdX = 50;
let birdY = canvas.height / 2;
let birdSpeed = 0;
let pipes = [];
let frame = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let groundOffset = 0;
let clouds = [];

for (let i = 0; i < 3; i++) {
  clouds.push({
    x: Math.random() * canvas.width,
    y: 30 + Math.random() * 80,
    size: 25 + Math.random() * 20
  });
}

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
    cloud.x -= 0.3;
    if (cloud.x + cloud.size * 2 < 0) {
      cloud.x = canvas.width + cloud.size;
      cloud.y = 30 + Math.random() * 80;
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
  groundOffset = (groundOffset + pipeSpeed) % 20;
}

// ====== 鸟 ======
function drawBird(x, y, speed) {
  ctx.save();
  ctx.translate(x + birdSize / 2, y + birdSize / 2);
  ctx.rotate(Math.min(Math.max(speed * 0.1, -0.5), 1));

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
function drawPipe(pipe) {
  const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  const bottomGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  const color1 = isDark() ? '#2E7D32' : '#2E7D32';
  const colorMid = isDark() ? '#4CAF50' : '#66BB6A';
  const colorEnd = isDark() ? '#2E7D32' : '#2E7D32';

  topGradient.addColorStop(0, color1);
  topGradient.addColorStop(0.5, colorMid);
  topGradient.addColorStop(1, colorEnd);
  bottomGradient.addColorStop(0, color1);
  bottomGradient.addColorStop(0.5, colorMid);
  bottomGradient.addColorStop(1, colorEnd);

  ctx.fillStyle = topGradient;
  ctx.fillRect(pipe.x, 0, pipeWidth, pipe.height);
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(pipe.x, pipe.height + pipeGap, pipeWidth, canvas.height - pipe.height - pipeGap - groundHeight);

  ctx.fillStyle = isDark() ? '#1B5E20' : '#1B5E20';
  ctx.fillRect(pipe.x - 3, pipe.height - 20, pipeWidth + 6, 20);
  ctx.fillRect(pipe.x - 3, pipe.height + pipeGap, pipeWidth + 6, 20);

  ctx.strokeStyle = isDark() ? '#2E7D32' : '#388E3C';
  ctx.lineWidth = 2;
  ctx.strokeRect(pipe.x - 3, pipe.height - 20, pipeWidth + 6, 20);
  ctx.strokeRect(pipe.x - 3, pipe.height + pipeGap, pipeWidth + 6, 20);
}

function updatePipes() {
  if (frame > 0 && frame % 90 === 0) {
    const maxPipe = canvas.height - pipeGap - groundHeight - 100;
    const height = Math.random() * Math.max(maxPipe, 1) + 50;
    pipes.push({ x: canvas.width, height });
  }

  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed;
    if (pipe.x + pipeWidth < birdX && !pipe.passed) {
      pipe.passed = true;
      score++;
    }
  });

  pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);
}

function checkCollision() {
  if (birdY < 0 || birdY + birdSize > canvas.height - groundHeight) return true;

  const birdCenterX = birdX + birdSize / 2;
  const birdCenterY = birdY + birdSize / 2;
  const birdRadius = birdSize / 2 * 0.8;

  return pipes.some(pipe => {
    if (birdCenterX + birdRadius < pipe.x || birdCenterX - birdRadius > pipe.x + pipeWidth) {
      return false;
    }
    if (birdCenterY - birdRadius < pipe.height || birdCenterY + birdRadius > pipe.height + pipeGap) {
      return true;
    }
    return false;
  });
}

function drawScore() {
  ctx.fillStyle = isDark() ? '#FFF' : '#333';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(score, 15, 40);
}

// ====== 状态切换 ======
function startPlaying() {
  state = STATE.PLAYING;
  frame = 0;
  birdY = canvas.height / 2;
  birdSpeed = 0;
  pipes = [];
  score = 0;
}

function goToStart() {
  state = STATE.START;
  frame = 0;
  birdY = canvas.height / 2;
  birdSpeed = 0;
  pipes = [];
  score = 0;
}

// ====== 界面渲染 ======
function renderStartScreen() {
  drawBackground();
  updateClouds();
  drawClouds();
  updateGround();
  drawGround();

  const bobY = birdY + Math.sin(frame * 0.05) * 10;
  drawBird(birdX, bobY, 0);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = isDark() ? '#FFD700' : '#FFF';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Flappy Bird', canvas.width / 2, 120);
  ctx.restore();

  // 操作提示
  const boxY = canvas.height / 2 + 50;
  ctx.fillStyle = isDark() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const boxW = 280;
  const boxH = 100;
  const boxX = (canvas.width - boxW) / 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 12);
  ctx.fill();

  ctx.fillStyle = isDark() ? '#E0E0E0' : '#444';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('点击或按空格键', canvas.width / 2, boxY + 38);
  ctx.fillText('开始游戏', canvas.width / 2, boxY + 64);

  if (highScore > 0) {
    ctx.fillStyle = isDark() ? '#FFD700' : '#E65100';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('\u{1F3C6} 最高分: ' + highScore, canvas.width / 2, boxY + 96);
  }
}

function renderGameOverOverlay() {
  ctx.fillStyle = isDark() ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FF5252';
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 80);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('得分: ' + score, canvas.width / 2, canvas.height / 2 - 25);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('\u{1F3C6} 最高分: ' + highScore, canvas.width / 2, canvas.height / 2 + 15);

  // 重新开始按钮
  const btnX = canvas.width / 2 - 90;
  const btnY = canvas.height / 2 + 55;
  const btnW = 180;
  const btnH = 50;

  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#4CAF50');
  btnGrad.addColorStop(1, '#388E3C');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 25);
  ctx.fill();

  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 25);
  ctx.stroke();

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('重新开始', canvas.width / 2, btnY + 33);
}

function renderPausedOverlay() {
  ctx.fillStyle = isDark() ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('暂停中', canvas.width / 2, canvas.height / 2 - 15);

  ctx.font = '20px Arial';
  ctx.fillText('按 P 或 Esc 继续', canvas.width / 2, canvas.height / 2 + 30);
}

// ====== 游戏更新 ======
function update() {
  birdSpeed += gravity;
  birdY += birdSpeed;
  updatePipes();

  if (checkCollision()) {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('flappyHighScore', highScore);
    }
    state = STATE.GAME_OVER;
  }
}

// ====== 主循环 ======
function gameLoop() {
  if (state === STATE.PLAYING) {
    update();
    frame++;
  } else if (state === STATE.START) {
    frame++;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (state) {
    case STATE.START:
      renderStartScreen();
      break;

    case STATE.PLAYING:
      drawBackground();
      updateClouds();
      drawClouds();
      drawBird(birdX, birdY, birdSpeed);
      pipes.forEach(drawPipe);
      updateGround();
      drawGround();
      drawScore();
      break;

    case STATE.PAUSED:
      drawBackground();
      drawClouds();
      drawBird(birdX, birdY, birdSpeed);
      pipes.forEach(drawPipe);
      drawGround();
      drawScore();
      renderPausedOverlay();
      break;

    case STATE.GAME_OVER:
      drawBackground();
      drawClouds();
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
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

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
      const btnX = canvas.width / 2 - 90;
      const btnY = canvas.height / 2 + 55;
      const btnW = 180;
      const btnH = 50;
      if (clickX >= btnX && clickX <= btnX + btnW && clickY >= btnY && clickY <= btnY + btnH) {
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

// ====== 启动 ======
gameLoop();
