// ============================================================
// Chinese Chess (中国象棋) - Full Implementation
// ============================================================

// ---- Constants ----
const BOARD_COLS = 9;
const BOARD_ROWS = 10;
const CELL_SIZE = 64;
const PADDING = 32;
const BOARD_W = CELL_SIZE * (BOARD_COLS - 1);
const BOARD_H = CELL_SIZE * (BOARD_ROWS - 1);
const CANVAS_W = BOARD_W + PADDING * 2;
const CANVAS_H = BOARD_H + PADDING * 2;
const MOVE_TIME_LIMIT = 90;

const RED = 'r';
const BLACK = 'b';
const KING = 'k';
const ADVISOR = 'a';
const ELEPHANT = 'e';
const HORSE = 'h';
const ROOK = 'r';
const CANNON = 'c';
const PAWN = 'p';

const PIECE_NAMES = {};
PIECE_NAMES[RED + KING] = '帅';
PIECE_NAMES[BLACK + KING] = '将';
PIECE_NAMES[RED + ADVISOR] = '仕';
PIECE_NAMES[BLACK + ADVISOR] = '士';
PIECE_NAMES[RED + ELEPHANT] = '相';
PIECE_NAMES[BLACK + ELEPHANT] = '象';
PIECE_NAMES[RED + HORSE] = '傌';
PIECE_NAMES[BLACK + HORSE] = '馬';
PIECE_NAMES[RED + ROOK] = '俥';
PIECE_NAMES[BLACK + ROOK] = '車';
PIECE_NAMES[RED + CANNON] = '炮';
PIECE_NAMES[BLACK + CANNON] = '砲';
PIECE_NAMES[RED + PAWN] = '兵';
PIECE_NAMES[BLACK + PAWN] = '卒';

const PIECE_VALUES = {};
PIECE_VALUES[KING] = 10000;
PIECE_VALUES[ROOK] = 600;
PIECE_VALUES[CANNON] = 300;
PIECE_VALUES[HORSE] = 270;
PIECE_VALUES[ELEPHANT] = 120;
PIECE_VALUES[ADVISOR] = 120;
PIECE_VALUES[PAWN] = 30;

// Positional bonus tables (10x9, red's perspective, row 0 = black's back rank)
const POS_VALUES = {};
POS_VALUES[PAWN] = [
  [0,  0,  0,  0,  0,  0,  0,  0,  0],
  [90, 90,110,120,120,120,110, 90, 90],
  [90, 90,100,110,110,110,100, 90, 90],
  [70, 80, 90,100,100,100, 90, 80, 70],
  [60, 70, 80, 90, 90, 90, 80, 70, 60],
  [50, 60, 70, 80, 80, 80, 70, 60, 50],
  [40, 50, 60, 70, 70, 70, 60, 50, 40],
  [30, 40, 50, 60, 60, 60, 50, 40, 30],
  [20, 30, 40, 50, 50, 50, 40, 30, 20],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0]
];
POS_VALUES[HORSE] = [
  [ 4,  8, 16,12,  4, 12,16,  8,  4],
  [ 4, 10,28,16,  8, 16,28, 10,  4],
  [12, 14,16,20,18, 20,16, 14, 12],
  [ 8, 24,18,24,20, 24,18, 24,  8],
  [ 6, 16,14,18,16, 18,14, 16,  6],
  [ 4, 12,16,14,12, 14,16, 12,  4],
  [ 2,  6,  8,  6, 10,  6, 8,  6,  2],
  [ 4,  2,  8,  8,  4,  8,  8,  2,  4],
  [ 0,  2,  4,  4, -2,  4,  4,  2,  0],
  [ 0, -4,  0,  0,  0,  0,  0, -4,  0]
];
POS_VALUES[ROOK] = [
  [14,14,12,18,16,18,12,14,14],
  [16,20,18,24,26,24,18,20,16],
  [12,12,12,18,18,18,12,12,12],
  [12,18,16,22,22,22,16,18,12],
  [12,14,12,18,18,18,12,14,12],
  [12,16,14,20,20,20,14,16,12],
  [ 6,10, 8,14,14,14, 8,10, 6],
  [ 4, 8, 6,14,12,14, 6, 8, 4],
  [ 8, 4, 8,16, 8,16, 8, 4, 8],
  [-2,10, 6,14,12,14, 6,10,-2]
];
POS_VALUES[CANNON] = [
  [ 6, 4, 0,-10,-12,-10, 0, 4, 6],
  [ 2, 2, 0, -4, -14, -4, 0, 2, 2],
  [ 2, 2, 0,-10, -8,-10, 0, 2, 2],
  [ 0, 0, -2, 4, 10, 4,-2, 0, 0],
  [ 0, 0, 0, 2, 8, 2, 0, 0, 0],
  [-2, 0, 4, 2, 6, 2, 4, 0,-2],
  [ 0, 0, 0, 2, 4, 2, 0, 0, 0],
  [ 4, 0, 8, 6,10, 6, 8, 0, 4],
  [ 0, 2, 4, 6, 6, 6, 4, 2, 0],
  [ 0, 0, 2, 6, 6, 6, 2, 0, 0]
];

// ---- Helper Functions ----
function colorOf(piece) { return piece ? piece[0] : null; }
function typeOf(piece) { return piece ? piece[1] : null; }
function isRed(piece) { return colorOf(piece) === RED; }
function isBlack(piece) { return colorOf(piece) === BLACK; }
function sameColor(a, b) { return a && b && colorOf(a) === colorOf(b); }
function inBoard(r, c) { return r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS; }
function makePiece(color, type) { return color + type; }
function opponent(color) { return color === RED ? BLACK : RED; }
function isRedSide(r) { return r >= 5 && r <= 9; }
function inPalace(r, c, color) {
  if (c < 3 || c > 5) return false;
  if (color === RED) return r >= 7 && r <= 9;
  return r >= 0 && r <= 2;
}

function flipRow(r, flipped) { return flipped ? BOARD_ROWS - 1 - r : r; }
function flipCol(c, flipped) { return flipped ? BOARD_COLS - 1 - c : c; }
function boardX(c, flipped) { return PADDING + flipCol(c, flipped) * CELL_SIZE; }
function boardY(r, flipped) { return PADDING + flipRow(r, flipped) * CELL_SIZE; }
function shouldFlipBoard(mode, playerColor, computerColor) {
  if (mode === 'ai') return computerColor === RED;
  if (mode === 'lan' || mode === 'ranked') return playerColor === BLACK;
  return false;
}

// ---- Ranking Tier System ----
const TIERS = [
  { name: '王者', color: '#ffd700', minWins: 200 },
  { name: '钻石', color: '#00d2ff', minWins: 100 },
  { name: '铂金', color: '#5effc7', minWins: 60 },
  { name: '黄金', color: '#ffea00', minWins: 30 },
  { name: '白银', color: '#c0c0c0', minWins: 10 },
  { name: '青铜', color: '#cd7f32', minWins: 0 },
];

function getTier(wins) {
  for (const tier of TIERS) {
    if (wins >= tier.minWins) return tier;
  }
  return TIERS[TIERS.length - 1];
}

function getTierProgress(wins) {
  for (let i = 0; i < TIERS.length; i++) {
    if (wins >= TIERS[i].minWins) {
      const prev = TIERS[i - 1];
      if (prev) return { current: TIERS[i], next: prev, progress: wins - TIERS[i].minWins, needed: prev.minWins - TIERS[i].minWins };
      return { current: TIERS[i], next: null, progress: 0, needed: 0 };
    }
  }
  return { current: TIERS[TIERS.length - 1], next: TIERS[TIERS.length - 2] || null, progress: 0, needed: TIERS[TIERS.length - 2]?.minWins || 0 };
}

