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
let baseSpeed = 3.6;

let score = 0;
let lives = 3;
let gameOver = false;
let ballColor = "#0095DD";
let pause = false;

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
  if(e.key === 'Right' || e.key === 'ArrowRight') {
    rightPressed = true;
  } else if(e.key === 'Left' || e.key === 'ArrowLeft') {
    leftPressed = true;
  }
  // P暂停
  if(e.key.toLowerCase() === 'p' && !gameOver) pause = !pause;
  // 空格重启
  if(e.key === ' ' && gameOver){
    score=0;lives=3;gameOver=false;resetBall();
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
  ctx.fillText('Lives: ' + lives, 8, 40);
  ctx.fillText('P暂停 空格重开',8,60);
}

function detectCollision() {
  if(ballY + ballRadius > canvas.height - basketHeight &&
     ballX > basketX && ballX < basketX + basketWidth) {
    score++;
    ballColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    ballDY = baseSpeed + score * 0.12;
    resetBall();
  } else if(ballY + ballRadius > canvas.height) {
    lives--;
    if(lives <= 0){
      gameOver = true;
    }else{
      resetBall();
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
    ctx.fillText('按空格重新游戏',30,canvas.height/2+35);
    requestAnimationFrame(draw);
    return;
  }

  if(pause){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillText('已暂停，按P继续',canvas.width/2-80,canvas.height/2);
    drawBasket();drawBall();drawScore();
    requestAnimationFrame(draw);
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