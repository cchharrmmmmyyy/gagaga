const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const basketWidth = 70;
const basketHeight = 20;
const ballRadius = 14;
const baseSpeed = 2.0; // ✅ 变慢了（原来 3.6）

let basketX = (canvas.width - basketWidth) / 2;
let rightPressed = false;
let leftPressed = false;
let ballX = randomBallX();
let ballY = ballRadius;
let ballDY = baseSpeed;
let ballColor = '#0095DD';
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
  if (event.key === 'Right' || event.key === 'ArrowRight') {
    rightPressed = false;
  } else if (event.key === 'Left' || event.key === 'ArrowLeft') {
    leftPressed = false;
  }
}

function drawBasket() {
  ctx.beginPath();
  ctx.rect(basketX, canvas.height - basketHeight, basketWidth, basketHeight);
  ctx.fillStyle = '#0095DD';
  ctx.fill();
  ctx.closePath();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = ballColor;
  ctx.fill();
  ctx.closePath();
}

function drawScore() {
  ctx.font = '16px Arial';
  ctx.fillStyle = '#0095DD';
  ctx.fillText(`Score: ${score}`, 8, 20);
  ctx.fillText(`Lives: ${lives}`, 8, 40);
  ctx.fillText('P: Pause  Space: Restart', 8, 60);
}

function detectCollision() {
  const caught = ballY + ballRadius > canvas.height - basketHeight
    && ballX > basketX
    && ballX < basketX + basketWidth;

  if (caught) {
    score += 1;
    ballColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    ballDY = baseSpeed + score * 0.06; // ✅ 升级也变慢（原来 0.12）
    resetBall();
  } else if (ballY + ballRadius > canvas.height) {
    lives -= 1;
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
  window.GagagaPlatform.submitScore(
    'catch-the-ball',
    { score },
    `catch:${Date.now()}:${score}`
  );
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
  ballColor = '#0095DD';
  gameOver = false;
  pause = false;
  leaderboardSubmitted = false;
  resetBall();
}

function moveBasket() {
  if (rightPressed && basketX < canvas.width - basketWidth) {
    basketX += 7;
  } else if (leftPressed && basketX > 0) {
    basketX -= 7;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameOver) {
    ctx.font = '24px Arial';
    ctx.fillStyle = '#0095DD';
    ctx.fillText(`Game Over! Score: ${score}`, 50, canvas.height / 2);
    ctx.fillText('Press Space to restart', 70, canvas.height / 2 + 35);
    requestAnimationFrame(draw);
    return;
  }

  drawBasket();
  drawBall();
  drawScore();

  if (pause) {
    ctx.fillText('Paused - press P to continue', 95, canvas.height / 2);
    requestAnimationFrame(draw);
    return;
  }

  detectCollision();
  moveBasket();
  ballY += ballDY;
  requestAnimationFrame(draw);
}

draw();