const gameGrid = document.getElementById('gameGrid');
const cardsArray = ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍑', '🍒'];

const DIFFICULTIES = {
  casual: { timeLimit: null, flipDelay: 1000, label: '娱乐模式' },
  easy:   { timeLimit: 60,   flipDelay: 800,  label: '简单' },
  normal: { timeLimit: 45,   flipDelay: 600,  label: '普通' },
  hard:   { timeLimit: 30,   flipDelay: 400,  label: '困难' },
};

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let moves = 0;
let currentDifficulty = DIFFICULTIES.casual;
let timeLeft = null;
let timer = null;
let gameStartedAt = null;
let leaderboardSubmitted = false;
const movesDisplay = document.getElementById('movesCount');
const timerDisplay = document.getElementById('timerDisplay');

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createBoard() {
  const shuffledCards = shuffle([...cardsArray, ...cardsArray]);
  shuffledCards.forEach((value) => {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.dataset.value = value;

    const cardBack = document.createElement('div');
    cardBack.classList.add('card-face', 'card-back');
    cardBack.textContent = '?';

    const cardFront = document.createElement('div');
    cardFront.classList.add('card-face', 'card-front');
    cardFront.textContent = value;

    cardElement.appendChild(cardBack);
    cardElement.appendChild(cardFront);
    cardElement.addEventListener('click', handleCardClick);
    gameGrid.appendChild(cardElement);
  });
}

function handleCardClick(event) {
  if (lockBoard) return;
  const clickedCard = event.target.closest('.card');
  if (!clickedCard || clickedCard === firstCard) return;

  clickedCard.classList.add('flipped');

  if (!firstCard) {
    firstCard = clickedCard;
  } else {
    secondCard = clickedCard;
    checkForMatch();
  }
}

function checkForMatch() {
  moves++;
  movesDisplay.textContent = moves;
  const isMatch = firstCard.dataset.value === secondCard.dataset.value;
  isMatch ? disableCards() : unflipCards();
}

function disableCards() {
  firstCard.classList.add('matched');
  secondCard.classList.add('matched');
  matchedPairs++;
  resetBoard();
  if (matchedPairs === 8) {
    stopTimer();
    setTimeout(showVictory, 600);
  }
}

function unflipCards() {
  lockBoard = true;
  firstCard.classList.add('wrong');
  secondCard.classList.add('wrong');

  setTimeout(() => {
    firstCard.classList.remove('flipped', 'wrong');
    secondCard.classList.remove('flipped', 'wrong');
    resetBoard();
  }, currentDifficulty.flipDelay);
}

function resetBoard() {
  [firstCard, secondCard, lockBoard] = [null, null, false];
}

function startTimer() {
  timer = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 10) {
      timerDisplay.style.color = '#e74c3c';
    }
    if (timeLeft <= 0) {
      clearInterval(timer);
      gameOver();
    }
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startGame(difficultyKey) {
  currentDifficulty = DIFFICULTIES[difficultyKey];
  timeLeft = currentDifficulty.timeLimit;
  gameStartedAt = Date.now();
  leaderboardSubmitted = false;
  document.getElementById('introScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  if (timeLeft !== null) {
    timerDisplay.textContent = timeLeft;
    timerDisplay.parentElement.style.display = 'inline';
    timerDisplay.style.color = '';
    startTimer();
  } else {
    timerDisplay.parentElement.style.display = 'none';
  }
  createBoard();
}

function gameOver() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="intro-modal">
      <h1 style="margin-top:0">⏰ 时间到！</h1>
      <p style="font-size:20px;margin:16px 0">配对了 ${matchedPairs} 对，用了 ${moves} 步</p>
      <button class="start-btn" onclick="location.reload()">再来一局</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showVictory() {
  submitMemoryScore();
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="intro-modal">
      <h1 style="margin-top:0">🎉 恭喜通关！</h1>
      <p style="font-size:20px;margin:16px 0">共用了 <strong>${moves}</strong> 步</p>
      <p style="font-size:14px;color:var(--text);opacity:0.7">最少只需 8 步哦！</p>
      <button class="start-btn" onclick="location.reload()">再来一局</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function submitMemoryScore() {
  if (leaderboardSubmitted || !window.GagagaPlatform) return;
  leaderboardSubmitted = true;
  const elapsedMs = gameStartedAt ? Date.now() - gameStartedAt : 0;
  window.GagagaPlatform.submitScore('memory', {
    moves,
    elapsedMs,
    mode: currentDifficulty.label,
  }, `memory:${Date.now()}:${moves}`);
}