async function loadPlayerStats() {
  const platform = window.GagagaPlatform;
  if (!platform || !platform.api) return;
  try {
    const data = await platform.api('/api/leaderboards/chinese-chess?limit=100');
    const user = platform.getUser();
    if (!user) return;
    const record = (data.rows || []).find(row => row.userId === user.id);
    const wins = record ? record.wins : 0;
    const tier = getTier(wins);
    const progress = getTierProgress(wins);
    const tierBadge = document.getElementById('tier-badge');
    if (tierBadge) {
      tierBadge.textContent = tier.name;
      tierBadge.style.color = tier.color;
    }
    const tierProgress = document.getElementById('tier-progress');
    if (tierProgress && progress.next) {
      tierProgress.textContent = `${progress.progress}/${progress.needed} → ${progress.next.name}`;
    } else if (tierProgress) {
      tierProgress.textContent = '已达最高段位';
    }
  } catch (e) {
    // Silently fail, tier display is non-critical
  }
}

// ---- Board Initialization ----
function createInitialBoard() {
  const b = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  const backRank = [ROOK, HORSE, ELEPHANT, ADVISOR, KING, ADVISOR, ELEPHANT, HORSE, ROOK];
  for (let c = 0; c < BOARD_COLS; c++) {
    b[0][c] = makePiece(BLACK, backRank[c]);
    b[9][c] = makePiece(RED, backRank[c]);
  }
  b[2][1] = makePiece(BLACK, CANNON); b[2][7] = makePiece(BLACK, CANNON);
  b[7][1] = makePiece(RED, CANNON); b[7][7] = makePiece(RED, CANNON);
  for (let c = 0; c < BOARD_COLS; c += 2) {
    b[3][c] = makePiece(BLACK, PAWN);
    b[6][c] = makePiece(RED, PAWN);
  }
  return b;
}

function cloneBoard(board) {
  return board.map(row => [...row]);
}

// ---- Move Generation ----
function generateRawMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = colorOf(piece);
  const type = typeOf(piece);
  const moves = [];
  const add = (tr, tc) => { if (inBoard(tr, tc) && !sameColor(piece, board[tr][tc])) moves.push([tr, tc]); };

  switch (type) {
    case KING: {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inPalace(nr, nc, color)) add(nr, nc);
      }
      break;
    }
    case ADVISOR: {
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inPalace(nr, nc, color)) add(nr, nc);
      }
      break;
    }
    case ELEPHANT: {
      for (const [dr, dc] of [[-2,-2],[-2,2],[2,-2],[2,2]]) {
        const nr = r + dr, nc = c + dc;
        const br = r + dr / 2, bc = c + dc / 2;
        if (inBoard(nr, nc) && !board[br][bc] && !(color === RED ? (nr < 5) : (nr > 4))) add(nr, nc);
      }
      break;
    }
    case HORSE: {
      const blocks = [[-1,0, -2,-1],[-1,0,-2,1],[1,0,2,-1],[1,0,2,1],[0,-1,-1,-2],[0,-1,1,-2],[0,1,-1,2],[0,1,1,2]];
      for (const [br, bc, tr, tc] of blocks) {
        const nr = r + tr, nc = c + tc;
        if (inBoard(nr, nc) && !board[r + br][c + bc]) add(nr, nc);
      }
      break;
    }
    case ROOK: {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        let nr = r + dr, nc = c + dc;
        while (inBoard(nr, nc)) {
          if (board[nr][nc]) {
            if (!sameColor(piece, board[nr][nc])) moves.push([nr, nc]);
            break;
          }
          moves.push([nr, nc]);
          nr += dr; nc += dc;
        }
      }
      break;
    }
    case CANNON: {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        let nr = r + dr, nc = c + dc;
        let jumped = false;
        while (inBoard(nr, nc)) {
          if (!jumped) {
            if (board[nr][nc]) { jumped = true; }
            else { moves.push([nr, nc]); }
          } else {
            if (board[nr][nc]) {
              if (!sameColor(piece, board[nr][nc])) moves.push([nr, nc]);
              break;
            }
          }
          nr += dr; nc += dc;
        }
      }
      break;
    }
    case PAWN: {
      const forward = color === RED ? -1 : 1;
      if (inBoard(r + forward, c)) add(r + forward, c);
      const crossed = color === RED ? r <= 4 : r >= 5;
      if (crossed) {
        if (inBoard(r, c - 1)) add(r, c - 1);
        if (inBoard(r, c + 1)) add(r, c + 1);
      }
      break;
    }
  }
  return moves;
}

// Check if two kings are facing each other (flying general)
function kingsAreFacing(board) {
  let rkR = -1, rkC = -1, bkR = -1, bkC = -1;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && typeOf(p) === KING) {
        if (colorOf(p) === RED) { rkR = r; rkC = c; }
        else { bkR = r; bkC = c; }
      }
    }
  }
  if (rkC !== bkC) return false;
  for (let r = Math.min(rkR, bkR) + 1; r < Math.max(rkR, bkR); r++) {
    if (board[r][rkC]) return false;
  }
  return true;
}

// Check if a color is in check
function isInCheck(board, color) {
  // Find king
  let kingR = -1, kingC = -1;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && typeOf(p) === KING && colorOf(p) === color) {
        kingR = r; kingC = c; break;
      }
    }
    if (kingR >= 0) break;
  }
  if (kingR < 0) return true; // king captured = in check

  const opp = opponent(color);
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && colorOf(p) === opp) {
        const raw = generateRawMoves(board, r, c);
        for (const [tr, tc] of raw) {
          if (tr === kingR && tc === kingC) return true;
        }
      }
    }
  }

  // Flying general check
  if (kingsAreFacing(board)) return true;

  return false;
}

// Generate legal moves (filter out those that leave own king in check)
function generateLegalMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const raw = generateRawMoves(board, r, c);
  const legal = [];
  for (const [tr, tc] of raw) {
    const nb = cloneBoard(board);
    nb[tr][tc] = nb[r][c];
    nb[r][c] = null;
    if (!isInCheck(nb, colorOf(piece)) && !kingsAreFacing(nb)) {
      legal.push([tr, tc]);
    }
  }
  return legal;
}

function getAllLegalMoves(board, color) {
  const all = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (p && colorOf(p) === color) {
        const moves = generateLegalMoves(board, r, c);
        for (const m of moves) all.push({ fromR: r, fromC: c, toR: m[0], toC: m[1], piece: p });
      }
    }
  }
  return all;
}

// ---- Game State ----
class GameState {
  constructor() {
    this.board = createInitialBoard();
    this.turn = RED;
    this.moveHistory = [];
    this.selected = null;
    this.legalMoves = [];
    this.status = 'playing'; // 'playing', 'checkmate', 'stalemate', 'resigned'
    this.winner = null;
    this.mode = 'ai'; // 'ai', 'local', 'lan'
    this.aiColor = BLACK;
    this.aiDepth = 3;
    this.moveCount = 0;
    this.lastMove = null;
    this.capturedByRed = [];
    this.capturedByBlack = [];
    this.flipped = false;
    this.redTime = MOVE_TIME_LIMIT;
    this.blackTime = MOVE_TIME_LIMIT;
    this.timerConfig = MOVE_TIME_LIMIT;
    this.timerInterval = null;
  }

  reset() {
    this.board = createInitialBoard();
    this.turn = RED;
    this.moveHistory = [];
    this.selected = null;
    this.legalMoves = [];
    this.status = 'playing';
    this.winner = null;
    this.moveCount = 0;
    this.lastMove = null;
    this.capturedByRed = [];
    this.capturedByBlack = [];
    this.flipped = false;
    this.stopTimer();
    this.resetMoveTimer();
  }

  resetMoveTimer() {
    this.redTime = this.timerConfig;
    this.blackTime = this.timerConfig;
  }

