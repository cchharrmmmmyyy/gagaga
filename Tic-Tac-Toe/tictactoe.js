const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');

const cellSize = canvas.width / 3;
let board = createBoard();
let currentPlayer = 'X';
let gameFinished = false;

// 配色（现代柔和）
const COLOR_BG = '#f7f9fc';
const COLOR_GRID = '#cbd5e1';
const COLOR_X = '#ef4444';
const COLOR_O = '#3b82f6';
const COLOR_WIN_LINE = '#22c55e';

// 绑定事件
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
  if (x < 0 || x > 2 || y < 0 || y > 2 || board[y][x] !== '') return;

  board[y][x] = currentPlayer;
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  draw();
  checkWinner();
}

// 绘制：圆角棋盘 + 阴影 + 漂亮的 X/O
function draw() {
  // 背景
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 画棋盘（圆角网格）
  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round'; // 线条圆角
  ctx.beginPath();
  // 横线
  ctx.moveTo(cellSize, 10);
  ctx.lineTo(cellSize, canvas.height - 10);
  ctx.moveTo(cellSize * 2, 10);
  ctx.lineTo(cellSize * 2, canvas.height - 10);
  // 竖线
  ctx.moveTo(10, cellSize);
  ctx.lineTo(canvas.width - 10, cellSize);
  ctx.moveTo(10, cellSize * 2);
  ctx.lineTo(canvas.width - 10, cellSize * 2);
  ctx.stroke();

  // 画 X 和 O（用线条画，比文字好看）
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const val = board[row][col];
      const cx = col * cellSize + cellSize / 2;
      const cy = row * cellSize + cellSize / 2;
      const r = cellSize * 0.35;

      if (val === 'X') {
        ctx.strokeStyle = COLOR_X;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx - r, cy + r);
        ctx.stroke();
      } else if (val === 'O') {
        ctx.strokeStyle = COLOR_O;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // 状态文字美化
  if (!gameFinished) {
    statusText.textContent = `轮到 ${currentPlayer} 落子`;
    statusText.style.color = currentPlayer === 'X' ? COLOR_X : COLOR_O;
  }
}

// 判断胜负 + 高亮获胜线
function checkWinner() {
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
      statusText.textContent = `${v1} 获胜！`;
      statusText.style.color = COLOR_WIN_LINE;
      drawWinLine(line); // 画获胜线
      setTimeout(() => alert(`${v1} 获胜！`), 100);
      setTimeout(resetGame, 1200);
      return;
    }
  }

  if (board.flat().every(cell => cell !== '')) {
    gameFinished = true;
    submitTicTacToeResult('draw');
    statusText.textContent = '平局！';
    statusText.style.color = '#64748b';
    setTimeout(() => alert('平局！'), 100);
    setTimeout(resetGame, 1200);
  }
}

// 画获胜高亮线
function drawWinLine(line) {
  const [a, b, c] = line;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = COLOR_WIN_LINE;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[1] * cellSize + cellSize/2, a[0] * cellSize + cellSize/2);
  ctx.lineTo(c[1] * cellSize + cellSize/2, c[0] * cellSize + cellSize/2);
  ctx.stroke();
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
  statusText.style.color = '#333';
  draw();
}

// 初始绘制
draw();