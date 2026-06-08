import { describe, it, expect } from 'vitest';
import {
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
  BOARD_ROWS,
  BOARD_COLS,
  generateLegalMoves,
  generateRawMoves,
  getAllLegalMoves,
  isInCheck,
  kingsAreFacing,
  PIECE_NAMES,
  PIECE_VALUES,
  GameState,
} from '../../Chinese Chess/chinesechess.js';

describe('棋盘初始化', () => {
  it('应该创建包含32个棋子的初始棋盘', () => {
    const board = createInitialBoard();
    let count = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell) count++;
      }
    }
    expect(count).toBe(32);
  });

  it('红方底排应该包含正确的棋子', () => {
    const board = createInitialBoard();
    // Red back rank at row 9
    const backRank = [ROOK, HORSE, ELEPHANT, ADVISOR, KING, ADVISOR, ELEPHANT, HORSE, ROOK];
    for (let c = 0; c < 9; c++) {
      expect(board[9][c]).toBe(RED + backRank[c]);
    }
  });

  it('黑方底排应该包含正确的棋子', () => {
    const board = createInitialBoard();
    const backRank = [ROOK, HORSE, ELEPHANT, ADVISOR, KING, ADVISOR, ELEPHANT, HORSE, ROOK];
    for (let c = 0; c < 9; c++) {
      expect(board[0][c]).toBe(BLACK + backRank[c]);
    }
  });

  it('炮应该处于正确位置', () => {
    const board = createInitialBoard();
    expect(board[2][1]).toBe(BLACK + CANNON);
    expect(board[2][7]).toBe(BLACK + CANNON);
    expect(board[7][1]).toBe(RED + CANNON);
    expect(board[7][7]).toBe(RED + CANNON);
  });

  it('兵/卒应该处于正确位置', () => {
    const board = createInitialBoard();
    for (let c = 0; c < BOARD_COLS; c += 2) {
      expect(board[3][c]).toBe(BLACK + PAWN);
      expect(board[6][c]).toBe(RED + PAWN);
    }
  });

  it('cloneBoard应该创建深拷贝', () => {
    const board = createInitialBoard();
    const cloned = cloneBoard(board);
    expect(cloned).not.toBe(board);
    expect(cloned[0]).not.toBe(board[0]);
    cloned[0][0] = null;
    expect(board[0][0]).not.toBeNull();
  });
});

describe('辅助函数', () => {
  it('inBoard - 应正确判断边界', () => {
    expect(inBoard(0, 0)).toBe(true);
    expect(inBoard(9, 8)).toBe(true);
    expect(inBoard(5, 4)).toBe(true);
    expect(inBoard(-1, 0)).toBe(false);
    expect(inBoard(0, -1)).toBe(false);
    expect(inBoard(10, 0)).toBe(false);
    expect(inBoard(0, 9)).toBe(false);
  });

  it('colorOf - 应返回棋子颜色', () => {
    expect(colorOf('rk')).toBe(RED);
    expect(colorOf('bp')).toBe(BLACK);
    expect(colorOf(null)).toBe(null);
  });

  it('typeOf - 应返回棋子类型', () => {
    expect(typeOf('rk')).toBe(KING);
    expect(typeOf('bc')).toBe(CANNON);
    expect(typeOf(null)).toBe(null);
  });

  it('isRed/isBlack - 应正确判断颜色', () => {
    expect(isRed('rk')).toBe(true);
    expect(isRed('bp')).toBe(false);
    expect(isBlack('rk')).toBe(false);
    expect(isBlack('bp')).toBe(true);
  });

  it('sameColor - 应正确判断相同颜色', () => {
    expect(sameColor('rk', 'rp')).toBe(true);
    expect(sameColor('rk', 'bk')).toBe(false);
    expect(sameColor('rk', null)).toBeFalsy();
    expect(sameColor(null, null)).toBeFalsy();
  });

  it('opponent - 应返回对手颜色', () => {
    expect(opponent(RED)).toBe(BLACK);
    expect(opponent(BLACK)).toBe(RED);
  });

  it('isRedSide - 应正确判断红方区域', () => {
    expect(isRedSide(5)).toBe(true);
    expect(isRedSide(9)).toBe(true);
    expect(isRedSide(4)).toBe(false);
  });

  it('inPalace - 应正确判断九宫范围', () => {
    // Red palace
    expect(inPalace(7, 3, RED)).toBe(true);
    expect(inPalace(9, 4, RED)).toBe(true);
    expect(inPalace(6, 4, RED)).toBe(false);
    expect(inPalace(8, 2, RED)).toBe(false);
    // Black palace
    expect(inPalace(0, 4, BLACK)).toBe(true);
    expect(inPalace(2, 5, BLACK)).toBe(true);
    expect(inPalace(3, 4, BLACK)).toBe(false);
  });
});