  startTimer(onTimeout) {
    this.stopTimer();
    this._timeoutCallback = onTimeout;
    this.timerInterval = setInterval(() => {
      if (this.status !== 'playing' && this.status !== 'check') {
        this.stopTimer();
        return;
      }
      if (this.turn === RED) {
        this.redTime--;
        if (this.redTime <= 0) { this.redTime = 0; this.stopTimer(); if (onTimeout) onTimeout(RED); }
      } else {
        this.blackTime--;
        if (this.blackTime <= 0) { this.blackTime = 0; this.stopTimer(); if (onTimeout) onTimeout(BLACK); }
      }
      this.updateTimerDisplay();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  updateTimerDisplay() {
    const redEl = document.getElementById('red-timer');
    const blackEl = document.getElementById('black-timer');
    if (redEl) redEl.textContent = this.formatTime(this.redTime);
    if (blackEl) blackEl.textContent = this.formatTime(this.blackTime);
    if (this.redTime < 60) {
      redEl?.classList.add('timer-warning');
    } else {
      redEl?.classList.remove('timer-warning');
    }
    if (this.blackTime < 60) {
      blackEl?.classList.add('timer-warning');
    } else {
      blackEl?.classList.remove('timer-warning');
    }
  }

  makeMove(fromR, fromC, toR, toC) {
    const piece = this.board[fromR][fromC];
    if (!piece) return false;
    if (colorOf(piece) !== this.turn) return false;
    const legal = generateLegalMoves(this.board, fromR, fromC);
    let valid = false;
    for (const [tr, tc] of legal) {
      if (tr === toR && tc === toC) { valid = true; break; }
    }
    if (!valid) return false;

    // Record captured piece
    const captured = this.board[toR][toC];
    if (captured) {
      if (this.turn === RED) this.capturedByRed.push(captured);
      else this.capturedByBlack.push(captured);
    }

    // Execute move
    this.board[toR][toC] = piece;
    this.board[fromR][fromC] = null;
    this.moveHistory.push({ fromR, fromC, toR, toC, piece, captured, fen: this.toFen() });
    this.lastMove = { fromR, fromC, toR, toC };
    this.moveCount++;

    // Check game end
    const opp = opponent(this.turn);
    const oppMoves = getAllLegalMoves(this.board, opp);
    const inCheck = isInCheck(this.board, opp);

    if (oppMoves.length === 0) {
      if (inCheck) {
        this.status = 'checkmate';
        this.winner = this.turn;
      } else {
        this.status = 'stalemate';
      }
    } else if (inCheck) {
      this.status = 'check';
    } else {
      this.status = 'playing';
    }

    this.turn = opp;
    this.resetMoveTimer();
    this.selected = null;
    this.legalMoves = [];
    return true;
  }

  undoLastMove() {
    if (this.moveHistory.length === 0) return false;
    // Undo two moves in AI mode to undo both player and AI move
    const undoCount = this.mode === 'ai' ? Math.min(2, this.moveHistory.length) : 1;
    for (let i = 0; i < undoCount; i++) {
      const mv = this.moveHistory.pop();
      this.board[mv.fromR][mv.fromC] = mv.piece;
      this.board[mv.toR][mv.toC] = mv.captured;
      if (mv.captured) {
        if (colorOf(mv.piece) === RED) this.capturedByRed.pop();
        else this.capturedByBlack.pop();
      }
      this.moveCount--;
      this.turn = colorOf(mv.piece);
    }
    this.status = 'playing';
    this.winner = null;
    this.selected = null;
    this.legalMoves = [];
    this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null;
    this.resetMoveTimer();
    return true;
  }

  toFen() {
    // Simplified FEN-like representation for move history
    let fen = '';
    for (let r = 0; r < BOARD_ROWS; r++) {
      let empty = 0;
      for (let c = 0; c < BOARD_COLS; c++) {
        const p = this.board[r][c];
        if (p) {
          if (empty > 0) { fen += empty; empty = 0; }
          fen += p;
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (r < BOARD_ROWS - 1) fen += '/';
    }
    return fen;
  }
}

// ---- AI Engine ----
function evaluatePieceMaterial(type) {
  return PIECE_VALUES[type] || 0;
}

function evaluateBoard(board) {
  let score = 0;

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      const color = colorOf(p);
      const type = typeOf(p);
      const val = evaluatePieceMaterial(type);

      // Material
      if (color === RED) score += val;
      else score -= val;

      // Position
      const posRow = color === RED ? BOARD_ROWS - 1 - r : r;
      if (POS_VALUES[type] && POS_VALUES[type][posRow]) {
        const posVal = POS_VALUES[type][posRow][c];
        if (color === RED) score += posVal;
        else score -= posVal;
      }
    }
  }

  // Mobility evaluation (rough)
  const redMoves = getAllLegalMoves(board, RED).length;
  const blackMoves = getAllLegalMoves(board, BLACK).length;
  score += (redMoves - blackMoves) * 3;

  // Check bonus
  if (isInCheck(board, RED)) score -= 50;
  if (isInCheck(board, BLACK)) score += 50;

  return score;
}

function orderMoves(color, moves, board) {
  return moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    const capA = board[a.toR][a.toC];
    const capB = board[b.toR][b.toC];
    if (capA) scoreA += PIECE_VALUES[typeOf(capA)] * 10;
    if (capB) scoreB += PIECE_VALUES[typeOf(capB)] * 10;
    // Check bonus
    const nbA = cloneBoard(board);
    nbA[a.toR][a.toC] = nbA[a.fromR][a.fromC];
    nbA[a.fromR][a.fromC] = null;
    if (isInCheck(nbA, opponent(color))) scoreA += 50;
    const nbB = cloneBoard(board);
    nbB[b.toR][b.toC] = nbB[b.fromR][b.fromC];
    nbB[b.fromR][b.fromC] = null;
    if (isInCheck(nbB, opponent(color))) scoreB += 50;
    return scoreB - scoreA;
  });
}

function minimax(board, depth, alpha, beta, maximizing, aiColor, gameState) {
  if (depth === 0) {
    return { score: evaluateBoard(board) };
  }

  const color = maximizing ? aiColor : opponent(aiColor);
  const moves = getAllLegalMoves(board, color);

  if (moves.length === 0) {
    const inCheck = isInCheck(board, color);
    if (inCheck) {
      return { score: maximizing ? -99999 + (aiDepth - depth) : 99999 - (aiDepth - depth) };
    }
    return { score: 0 };
  }

  const ordered = orderMoves(color, moves, board);
  let bestMove = ordered[0];

  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of ordered) {
      const nb = cloneBoard(board);
      nb[m.toR][m.toC] = nb[m.fromR][m.fromC];
      nb[m.fromR][m.fromC] = null;
      const prevStatus = gameState.status;
      const result = minimax(nb, depth - 1, alpha, beta, false, aiColor, gameState);
      gameState.status = prevStatus;
      if (result.score > maxEval) {
        maxEval = result.score;
        bestMove = m;
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, ...bestMove };
  } else {
    let minEval = Infinity;
    for (const m of ordered) {
      const nb = cloneBoard(board);
      nb[m.toR][m.toC] = nb[m.fromR][m.fromC];
      nb[m.fromR][m.fromC] = null;
      const prevStatus = gameState.status;
      const result = minimax(nb, depth - 1, alpha, beta, true, aiColor, gameState);
      gameState.status = prevStatus;
      if (result.score < minEval) {
        minEval = result.score;
        bestMove = m;
      }
      beta = Math.min(beta, result.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, ...bestMove };
  }
}

function getAIMove(gameState) {
  const result = minimax(gameState.board, gameState.aiDepth, -Infinity, Infinity, true, gameState.aiColor, gameState);
  if (result.fromR === undefined) {
    const moves = getAllLegalMoves(gameState.board, gameState.aiColor);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }
  return result;
}

// ---- Canvas Rendering ----
const canvas = document.getElementById('chessBoard');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

function toBoardCoords(mx, my) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (mx - rect.left) * scaleX;
  const y = (my - rect.top) * scaleY;
  const rawC = Math.round((x - PADDING) / CELL_SIZE);
  const rawR = Math.round((y - PADDING) / CELL_SIZE);
  const flipped = currentGame && currentGame.flipped;
  const c = flipped ? BOARD_COLS - 1 - rawC : rawC;
  const r = flipped ? BOARD_ROWS - 1 - rawR : rawR;
  if (inBoard(r, c)) return { r, c };
  return null;
}

