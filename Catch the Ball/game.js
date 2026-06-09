const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const basketWidth = 80;
const basketHeight = 24;
const ballRadius = 16;
const baseSpeed = 2.0; // 已经改慢

let basketX = (canvas.width - basketWidth) / 2;
let rightPressed = false;
let leftPressed = false;
let ballX = randomBallX();
let ballY = ballRadius;
let ballDY = baseSpeed;
let ballColor = '#3b82f6';
let score = 0;
let lives = 3;
let gameOver = false;
let pause = false;
let leaderboardSubmitted = false;

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(event) {
  if (event.key === 'Right' || event.key === 'ArrowRight') {
    rightPressed = true;
  } else if (event.key === 'Left' || event.key === 'ArrowLeft') {
    leftPressed = true;
  }
  if (event.key.toLowerCase() === 'p' && !gameOver) pause = !pause;
  if (event.key === ' ' && gameOver) restartGame();
}

function keyUpHandler(event) {
  if (event.key === 'Right' || event.key === 'ArrowRight') rightPressed = false;
  if (event.key === 'Left' || event.key === 'ArrowLeft') leftPressed = false;
}

// 绘制篮子（圆角 + 渐变）
function drawBasket() {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(basketX, canvas.height - basketHeight, basketWidth, basketHeight, 8);
  ctx.fillStyle = '#2563eb';
  ctx.shadowColor = '#93c5fd';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
}

// 绘制小球（渐变 + 光泽）
function drawBall() {
  ctx.save();
  const gradient = ctx.createRadialGradient(ballX - 4, ballY - 4, 0, ballX, ballY, ballRadius);
  gradient.addColorStop(0, '#93c5fd');
  gradient.addColorStop(1, ballColor);
  
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

// 美化文字
function drawScore() {
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = '#1e293b';
  
  ctx.fillText(`🎯 分数: ${score}`, 15, 28);
  ctx.fillText(`❤️ 生命: ${lives}`, 15, 54);
  
  ctx.font = '16px Arial';
  ctx.fillStyle = '#64748b';
  ctx.fillText('P 暂停 | 空格重开', canvas.width - 140, 32);
}

function detectCollision() {
  const caught = ballY + ballRadius > canvas.height - basketHeight
    && ballX > basketX
    && ballX < basketX + basketWidth;

  if (caught) {
    score++;
    ballColor = `hsl(${Math.random() * 360}, 75%, 60%)`;
    ballDY = baseSpeed + score * 0.06;
    resetBall();
  } else if (ballY + ballRadius > canvas.height) {
    lives--;
    if (lives <= 0) {
      gameOver = true;
      submitCatchScore();
    } else {
      resetBall();
    }
  }
}

function submitCatchScore() {
  if (leaderboardSubmitted || !window.GagagaPlatform) return;
  leaderboardSubmitted = true;
  window.GagagaPlatform.submitScore('catch-the-ball', { score }, `catch:${Date.now()}:${score}`);
}

function randomBallX() {
  return Math.random() * (canvas.width - ballRadius * 2) + ballRadius;
}

function resetBall() {
  ballX = randomBallX();
  ballY = ballRadius;
}

function restartGame() {
  score = 0;
  lives = 3;
  ballDY = baseSpeed;
  ballColor = '#3b82f6';
  gameOver = false;
  pause = false;
  leaderboardSubmitted = false;
  resetBall();
}

function moveBasket() {
  const speed = 8;
  if (rightPressed && basketX < canvas.width - basketWidth) basketX += speed;
  if (leftPressed && basketX > 0) basketX -= speed;
}

function draw() {
  // 渐变背景
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGradient.addColorStop(0, '#f0f9ff');
  bgGradient.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameOver) {
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(`最终分数: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText('按空格重新开始', canvas.width / 2, canvas.height / 2 + 45);
    requestAnimationFrame(draw);
    return;
  }

  drawBasket();
  drawBall();
  drawScore();

  if (pause) {
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#3b82f6';
    ctx.textAlign = 'center';
    ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
    requestAnimationFrame(draw);
    return;
  }

  detectCollision();
  moveBasket();
  ballY += ballDY;
  requestAnimationFrame(draw);
}

draw();