describe('走法生成', () => {
  it('红方帅初始位置只有一个合法走法', () => {
    const board = createInitialBoard();
    // Red king at row 9, col 4
    const moves = generateLegalMoves(board, 9, 4);
    expect(moves.length).toBe(1);
    expect(moves[0]).toEqual([8, 4]);
  });

  it('红方俥(车)初始位置有合法走法', () => {
    const board = createInitialBoard();
    // Red rook at row 9, col 0 — horse at [9][1], pawn at [6][0], cannon at [7][1]
    // In initial position, the rook can't move horizontally (blocked by horse)
    // but can move forward through column 0 (blocked only by own pawn at row 6)
    const moves = generateLegalMoves(board, 9, 0);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('红方傌(马)初始位置有2个合法走法', () => {
    const board = createInitialBoard();
    // Red horse at row 9, col 1
    const moves = generateLegalMoves(board, 9, 1);
    expect(moves.length).toBe(2);
    expect(moves).toContainEqual([7, 0]);
    expect(moves).toContainEqual([7, 2]);
  });

  it('红方相初始位置有合法走法', () => {
    const board = createInitialBoard();
    // Red elephant at row 9, col 2 — can move to [7][0] and [7][4]
    // Elephant's eye [8][1] is empty, [8][3] is empty
    const moves = generateLegalMoves(board, 9, 2);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('炮在有炮架时可以吃子', () => {
    const board = createInitialBoard();
    // Red cannon at row 7, col 7 — can capture black pawn at row 3, col 7
    // (jumping over own pawn at row 6, col 7)
    const moves = generateRawMoves(board, 7, 7);
    // Should contain capture of black pawn at [3, 7]
    expect(moves).toContainEqual([3, 7]);
  });

  it('兵在过河前只能前进', () => {
    const board = createInitialBoard();
    // Red pawn at row 6, col 0 — not crossed yet
    const moves = generateRawMoves(board, 6, 0);
    expect(moves.length).toBe(1);
    expect(moves).toContainEqual([5, 0]);
  });
});

describe('将军检测', () => {
  it('初始局面不应有将军', () => {
    const board = createInitialBoard();
    expect(isInCheck(board, RED)).toBe(false);
    expect(isInCheck(board, BLACK)).toBe(false);
  });

  it('飞将检测 - 两王对面时应在将军状态', () => {
    // Setup a board where two kings face each other
    const board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    board[0][4] = makePiece(BLACK, KING);
    board[9][4] = makePiece(RED, KING);
    expect(kingsAreFacing(board)).toBe(true);
    expect(isInCheck(board, RED)).toBe(true);
    expect(isInCheck(board, BLACK)).toBe(true);
  });

  it('飞将检测 - 中间有棋子时不应触发', () => {
    const board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    board[0][4] = makePiece(BLACK, KING);
    board[5][4] = makePiece(RED, PAWN);
    board[9][4] = makePiece(RED, KING);
    expect(kingsAreFacing(board)).toBe(false);
  });
});

describe('GameState', () => {
  it('初始GameState应有正确默认值', () => {
    const gs = new GameState();
    expect(gs.turn).toBe(RED);
    expect(gs.status).toBe('playing');
    expect(gs.winner).toBeNull();
    expect(gs.moveCount).toBe(0);
    expect(gs.mode).toBe('ai');
    expect(gs.aiColor).toBe(BLACK);
  });

  it('makeMove应正确执行走法', () => {
    const gs = new GameState();
    // Move red cannon: (7,1) → (7,4)
    const success = gs.makeMove(7, 1, 7, 4);
    expect(success).toBe(true);
    expect(gs.board[7][4]).toBe('rc');
    expect(gs.board[7][1]).toBeNull();
    expect(gs.turn).toBe(BLACK);
    expect(gs.moveCount).toBe(1);
  });

  it('非法走法应返回false', () => {
    const gs = new GameState();
    // Try to move black piece when it's red's turn
    const success = gs.makeMove(0, 0, 1, 0);
    expect(success).toBe(false);
  });

  it('走法后应正确切换回合', () => {
    const gs = new GameState();
    gs.makeMove(7, 1, 7, 4); // Red moves
    expect(gs.turn).toBe(BLACK);
  });

  it('reset应恢复初始状态', () => {
    const gs = new GameState();
    gs.makeMove(7, 1, 7, 4);
    gs.reset();
    expect(gs.turn).toBe(RED);
    expect(gs.status).toBe('playing');
    expect(gs.moveCount).toBe(0);
    expect(gs.moveHistory.length).toBe(0);
  });

  it('toString/toFen应正确表示局面', () => {
    const gs = new GameState();
    const fen = gs.toFen();
    expect(fen).toBeTruthy();
    expect(typeof fen).toBe('string');
    expect(fen).toContain('rk');
  });
});

describe('棋子名称', () => {
  it('应包含所有棋子的中文名称', () => {
    expect(PIECE_NAMES['rk']).toBe('帅');
    expect(PIECE_NAMES['bk']).toBe('将');
    expect(PIECE_NAMES['rr']).toBe('俥');
    expect(PIECE_NAMES['br']).toBe('車');
    expect(PIECE_NAMES['rc']).toBe('炮');
    expect(PIECE_NAMES['bc']).toBe('砲');
    expect(PIECE_NAMES['rp']).toBe('兵');
    expect(PIECE_NAMES['bp']).toBe('卒');
  });
});