function drawBoard(gameState, highlightMoves) {
  const W = canvas.width, H = canvas.height;
  const flipped = gameState.flipped;
  ctx.clearRect(0, 0, W, H);

  // Board background
  ctx.fillStyle = '#f4e4c1';
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(PADDING - 8, PADDING - 8, BOARD_W + 16, BOARD_H + 16);

  // Grid lines
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1.5;

  // Horizontal lines
  for (let r = 0; r < BOARD_ROWS; r++) {
    const y = boardY(r, flipped);
    ctx.beginPath();
    ctx.moveTo(boardX(0, flipped), y);
    ctx.lineTo(boardX(BOARD_COLS - 1, flipped), y);
    ctx.stroke();
  }

  // Vertical lines (split at river)
  const riverTopY = boardY(4, flipped);
  const riverBotY = boardY(5, flipped);
  for (let c = 0; c < BOARD_COLS; c++) {
    const x = boardX(c, flipped);
    const y0 = boardY(0, flipped);
    const y9 = boardY(9, flipped);
    if (c === 0 || c === BOARD_COLS - 1) {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, Math.min(riverTopY, riverBotY));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, Math.max(riverTopY, riverBotY));
      ctx.lineTo(x, y9);
      ctx.stroke();
    }
  }

  // Palace diagonal lines
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1;
  // Top palace (black's palace)
  const palaceTopX0 = boardX(3, flipped), palaceTopY0 = boardY(0, flipped);
  const palaceTopX2 = boardX(5, flipped), palaceTopY2 = boardY(2, flipped);
  ctx.beginPath();
  ctx.moveTo(palaceTopX0, palaceTopY0);
  ctx.lineTo(palaceTopX2, palaceTopY2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(palaceTopX2, palaceTopY0);
  ctx.lineTo(palaceTopX0, palaceTopY2);
  ctx.stroke();
  // Bottom palace (red's palace)
  const palaceBotX0 = boardX(3, flipped), palaceBotY0 = boardY(7, flipped);
  const palaceBotX2 = boardX(5, flipped), palaceBotY2 = boardY(9, flipped);
  ctx.beginPath();
  ctx.moveTo(palaceBotX0, palaceBotY0);
  ctx.lineTo(palaceBotX2, palaceBotY2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(palaceBotX2, palaceBotY0);
  ctx.lineTo(palaceBotX0, palaceBotY2);
  ctx.stroke();

  // River text
  ctx.fillStyle = '#5a3a1a';
  ctx.font = 'bold 32px "KaiTi", "STKaiti", "SimSun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const riverY = boardY(4.5, flipped);
  const leftTextX = boardX(1.5, flipped);
  const rightTextX = boardX(6.5, flipped);
  const leftText = flipped ? '漢 界' : '楚 河';
  const rightText = flipped ? '楚 河' : '漢 界';
  ctx.fillText(leftText, leftTextX, riverY);
  ctx.fillText(rightText, rightTextX, riverY);

  // Position markers (star points)
  const starOffsets = [[0,1],[0,7],[2,0],[2,2],[2,4],[2,6],[2,8],[3,0],[3,2],[3,4],[3,6],[3,8],
                       [6,0],[6,2],[6,4],[6,6],[6,8],[7,0],[7,2],[7,4],[7,6],[7,8],[9,1],[9,7]];
  for (const [r, c] of starOffsets) {
    drawStarMark(ctx, boardX(c, flipped), boardY(r, flipped));
  }

  // Last move animation
  if (gameState.lastMove) {
    const fromX = boardX(gameState.lastMove.fromC, flipped);
    const fromY = boardY(gameState.lastMove.fromR, flipped);
    const toX = boardX(gameState.lastMove.toC, flipped);
    const toY = boardY(gameState.lastMove.toR, flipped);

    // Pulsing highlights on from/to squares
    const pulseAlpha = lastMoveAnimation
      ? 0.3 + 0.15 * Math.sin((Date.now() - lastMoveAnimation.startTime) / 200)
      : 0.3;

    ctx.fillStyle = `rgba(241, 196, 15, ${pulseAlpha})`;
    ctx.fillRect(fromX - CELL_SIZE / 2, fromY - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = `rgba(46, 204, 113, ${pulseAlpha + 0.05})`;
    ctx.fillRect(toX - CELL_SIZE / 2, toY - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);

    // Animated arrow from source to destination
    drawArrow(ctx, fromX, fromY, toX, toY, '#f39c12', 0.7);
  }

  // Legal move indicators
  if (highlightMoves) {
    for (const [tr, tc] of gameState.legalMoves) {
      const x = boardX(tc, flipped);
      const y = boardY(tr, flipped);
      const target = gameState.board[tr][tc];
      if (target) {
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(39, 174, 96, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Selected piece highlight
  if (gameState.selected) {
    const { r, c } = gameState.selected;
    const x = boardX(c, flipped);
    const y = boardY(r, flipped);
    ctx.fillStyle = 'rgba(241, 196, 15, 0.35)';
    ctx.fillRect(x - CELL_SIZE / 2, y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - CELL_SIZE / 2, y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
  }

  // Check indicator
  if (gameState.status === 'check') {
    const checkedColor = gameState.turn;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const p = gameState.board[r][c];
        if (p && typeOf(p) === KING && colorOf(p) === checkedColor) {
          const x = boardX(c, flipped);
          const y = boardY(r, flipped);
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, CELL_SIZE / 2 + 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#f1c40f';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, CELL_SIZE / 2 + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  // Pieces
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = gameState.board[r][c];
      if (p) drawPiece(ctx, p, r, c, flipped);
    }
  }
}

function drawArrow(ctx, fromX, fromY, toX, toY, color, alpha) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;

  const ux = dx / dist;
  const uy = dy / dist;
  const headSize = Math.min(14, dist * 0.3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX + ux * 20, fromY + uy * 20);
  ctx.lineTo(toX - ux * (20 + headSize * 0.7), toY - uy * (20 + headSize * 0.7));
  ctx.stroke();

  const perpX = -uy * headSize * 0.5;
  const perpY = ux * headSize * 0.5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX - ux * (20 + headSize * 0.2), toY - uy * (20 + headSize * 0.2) + perpY * 0.3);
  ctx.lineTo(toX - ux * 20, toY - uy * 20);
  ctx.lineTo(toX - ux * (20 + headSize * 0.2), toY - uy * (20 + headSize * 0.2) - perpY * 0.3);
  ctx.fill();

  ctx.restore();
}

function drawStarMark(ctx, x, y) {
  const s = 6, g = 2;
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1;
  const parts = [
    [[-s-g, -s], [-g, -s]], [[g, -s], [s+g, -s]],
    [[-s-g, s], [-g, s]], [[g, s], [s+g, s]],
    [[-s, -s-g], [-s, -g]], [[s, -s-g], [s, -g]],
    [[-s, g], [-s, s+g]], [[s, g], [s, s+g]]
  ];
  for (const [from, to] of parts) {
    ctx.beginPath();
    ctx.moveTo(x + from[0], y + from[1]);
    ctx.lineTo(x + to[0], y + to[1]);
    ctx.stroke();
  }
}

function drawPiece(ctx, piece, r, c, flipped) {
  const x = boardX(c, flipped);
  const y = boardY(r, flipped);
  const radius = CELL_SIZE / 2 - 3;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
  ctx.fill();

  // Piece base
  const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, radius);
  const isRedPiece = isRed(piece);
  if (isRedPiece) {
    grad.addColorStop(0, '#fff5e6');
    grad.addColorStop(0.7, '#f5deb3');
    grad.addColorStop(1, '#d4a574');
  } else {
    grad.addColorStop(0, '#fff5e6');
    grad.addColorStop(0.7, '#f5deb3');
    grad.addColorStop(1, '#d4a574');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = isRedPiece ? '#c0392b' : '#1c1c1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = isRedPiece ? '#e74c3c' : '#34495e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
  ctx.stroke();

  // Character
  const name = PIECE_NAMES[piece] || piece;
  ctx.fillStyle = isRedPiece ? '#c0392b' : '#1c1c1c';
  ctx.font = 'bold 30px "KaiTi", "STKaiti", "SimSun", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, x, y + 1);

  // Highlight for selected piece
  if (piece) {
    const game = currentGame;
    if (game && game.selected && game.selected.r === r && game.selected.c === c) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ---- UI Controller ----
let currentGame = null;
let aiThinking = false;
let netManager = null;
let lastMoveAnimation = null;
const MOVE_ANIM_DURATION = 600;
let chessLeaderboardSubmitted = false;
let chatMessages = [];
let rankedOpponent = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addChatMessage(username, text, isLocal) {
  chatMessages.push({ username, text, isLocal, time: new Date() });
  if (chatMessages.length > 100) chatMessages.shift();
  renderChat();
}

function renderChat() {
  const chatDiv = document.getElementById('chat-messages');
  const chatPanel = document.getElementById('chat-panel');
  if (!chatDiv || !chatPanel) return;
  const visible = currentGame && isOnlineGame();
  chatPanel.style.display = visible ? 'flex' : 'none';
  if (!visible) return;

  chatDiv.innerHTML = '';
  for (const msg of chatMessages) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    const timeStr = msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `<span class="chat-time">${timeStr}</span>
      <span class="chat-user">${escapeHtml(msg.username || '玩家')}:</span>
      <span class="chat-text">${escapeHtml(msg.text)}</span>`;
    chatDiv.appendChild(div);
  }
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || text.length > 500) return;
  input.value = '';
  const myName = (window.GagagaPlatform && window.GagagaPlatform.getUser && window.GagagaPlatform.getUser().username) || '我';
  addChatMessage(myName, text, true);
  if (netManager) {
    netManager.send({ type: 'chat', text });
  }
}

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const resultModal = document.getElementById('result-modal');
const mainMenu = document.getElementById('main-menu');
const lanMenu = document.getElementById('lan-menu');
const lanCreate = document.getElementById('lan-create');
const lanJoin = document.getElementById('lan-join');
const rankedMenu = document.getElementById('ranked-menu');
const modeLabel = document.getElementById('mode-label');
const playersRow = document.getElementById('players-row');
const playersLabel = document.getElementById('players-label');
const turnLabel = document.getElementById('turn-label');
const checkLabel = document.getElementById('check-label');
const moveHistoryDiv = document.getElementById('move-history');
const resultTitle = document.getElementById('result-title');
const resultText = document.getElementById('result-text');
const resultTitleBadge = document.getElementById('result-title-badge');
const roomCodeDisplay = document.getElementById('room-code');
const createStatus = document.getElementById('create-status');
const joinStatus = document.getElementById('join-status');
const serverUrlInput = document.getElementById('server-url-input');
const joinCodeInput = document.getElementById('join-code-input');
const rankedPlayerName = document.getElementById('ranked-player-name');
const rankedRecord = document.getElementById('ranked-record');
const rankedCurrentTitle = document.getElementById('ranked-current-title');
const rankedStatus = document.getElementById('ranked-status');
const rankedStartBtn = document.getElementById('ranked-start-btn');
const rankedCancelBtn = document.getElementById('ranked-cancel-btn');

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (screen) screen.classList.add('active');
}

function showMenuSection(id) {
  document.querySelectorAll('#menu-screen > .menu-card').forEach(el => el.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

function startGame(mode, aiDepth, aiColor) {
  currentGame = new GameState();
  currentGame.mode = mode;
  currentGame.aiDepth = aiDepth || 3;
  currentGame.aiColor = aiColor || BLACK;
  currentGame.turn = RED; // Red always goes first

  if (mode === 'ai') {
    modeLabel.textContent = `人机对战 (${aiDepth === 2 ? '简单' : aiDepth === 4 ? '困难' : '中等'})`;
  } else if (mode === 'local') {
    modeLabel.textContent = '本地双人对战';
  } else if (mode === 'lan') {
    modeLabel.textContent = '局域网对战';
  } else if (mode === 'ranked') {
    modeLabel.textContent = '排位对战';
  }

  if (mode === 'ranked' && netManager && rankedOpponent) {
    const me = window.GagagaPlatform?.getUser?.();
    const redName = netManager.myColor === RED ? me?.username : rankedOpponent.username;
    const blackName = netManager.myColor === BLACK ? me?.username : rankedOpponent.username;
    playersLabel.textContent = `红方 ${redName || '玩家'} vs 黑方 ${blackName || '玩家'}`;
    playersRow.style.display = 'block';
  } else {
    playersRow.style.display = 'none';
  }

  showScreen(gameScreen);
  aiThinking = false;
  lastMoveAnimation = null;
  chessLeaderboardSubmitted = false;
  chatMessages = [];
  renderChat();
  loadPlayerStats();

  currentGame.flipped = shouldFlipBoard(mode, netManager?.myColor, aiColor);

  // Each move has an independent 90-second limit by default.
  const timerParam = new URLSearchParams(location.search).get('timer');
  currentGame.timerConfig = parseInt(timerParam) || MOVE_TIME_LIMIT;
  currentGame.resetMoveTimer();
  currentGame.updateTimerDisplay();
  currentGame.startTimer((loser) => {
    const winner = opponent(loser);
    currentGame.status = 'checkmate';
    currentGame.winner = winner;
    updateUI();
    render();
    submitChessResult(winner);
    if (netManager && isOnlineGame()) {
      netManager.send({ type: 'timeout', loser });
    }
    showResult('时间耗尽', `${loser === RED ? '红方' : '黑方'}超时，${winner === RED ? '红方' : '黑方'}获胜！`);
  });

  updateUI();
  render();
}

function updateUI() {
  if (!currentGame) return;

  // Turn indicator
  const turn = currentGame.turn;
  turnLabel.textContent = turn === RED ? '红方' : '黑方';
  turnLabel.className = 'turn-indicator ' + (turn === RED ? 'turn-red' : 'turn-black');

  // Check indicator
  if (currentGame.status === 'check') {
    checkLabel.style.display = 'block';
  } else {
    checkLabel.style.display = 'none';
  }

  // Move history
  updateMoveHistory();

  // Undo button visibility
  const undoBtn = document.getElementById('undo-btn');
  if (currentGame.mode === 'lan' || currentGame.mode === 'ranked') {
    undoBtn.style.display = 'none';
  } else {
    undoBtn.style.display = 'block';
  }
}

function updateMoveHistory() {
  moveHistoryDiv.innerHTML = '';
  const history = currentGame.moveHistory;
  // Show last 50 moves
  const start = Math.max(0, history.length - 50);
  for (let i = start; i < history.length; i++) {
    const mv = history[i];
    const color = colorOf(mv.piece);
    const name = PIECE_NAMES[mv.piece] || '?';
    const fromStr = String.fromCharCode(97 + mv.fromC) + (BOARD_ROWS - mv.fromR);
    const toStr = String.fromCharCode(97 + mv.toC) + (BOARD_ROWS - mv.toR);
    const captureStr = mv.captured ? 'x' : '-';
    const div = document.createElement('div');
    div.style.color = color === RED ? '#e74c3c' : '#95a5a6';
    div.textContent = `${Math.floor(i/2)+1}. ${name}${fromStr}${captureStr}${toStr}`;
    moveHistoryDiv.appendChild(div);
  }
  moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
}

function render() {
  if (!currentGame) return;
  const moves = currentGame.selected ? currentGame.legalMoves : [];
  drawBoard(currentGame, currentGame.selected !== null);

  if (lastMoveAnimation) {
    if (Date.now() - lastMoveAnimation.startTime < lastMoveAnimation.duration) {
      requestAnimationFrame(render);
    } else {
      lastMoveAnimation = null;
    }
  }
}

function showResult(title, text, earnedTitle = false) {
  resultTitle.textContent = title;
  resultText.textContent = text;
  resultTitleBadge.classList.toggle('active', earnedTitle);
  resultModal.classList.add('active');
}

function localChessColor() {
  if (!currentGame) return RED;
  if ((currentGame.mode === 'lan' || currentGame.mode === 'ranked') && netManager) return netManager.myColor;
  if (currentGame.mode === 'ai') return opponent(currentGame.aiColor);
  return RED;
}

function submitChessResult(winner) {
  const result = winner === 'draw' ? 'draw' : (winner === localChessColor() ? 'win' : 'loss');
  return submitChessOutcome(result);
}

function submitChessOutcome(result) {
  if (chessLeaderboardSubmitted || !window.GagagaPlatform) return Promise.resolve();
  chessLeaderboardSubmitted = true;
  return window.GagagaPlatform
    .submitScore('chinese-chess', { result }, `chess:${Date.now()}:${result}`)
    .then(() => loadRankedProfile());
}

function isOnlineGame() {
  return currentGame && (currentGame.mode === 'lan' || currentGame.mode === 'ranked');
}

async function loadRankedProfile() {
  const platform = window.GagagaPlatform;
  const user = platform?.getUser?.();
  rankedPlayerName.textContent = user?.username || '未登录';

  if (!user || !platform?.api) {
    rankedRecord.textContent = '登录后查看';
    rankedCurrentTitle.textContent = '暂无';
    rankedCurrentTitle.className = '';
    return;
  }

  try {
    const data = await platform.api('/api/leaderboards/chinese-chess?limit=100');
    const record = (data.rows || []).find((row) => row.userId === user.id);
    rankedRecord.textContent = record
      ? `${record.wins || 0} 胜 / ${record.losses || 0} 负 / ${record.draws || 0} 和`
      : '0 胜 / 0 负 / 0 和';
    const hasTitle = Boolean(record?.wins);
    rankedCurrentTitle.textContent = hasTitle ? '天才少年' : '暂无';
    rankedCurrentTitle.className = hasTitle ? 'rank-title' : '';
  } catch (error) {
    rankedRecord.textContent = '战绩加载失败';
  }
}

function handleBoardClick(mx, my) {
  if (!currentGame || aiThinking) return;
  if (currentGame.status === 'checkmate' || currentGame.status === 'stalemate') return;

  const pos = toBoardCoords(mx, my);
  if (!pos) return;
  const { r, c } = pos;

  // Online mode: only allow clicking when it's the local player's turn
  if (isOnlineGame() && netManager) {
    const localColor = netManager.myColor;
    if (currentGame.turn !== localColor) return;
  }

  // AI mode: only allow clicking when it's human's turn
  if (currentGame.mode === 'ai' && currentGame.turn === currentGame.aiColor) return;

  // If no piece selected
  if (!currentGame.selected) {
    const piece = currentGame.board[r][c];
    if (piece && colorOf(piece) === currentGame.turn) {
      currentGame.selected = { r, c };
      currentGame.legalMoves = generateLegalMoves(currentGame.board, r, c);
      render();
    }
    return;
  }

  // If piece selected
  const { r: fromR, c: fromC } = currentGame.selected;

  // Clicking on own piece — switch selection
  const clicked = currentGame.board[r][c];
  if (clicked && colorOf(clicked) === currentGame.turn) {
    currentGame.selected = { r, c };
    currentGame.legalMoves = generateLegalMoves(currentGame.board, r, c);
    render();
    return;
  }

  // Try to move
  const success = currentGame.makeMove(fromR, fromC, r, c);
  if (success) {
    const color = colorOf(currentGame.board[r][c]);
    currentGame.selected = null;
    currentGame.legalMoves = [];
    updateUI();

    // Start last move animation
    if (currentGame.lastMove) {
      lastMoveAnimation = {
        fromR: currentGame.lastMove.fromR,
        fromC: currentGame.lastMove.fromC,
        toR: currentGame.lastMove.toR,
        toC: currentGame.lastMove.toC,
        startTime: Date.now(),
        duration: MOVE_ANIM_DURATION,
      };
    }
    render();

    // Check game end
    if (currentGame.status === 'checkmate') {
      submitChessResult(currentGame.winner);
      showResult('将杀！', `${color === RED ? '红方' : '黑方'}获胜！`);
      if (netManager && isOnlineGame()) {
        netManager.send({ type: 'move', fromR, fromC, toR: r, toC: c, status: 'checkmate', winner: currentGame.winner });
      }
      return;
    }
    if (currentGame.status === 'stalemate') {
      submitChessResult('draw');
      showResult('和棋！', '双方平局。');
      if (netManager && isOnlineGame()) {
        netManager.send({ type: 'move', fromR, fromC, toR: r, toC: c, status: 'stalemate' });
      }
      return;
    }

    // Send move in online modes
    if (netManager && isOnlineGame()) {
      netManager.send({ type: 'move', fromR, fromC, toR: r, toC: c });
    }

    // Trigger AI move
    if (currentGame.mode === 'ai' && currentGame.turn === currentGame.aiColor && (currentGame.status === 'playing' || currentGame.status === 'check')) {
      aiThinking = true;
      currentGame.stopTimer();
      setTimeout(() => {
        doAIMove();
        if (currentGame && (currentGame.status === 'playing' || currentGame.status === 'check')) {
          currentGame.startTimer(currentGame._timeoutCallback);
        }
      }, 100);
    }
  } else {
    // Invalid move - deselect
    currentGame.selected = null;
    currentGame.legalMoves = [];
    render();
  }
}

function doAIMove() {
  if (!currentGame || (currentGame.status !== 'playing' && currentGame.status !== 'check')) {
    aiThinking = false;
    return;
  }

  const move = getAIMove(currentGame);
  if (!move) {
    aiThinking = false;
    // AI has no moves
    if (isInCheck(currentGame.board, currentGame.aiColor)) {
      currentGame.status = 'checkmate';
      currentGame.winner = RED;
      updateUI();
      render();
      submitChessResult(RED);
      showResult('将杀！', '红方获胜！');
    } else {
      currentGame.status = 'stalemate';
      updateUI();
      render();
      submitChessResult('draw');
      showResult('和棋！', '双方平局。');
    }
    return;
  }

  const success = currentGame.makeMove(move.fromR, move.fromC, move.toR, move.toC);
  aiThinking = false;
  updateUI();

  // Start last move animation for AI move
  if (currentGame.lastMove) {
    lastMoveAnimation = {
      fromR: currentGame.lastMove.fromR,
      fromC: currentGame.lastMove.fromC,
      toR: currentGame.lastMove.toR,
      toC: currentGame.lastMove.toC,
      startTime: Date.now(),
      duration: MOVE_ANIM_DURATION,
    };
  }
  render();

  if (currentGame.status === 'checkmate') {
    const winner = currentGame.winner;
    submitChessResult(winner);
    showResult('将杀！', `${winner === RED ? '红方' : '黑方'}获胜！`);
  } else if (currentGame.status === 'stalemate') {
    submitChessResult('draw');
    showResult('和棋！', '双方平局。');
  }
}

// Generate 4-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ---- WebSocket Network Manager ----
class NetworkManager {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.myColor = RED;
    this.connected = false;
    this.isHost = false;
    this.onMove = null;
    this.onStatus = null;
    this.onCreate = null;
    this.onStart = null;
    this.onRankedResult = null;
    this.connectionMode = 'room';
    this.intentionalClose = false;
  }

  connect(url, roomCode, isHost, connectionMode = 'room') {
    if (!url) {
      if (this.onStatus) this.onStatus('请输入服务器地址');
      return;
    }
    this.isHost = isHost;
    this.myColor = isHost ? RED : BLACK;
    this.roomCode = roomCode || null;
    this.connectionMode = connectionMode;
    this.intentionalClose = false;

    if (this.onStatus) this.onStatus('正在连接...');

    try {
      this.socket = new WebSocket(url);
    } catch (e) {
      if (this.onStatus) this.onStatus('连接失败：' + e.message);
      return;
    }

    this.socket.onopen = () => {
      this.connected = true;
      if (this.connectionMode === 'ranked') {
        this.socket.send(JSON.stringify({ type: 'ranked_enqueue' }));
        if (this.onStatus) this.onStatus('正在寻找在线对手');
      } else if (this.isHost) {
        this.socket.send(JSON.stringify({ type: 'create_room' }));
        if (this.onStatus) this.onStatus('正在创建房间...');
      } else {
        this.socket.send(JSON.stringify({ type: 'join_room', roomCode: this.roomCode }));
        if (this.onStatus) this.onStatus('正在加入房间...');
      }
    };

    this.socket.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      this.handleMessage(msg);
    };

    this.socket.onclose = () => {
      this.connected = false;
      if (!this.intentionalClose && this.onStatus) this.onStatus('连接已断开。');
    };

    this.socket.onerror = () => {
      if (this.onStatus) this.onStatus('连接错误');
    };
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'room_created':
        this.roomCode = msg.roomCode;
        if (this.onCreate) this.onCreate(msg.roomCode);
        if (this.onStatus) this.onStatus('等待对手加入...');
        break;

      case 'opponent_joined':
        if (this.onStatus) this.onStatus('对手已加入！游戏开始，你是红方。');
        if (this.onStart) this.onStart();
        break;

      case 'joined':
        if (this.onStatus) this.onStatus('已加入房间，游戏开始！你是黑方。');
        if (this.onStart) this.onStart();
        break;

      case 'ranked_queued':
        if (this.onStatus) this.onStatus(`已进入匹配队列，当前有 ${msg.queueSize || 1} 名玩家等待`);
        break;

      case 'ranked_match_found':
        this.myColor = msg.color;
        this.matchId = msg.matchId;
        rankedOpponent = msg.opponent;
        if (this.onStatus) this.onStatus(`匹配成功：${msg.opponent?.username || '在线玩家'}`);
        if (this.onStart) this.onStart(msg);
        break;

      case 'ranked_cancelled':
        if (this.onStatus) this.onStatus('已取消排位匹配');
        break;

      case 'ranked_result':
        if (this.onRankedResult) this.onRankedResult(msg);
        break;

      case 'auth_required':
        if (this.onStatus) this.onStatus(msg.message || '请先登录再进行排位匹配');
        break;

      case 'move':
        if (this.onMove) this.onMove(msg);
        break;

      case 'resign':
      case 'timeout':
        if (currentGame) {
          currentGame.status = 'resigned';
          const winner = this.myColor === RED ? '黑方' : '红方';
          submitChessResult(this.myColor);
          showResult('认输', `${winner}获胜！`);
        }
        break;

      case 'opponent_disconnected':
        this.connected = false;
        if (this.onStatus) this.onStatus('对手已断开连接。');
        if (currentGame && (currentGame.status === 'playing' || currentGame.status === 'check')) {
          currentGame.status = 'resigned';
          submitChessResult(this.myColor);
          showResult('对手断线', `${this.myColor === RED ? '红方' : '黑方'}不战而胜！`);
        }
        break;

      case 'error':
        if (this.onStatus) this.onStatus('错误：' + (msg.message || '未知错误'));
        break;

      case 'chat':
        if (currentGame) {
          const sender = this.myColor === RED ? '黑方' : '红方';
          addChatMessage(sender, msg.text, false);
        }
        break;
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
  }

  cancelRanked() {
    this.send({ type: 'ranked_cancel' });
  }
}

function defaultGameSocketUrl(includeAuth = false) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = includeAuth ? window.GagagaPlatform?.getToken?.() : null;
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${protocol}//${location.host}/ws/games/chinese-chess${query}`;
}

// ---- Event Handlers ----
// Menu buttons
document.querySelectorAll('[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode === 'lan') {
      showMenuSection('lan-menu');
    } else if (mode === 'ranked') {
      showMenuSection('ranked-menu');
      rankedStatus.textContent = '点击下方按钮进入在线匹配队列';
      rankedStatus.classList.remove('searching');
      rankedStartBtn.style.display = 'block';
      rankedCancelBtn.style.display = 'none';
      loadRankedProfile();
    } else if (mode === 'ai') {
      const activeDepth = parseInt(document.querySelector('.difficulty-btn.active').dataset.depth);
      startGame('ai', activeDepth);
    } else if (mode === 'local') {
      startGame('local');
    }
  });
});

