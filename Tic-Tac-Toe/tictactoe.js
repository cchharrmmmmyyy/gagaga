const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const cellSize = canvas.width / 3;
let board = createBoard();
let currentPlayer = 'X';
let gameFinished = false;

canvas.addEventListener('click', handleClick);
document.addEventListener('keydown', event => {
  if (event.key === ' ') resetGame();
});

function createBoard() {
  return [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ];
}

function handleClick(event) {
  if (gameFinished) return;

  const x = Math.floor(event.offsetX / cellSize);
  const y = Math.floor(event.offsetY / cellSize);
  if (!board[y] || board[y][x] !== '') return;

  board[y][x] = currentPlayer;
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  draw();
  checkWinner();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const x = column * cellSize;
      const y = row * cellSize;
      ctx.strokeRect(x, y, cellSize, cellSize);

      if (board[row][column] !== '') {
        ctx.font = '80px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText(board[row][column], x + 20, y + 80);
      }
    }
  }
}

function checkWinner() {
  const lines = [
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]]
  ];

  for (const line of lines) {
    if (line[0] !== '' && line[0] === line[1] && line[1] === line[2]) {
      gameFinished = true;
      submitTicTacToeResult(line[0] === 'X' ? 'win' : 'loss');
      alert(`${line[0]} wins!`);
      resetGame();
      return;
    }
  }

  if (board.flat().every(cell => cell !== '')) {
    gameFinished = true;
    submitTicTacToeResult('draw');
    alert('Draw!');
    resetGame();
  }
}

function submitTicTacToeResult(result) {
  if (!window.GagagaPlatform) return;
  window.GagagaPlatform.submitScore(
    'tic-tac-toe',
    { result },
    `tic:${Date.now()}:${result}`
  );
}

function resetGame() {
  board = createBoard();
  currentPlayer = 'X';
  gameFinished = false;
  draw();
}

draw();
