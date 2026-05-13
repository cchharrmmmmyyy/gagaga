const gameGrid = document.getElementById('gameGrid');
const cardsArray = ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍑', '🍒', '🥝', '🍌', '🍐', '🍏', '🥭', '🍍', '🥥', '🍉'];

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createBoard() {
  const shuffledCards = shuffle([...cardsArray]).slice(0, 16);
  shuffledCards.forEach((value, index) => {
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
  const isMatch = firstCard.dataset.value === secondCard.dataset.value;
  isMatch ? disableCards() : unflipCards();
}

function disableCards() {
  firstCard.classList.add('matched');
  secondCard.classList.add('matched');
  matchedPairs++;
  resetBoard();
}

function unflipCards() {
  lockBoard = true;
  firstCard.classList.add('wrong');
  secondCard.classList.add('wrong');
  
  setTimeout(() => {
    firstCard.classList.remove('flipped', 'wrong');
    secondCard.classList.remove('flipped', 'wrong');
    resetBoard();
  }, 1000);
}

function resetBoard() {
  [firstCard, secondCard, lockBoard] = [null, null, false];
}

createBoard();