function handleRankedMove(msg) {
  if (!currentGame) return;
  currentGame.makeMove(msg.fromR, msg.fromC, msg.toR, msg.toC);
  currentGame.selected = null;
  currentGame.legalMoves = [];
  updateUI();
  render();
}

rankedStartBtn.addEventListener('click', () => {
  const platform = window.GagagaPlatform;
  if (!platform?.getToken?.() || !platform?.getUser?.()) {
    rankedStatus.textContent = '请先返回游戏平台登录账号，再进入排位匹配。';
    rankedStatus.classList.remove('searching');
    return;
  }

  if (netManager) netManager.disconnect();
  rankedStatus.textContent = '正在连接排位服务器';
  rankedStatus.classList.add('searching');
  rankedStartBtn.style.display = 'none';
  rankedCancelBtn.style.display = 'block';

  netManager = new NetworkManager();
  netManager.onStatus = (message) => {
    rankedStatus.textContent = message;
  };
  netManager.onStart = () => {
    rankedStatus.classList.remove('searching');
    startGame('ranked');
  };
  netManager.onMove = handleRankedMove;
  netManager.onRankedResult = (message) => {
    submitChessOutcome(message.result);
    if (currentGame) currentGame.status = message.reason === 'stalemate' ? 'stalemate' : 'finished';

    if (message.result === 'win') {
      showResult('排位胜利！', '排位状态已更新，恭喜获得称号：', true);
    } else if (message.result === 'draw') {
      showResult('排位和棋', '双方平局，排位状态已更新。');
    } else {
      const reason = message.reason === 'disconnect' ? '连接中断，本局判负。' : '本局未能取胜，排位状态已更新。';
      showResult('排位结束', reason);
    }
  };
  netManager.connect(defaultGameSocketUrl(true), null, false, 'ranked');
});

