const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const cellSize = 90;
let board = [
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
];
let currentPlayer = 'X'; // X=玩家，O=电脑
let gameOver = false; // 游戏结束锁

canvas.addEventListener('click', handleClick);

// 玩家点击下棋
function handleClick(event) {
  if(gameOver || currentPlayer !== 'X') return;
  const x = Math.floor(event.offsetX / cellSize);
  const y = Math.floor(event.offsetY / cellSize);

  if (board[y][x] === '') {
    board[y][x] = currentPlayer;
    draw();
    if(checkWinner()) return;
    // 切换电脑走棋
    currentPlayer = 'O';
    setTimeout(aiMove,400); // 延迟0.4秒落子，模拟思考
  }
}

// AI电脑下棋（最优落子Minimax算法）
function aiMove(){
  if(gameOver) return;
  let bestScore = -Infinity;
  let bestPos = null;
  // 遍历所有空位
  for(let y=0;y<3;y++){
    for(let x=0;x<3;x++){
      if(board[y][x]===''){
        board[y][x]='O';
        let score = minimax(board,0,false);
        board[y][x]='';
        if(score>bestScore){
          bestScore=score;
          bestPos={x,y};
        }
      }
    }
  }
  // AI落子
  board[bestPos.y][bestPos.x]='O';
  draw();
  if(checkWinner()) return;
  currentPlayer='X';
}

// 极小极大AI评分
function minimax(bd,depth,isMax){
  let res = getWin(bd);
  if(res==='O') return 10-depth;
  if(res==='X') return depth-10;
  if(isFull(bd)) return 0;

  if(isMax){
    // AI最大化分数
    let maxS=-Infinity;
    for(let y=0;y<3;y++){
      for(let x=0;x<3;x++){
        if(bd[y][x]===''){
          bd[y][x]='O';
          let s=minimax(bd,depth+1,false);
          bd[y][x]='';
          maxS=Math.max(maxS,s);
        }
      }
    }
    return maxS;
  }else{
    // 玩家最小化分数
    let minS=Infinity;
    for(let y=0;y<3;y++){
      for(let x=0;x<3;x++){
        if(bd[y][x]===''){
          bd[y][x]='X';
          let s=minimax(bd,depth+1,true);
          bd[y][x]='';
          minS=Math.min(minS,s);
        }
      }
    }
    return minS;
  }
}

// 判断获胜
function getWin(bd){
  const lines = [
    [bd[0][0], bd[0][1], bd[0][2]],
    [bd[1][0], bd[1][1], bd[1][2]],
    [bd[2][0], bd[2][1], bd[2][2]],
    [bd[0][0], bd[1][0], bd[2][0]],
    [bd[0][1], bd[1][1], bd[2][1]],
    [bd[0][2], bd[1][2], bd[2][2]],
    [bd[0][0], bd[1][1], bd[2][2]],
    [bd[0][2], bd[1][1], bd[2][0]]
  ];
  for(let line of lines){
    if(line[0]!=''&&line[0]===line[1]&&line[1]===line[2]){
      return line[0];
    }
  }
  return null;
}

// 棋盘已满
function isFull(bd){
  return bd.flat().every(v=>v!=='');
}

// 绘制棋盘
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = j * cellSize;
      const y = i * cellSize;
      ctx.strokeRect(x, y, cellSize, cellSize);
      if (board[i][j] !== '') {
        ctx.font = '80px Arial';
        ctx.fillText(board[i][j], x + 20, y + 80);
      }
    }
  }
}

// 胜负弹窗
function checkWinner() {
  let win = getWin(board);
  if(win){
    alert(`${win} 获胜!`);
    gameOver=true;
    setTimeout(resetGame,100);
    return true;
  }
  if(isFull(board)){
    alert('平局！');
    gameOver=true;
    setTimeout(resetGame,100);
    return true;
  }
  return false;
}

// 重置游戏
function resetGame() {
  board = [['', '', ''],['', '', ''],['', '', '']];
  currentPlayer = 'X';
  gameOver=false;
  draw();
}

draw();