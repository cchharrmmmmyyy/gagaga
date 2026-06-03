const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const basketWidth = 70;
const basketHeight = 20;
let basketX = (canvas.width - basketWidth) / 2;
let rightPressed = false;
let leftPressed = false;

const ballRadius = 14;
let ballX = Math.random() * (canvas.width - ballRadius * 2) + ballRadius;
let ballY = ballRadius;
let ballDY = 3.6;
let baseSpeed = 3.6; // 基础下落速度

let score = 0;
let lives = 3; // 新增3条生命
let gameOver = false;
let ballColor = "#0095DD"; // 小球颜色

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
  if(e.key === 'Right' || e.key === 'ArrowRight') {
    rightPressed = true;
  } else if(e.key === 'Left' || e.key === 'ArrowLeft') {
    leftPressed = true;
  }
}

function keyUpHandler(e) {
  if(e.key === 'Right' || e.key === 'ArrowRight') {
    rightPressed = false;
  } else if(e.key === 'Left' || e.key === 'ArrowLeft') {
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
  ctx.fillText('Score: ' + score, 8, 20);
  ctx.fillText('Lives: ' + lives, 8, 40); // 绘制生命值
}

function detectCollision() {
  if(ballY + ballRadius > canvas.height - basketHeight &&
     ballX > basketX && ballX < basketX + basketWidth) {
    score++;
    // 接球随机变色
    ballColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    // 得分越高下落越快
    ballDY = baseSpeed + score * 0.12;
    resetBall();
  } else if(ballY + ballRadius > canvas.height) {
    lives--;
    if(lives <= 0){
      gameOver = true;
    }else{
      resetBall(); // 丢球扣命，剩命就重置球
    }
  }
}

function resetBall() {
  ballX = Math.random() * (canvas.width - ballRadius * 2) + ballRadius;
  ballY = ballRadius;
}

function moveBasket() {
  if(rightPressed && basketX < canvas.width - basketWidth) {
    basketX += 7;
  } else if(leftPressed && basketX > 0) {
    basketX -= 7;
  }
}

function draw() {
  if(gameOver) {
    ctx.font = '24px Arial';
    ctx.fillStyle = '#0095DD';
    ctx.fillText('Game Over! Score: ' + score, 50, canvas.height / 2);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBasket();
  drawBall();
  drawScore();
  detectCollision();
  moveBasket();

  ballY += ballDY;

  requestAnimationFrame(draw);
}

draw();