rankedCancelBtn.addEventListener('click', () => {
  if (netManager) {
    netManager.cancelRanked();
    netManager.disconnect();
    netManager = null;
  }
  rankedStatus.textContent = '已取消排位匹配';
  rankedStatus.classList.remove('searching');
  rankedStartBtn.style.display = 'block';
  rankedCancelBtn.style.display = 'none';
});

document.getElementById('ranked-back-btn').addEventListener('click', () => {
  if (netManager) {
    netManager.cancelRanked();
    netManager.disconnect();
    netManager = null;
  }
  showMenuSection('main-menu');
});

// Difficulty buttons
document.querySelectorAll('.difficulty-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// LAN menu
document.getElementById('lan-create-btn').addEventListener('click', () => {
  showMenuSection('lan-create');
  roomCodeDisplay.textContent = '----';
  createStatus.textContent = '正在连接...';

  netManager = new NetworkManager();
  netManager.onStatus = (msg) => { createStatus.textContent = msg; };
  netManager.onCreate = (code) => {
    roomCodeDisplay.textContent = code;
  };
  netManager.onStart = () => {
    startGame('lan');
  };
  netManager.onMove = (msg) => {
    if (msg.status === 'checkmate') {
      submitChessResult(msg.winner);
      showResult('将杀！', `${msg.winner === RED ? '红方' : '黑方'}获胜！`);
      return;
    }
    if (msg.status === 'stalemate') {
      submitChessResult('draw');
      showResult('和棋！', '双方平局。');
      return;
    }
    if (currentGame) {
      currentGame.makeMove(msg.fromR, msg.fromC, msg.toR, msg.toC);
      currentGame.selected = null;
      currentGame.legalMoves = [];
      updateUI();
      render();
    }
  };
  const url = serverUrlInput.value.trim() || defaultGameSocketUrl();
  netManager.connect(url, null, true);
});

document.getElementById('lan-join-btn').addEventListener('click', () => {
  showMenuSection('lan-join');
  joinStatus.textContent = '';
  joinCodeInput.value = '';
});

document.getElementById('join-confirm-btn').addEventListener('click', () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    joinStatus.textContent = '请输入4位房间号。';
    joinStatus.style.color = '#e74c3c';
    return;
  }
  joinStatus.textContent = '正在连接...';
  joinStatus.style.color = '#2ecc71';

  netManager = new NetworkManager();
  netManager.onStatus = (msg) => { joinStatus.textContent = msg; };
  netManager.onStart = () => {
    startGame('lan');
  };
  netManager.onMove = (msg) => {
    if (msg.status === 'checkmate') {
      submitChessResult(msg.winner);
      showResult('将杀！', `${msg.winner === RED ? '红方' : '黑方'}获胜！`);
      return;
    }
    if (msg.status === 'stalemate') {
      submitChessResult('draw');
      showResult('和棋！', '双方平局。');
      return;
    }
    if (currentGame) {
      currentGame.makeMove(msg.fromR, msg.fromC, msg.toR, msg.toC);
      currentGame.selected = null;
      currentGame.legalMoves = [];
      updateUI();
      render();
    }
  };
  const url = serverUrlInput.value.trim() || defaultGameSocketUrl();
  netManager.connect(url, code, false);
});

