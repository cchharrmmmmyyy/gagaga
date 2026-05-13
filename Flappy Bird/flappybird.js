const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const birdSize = 30;
const gravity = 0.25;
const lift = -5;
const pipeWidth = 50;
const pipeGap = 100;
const pipeSpeed = 2;
const groundHeight = 60;

let birdX = 50;
let birdY = canvas.height / 2;
let birdSpeed = 0;
let pipes = [];
let frame = 0;
let score = 0;
let groundOffset = 0;
let clouds = [];
let gameStarted = false;

for (let i = 0; i < 3; i++) {
  clouds.push({
    x: Math.random() * canvas.width,
    y: 30 + Math.random() * 80,
    size: 25 + Math.random() * 20
  });
}

function getTheme() {
  return document.documentElement.dataset.theme || 'light';
}

function drawBackground() {
  const theme = getTheme();
  const isDark = theme === 'dark';
  
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - groundHeight);
  if (isDark) {
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
  const theme = getTheme();
  const isDark = theme === 'dark';
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)';
  
  clouds.forEach(cloud => {
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 0.8, cloud.y - cloud.size * 0.3, cloud.size * 0.7, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 1.5, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    cloud.x -= 0.3;
    if (cloud.x + cloud.size * 2 < 0) {
      cloud.x = canvas.width + cloud.size;
      cloud.y = 30 + Math.random() * 80;
    }
  });
}

function drawGround() {
  const theme = getTheme();
  const isDark = theme === 'dark';
  
  groundOffset = (groundOffset + pipeSpeed) % 20;
  
  const groundGradient = ctx.createLinearGradient(0, canvas.height - groundHeight, 0, canvas.height);
  if (isDark) {
    groundGradient.addColorStop(0, '#2d5a3d');
    groundGradient.addColorStop(1, '#1a3d2a');
  } else {
    groundGradient.addColorStop(0, '#7CB342');
    groundGradient.addColorStop(1, '#558B2F');
  }
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
  
  ctx.fillStyle = isDark ? '#3a7a4a' : '#8BC34A';
  for (let x = -groundOffset; x < canvas.width; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, canvas.height - groundHeight);
    ctx.lineTo(x + 10, canvas.height - groundHeight - 15);
    ctx.lineTo(x + 20, canvas.height - groundHeight);
    ctx.fill();
  }
}

function drawBird() {
  const theme = getTheme();
  const isDark = theme === 'dark';
  
  ctx.save();
  ctx.translate(birdX + birdSize / 2, birdY + birdSize / 2);
  
  const rotation = Math.min(Math.max(birdSpeed * 0.1, -0.5), 1);
  ctx.rotate(rotation);
  
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
  
  ctx.fillStyle = isDark ? '#555' : '#FF5722';
  ctx.beginPath();
  ctx.moveTo(-5, 5);
  ctx.lineTo(-15, 8);
  ctx.lineTo(-5, 11);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawPipe(pipe) {
  const theme = getTheme();
  const isDark = theme === 'dark';
  
  const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  const bottomGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  
  if (isDark) {
    topGradient.addColorStop(0, '#2E7D32');
    topGradient.addColorStop(0.5, '#4CAF50');
    topGradient.addColorStop(1, '#2E7D32');
    bottomGradient.addColorStop(0, '#2E7D32');
    bottomGradient.addColorStop(0.5, '#4CAF50');
    bottomGradient.addColorStop(1, '#2E7D32');
  } else {
    topGradient.addColorStop(0, '#2E7D32');
    topGradient.addColorStop(0.5, '#66BB6A');
    topGradient.addColorStop(1, '#2E7D32');
    bottomGradient.addColorStop(0, '#2E7D32');
    bottomGradient.addColorStop(0.5, '#66BB6A');
    bottomGradient.addColorStop(1, '#2E7D32');
  }
  
  ctx.fillStyle = topGradient;
  ctx.fillRect(pipe.x, 0, pipeWidth, pipe.height);
  
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(pipe.x, pipe.height + pipeGap, pipeWidth, canvas.height - pipe.height - pipeGap - groundHeight);
  
  ctx.fillStyle = isDark ? '#1B5E20' : '#1B5E20';
  ctx.fillRect(pipe.x - 3, pipe.height - 20, pipeWidth + 6, 20);
  ctx.fillRect(pipe.x - 3, pipe.height + pipeGap, pipeWidth + 6, 20);
  
  ctx.strokeStyle = isDark ? '#2E7D32' : '#388E3C';
  ctx.lineWidth = 2;
  ctx.strokeRect(pipe.x - 3, pipe.height - 20, pipeWidth + 6, 20);
  ctx.strokeRect(pipe.x - 3, pipe.height + pipeGap, pipeWidth + 6, 20);
}

function updatePipes() {
  if (frame % 90 === 0) {
    const height = Math.random() * (canvas.height - pipeGap - groundHeight - 100) + 50;
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

function drawScore() {
  const theme = getTheme();
  const isDark = theme === 'dark';
  
  ctx.fillStyle = isDark ? '#FFF' : '#333';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(score, 15, 40);
}

function checkCollision() {
  if (birdY < 0 || birdY + birdSize > canvas.height - groundHeight) return true;
  
  const birdCenterX = birdX + birdSize / 2;
  const birdCenterY = birdY + birdSize / 2;
  const birdRadius = birdSize / 2 * 0.8;
  
  return pipes.some(pipe => {
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipeWidth;
    
    if (birdCenterX + birdRadius < pipeLeft || birdCenterX - birdRadius > pipeRight) {
      return false;
    }
    
    if (birdCenterY - birdRadius < pipe.height || birdCenterY + birdRadius > pipe.height + pipeGap) {
      return true;
    }
    
    return false;
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawBackground();
  drawClouds();
  
  birdSpeed += gravity;
  birdY += birdSpeed;
  
  drawBird();
  
  updatePipes();
  pipes.forEach(drawPipe);
  
  drawGround();
  drawScore();
  
  if (checkCollision()) {
    gameOver();
    return;
  }

  frame++;
  requestAnimationFrame(draw);
}

function gameOver() {
  const theme = getTheme();
  const isDark = theme === 'dark';
  
  ctx.fillStyle = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 30);
  
  ctx.font = '24px Arial';
  ctx.fillText(`分数: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
  
  ctx.font = '18px Arial';
  ctx.fillText('点击或按空格键重新开始', canvas.width / 2, canvas.height / 2 + 50);
}

function resetGame() {
  birdY = canvas.height / 2;
  birdSpeed = 0;
  pipes = [];
  frame = 0;
  score = 0;
  gameStarted = true;
  draw();
}

function startGame() {
  gameStarted = true;
  document.addEventListener('click', handleInput);
  document.addEventListener('keydown', handleInput);
  draw();
}

function handleInput(e) {
  if (e.type === 'keydown' && e.code !== 'Space') return;
  e.preventDefault();
  
  if (!gameStarted) {
    resetGame();
    return;
  }
  
  if (birdY > 0 && birdY < canvas.height - groundHeight) {
    birdSpeed = lift;
  }
}

canvas.addEventListener('click', handleInput);
document.addEventListener('keydown', handleInput);

draw();
