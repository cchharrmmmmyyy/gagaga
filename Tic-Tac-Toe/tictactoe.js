const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const cellSize = canvas.width / 3;
let board = createBoard();
let currentPlayer = 'X';
let gameFinished = false;

// 绑定事件
canvas.addEventListener('click', handleClick);
document.addEventListener('keydown', event => {
  if (event.key === ' ') resetGame();
});

// 创建空棋盘
function createBoard() {
  return [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
  ];
}

// 点击落子
function handleClick(event) {
  if (gameFinished) return;

  const x = Math.floor(event.offsetX / cellSize);
  const y = Math.floor(event.offsetY / cellSize);
  // 越界或已有棋子
  if (x < 0 || x > 2 || y < 0 || y > 2 || board[y][x] !== '') return;

  board[y][x] = currentPlayer;
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  draw();
  checkWinner();
}

// 绘制棋盘和棋子
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 画网格线
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 画 X 和 O
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const val = board[row][col];
      if (val === 'X') {
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(val, col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
      } else if (val === 'O') {
        ctx.fillStyle = '#3498db';
        ctx.fillText(val, col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
      }
    }
  }
}

// 判断胜负
function checkWinner() {
  // 所有获胜线
  const lines = [
    [[0,0],[0,1],[0,2]],
    [[1,0],[1,1],[1,2]],
    [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]],
    [[0,1],[1,1],[2,1]],
    [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]],
    [[0,2],[1,1],[2,0]]
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    const v1 = board[a[0]][a[1]];
    const v2 = board[b[0]][b[1]];
    const v3 = board[c[0]][c[1]];
    if (v1 && v1 === v2 && v2 === v3) {
      gameFinished = true;
      submitTicTacToeResult(v1 === 'X' ? 'win' : 'loss');
      alert(`${v1} 获胜！`);
      resetGame();
      return;
    }
  }

  // 平局
  if (board.flat().every(cell => cell !== '')) {
    gameFinished = true;
    submitTicTacToeResult('draw');
    alert('平局！');
    resetGame();
  }
}

// 提交结果（保留你原有逻辑）
function submitTicTacToeResult(result) {
  if (!window.GagagaPlatform) return;
  window.GagagaPlatform.submitScore(
    'tic-tac-toe',
    { result },
    `tic:${Date.now()}:${result}`
  );
}

// 重置游戏
function resetGame() {
  board = createBoard();
  currentPlayer = 'X';
  gameFinished = false;
  draw();
}

// 初始绘制
draw();