document.getElementById('lan-back-btn').addEventListener('click', () => {
  showMenuSection('main-menu');
});

document.getElementById('create-cancel-btn').addEventListener('click', () => {
  if (netManager) netManager.disconnect();
  showMenuSection('lan-menu');
});

document.getElementById('join-cancel-btn').addEventListener('click', () => {
  if (netManager) netManager.disconnect();
  showMenuSection('lan-menu');
});

// Game screen buttons
document.getElementById('undo-btn').addEventListener('click', () => {
  if (!currentGame || currentGame.mode === 'lan' || currentGame.mode === 'ranked') return;
  currentGame.undoLastMove();
  updateUI();
  render();
});

document.getElementById('resign-btn').addEventListener('click', () => {
  if (!currentGame) return;
  const online = isOnlineGame() && netManager;
  if (online) {
    netManager.send({ type: 'resign' });
  }
  const winnerColor = online ? opponent(localChessColor()) : opponent(currentGame.turn);
  const winner = winnerColor === RED ? '红方' : '黑方';
  currentGame.status = 'resigned';
  submitChessResult(winnerColor);
  showResult('认输', `${winner}获胜！`);
});

document.getElementById('menu-btn-game').addEventListener('click', () => {
  if (netManager) netManager.disconnect();
  currentGame = null;
  resultModal.classList.remove('active');
  showScreen(menuScreen);
  showMenuSection('main-menu');
});

// Modal buttons
document.getElementById('play-again-btn').addEventListener('click', () => {
  resultModal.classList.remove('active');
  if (currentGame) {
    const mode = currentGame.mode;
    const depth = currentGame.aiDepth;
    if ((mode === 'lan' || mode === 'ranked') && netManager) {
      netManager.disconnect();
      showScreen(menuScreen);
      showMenuSection(mode === 'ranked' ? 'ranked-menu' : 'main-menu');
      if (mode === 'ranked') {
        rankedStartBtn.style.display = 'block';
        rankedCancelBtn.style.display = 'none';
        rankedStatus.textContent = '点击下方按钮进入在线匹配队列';
        loadRankedProfile();
      }
      return;
    }
    startGame(mode, depth);
  }
});

document.getElementById('modal-menu-btn').addEventListener('click', () => {
  if (netManager) netManager.disconnect();
  currentGame = null;
  resultModal.classList.remove('active');
  showScreen(menuScreen);
  showMenuSection('main-menu');
});

// Canvas click
canvas.addEventListener('click', (e) => {
  handleBoardClick(e.clientX, e.clientY);
});

// Chat event bindings
document.getElementById('chat-send-btn')?.addEventListener('click', sendChatMessage);
document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

// ---- Keyboard shortcuts ----
document.addEventListener('keydown', (e) => {
  if (e.key === 'u' && currentGame && currentGame.mode !== 'lan' && currentGame.mode !== 'ranked') {
    currentGame.undoLastMove();
    updateUI();
    render();
  }
  if (e.key === 'Escape') {
    if (resultModal.classList.contains('active')) {
      document.getElementById('modal-menu-btn').click();
    } else if (currentGame) {
      document.getElementById('menu-btn-game').click();
    } else {
      showMenuSection('main-menu');
    }
  }
  if (e.key === 'r' && currentGame) {
    document.getElementById('resign-btn').click();
  }
});

// ---- Init ----
showScreen(menuScreen);
showMenuSection('main-menu');

// Export for testing (Node.js / Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GameState,
    generateRawMoves,
    generateLegalMoves,
    getAllLegalMoves,
    isInCheck,
    kingsAreFacing,
    createInitialBoard,
    cloneBoard,
    inBoard,
    inPalace,
    colorOf,
    typeOf,
    isRed,
    isBlack,
    sameColor,
    makePiece,
    isRedSide,
    opponent,
    RED,
    BLACK,
    KING,
    ADVISOR,
    ELEPHANT,
    HORSE,
    ROOK,
    CANNON,
    PAWN,
    PIECE_NAMES,
    PIECE_VALUES,
    POS_VALUES,
    BOARD_ROWS,
    BOARD_COLS,
    CELL_SIZE,
    PADDING,
    BOARD_W,
    BOARD_H,
    CANVAS_W,
    CANVAS_H,
    evaluateBoard,
    minimax,
    getAIMove,
    orderMoves,
    toBoardCoords,
    drawBoard,
    drawPiece,
    flipRow,
    flipCol,
    boardX,
    boardY,
    shouldFlipBoard,
    NetworkManager,
    localChessColor,
    submitChessResult,
    escapeHtml,
    addChatMessage,
    sendChatMessage,
    renderChat,
    getTier,
    getTierProgress,
    loadPlayerStats,
    TIERS,
    drawArrow,
    lastMoveAnimation,
    MOVE_ANIM_DURATION,
    MOVE_TIME_LIMIT,
  };
}

console.log('Chinese Chess 中国象棋 loaded.');
console.log('模式：人机对战、本地双人、局域网对战');
console.log('快捷键：[U]悔棋 [R]认输 [Esc]菜单');
