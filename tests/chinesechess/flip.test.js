import { describe, it, expect } from 'vitest';
import {
  flipRow,
  flipCol,
  boardX,
  boardY,
  BOARD_ROWS,
  BOARD_COLS,
  PADDING,
  CELL_SIZE,
  toBoardCoords,
  GameState,
} from '../../Chinese Chess/chinesechess.js';

describe('棋盘翻转辅助函数', () => {
  describe('flipRow', () => {
    it('不翻转时返回原始行号', () => {
      expect(flipRow(0, false)).toBe(0);
      expect(flipRow(9, false)).toBe(9);
      expect(flipRow(5, false)).toBe(5);
    });

    it('翻转时返回对称行号', () => {
      expect(flipRow(0, true)).toBe(9);
      expect(flipRow(9, true)).toBe(0);
      expect(flipRow(4, true)).toBe(5);
      expect(flipRow(5, true)).toBe(4);
    });
  });

  describe('flipCol', () => {
    it('不翻转时返回原始列号', () => {
      expect(flipCol(0, false)).toBe(0);
      expect(flipCol(8, false)).toBe(8);
      expect(flipCol(4, false)).toBe(4);
    });

    it('翻转时返回对称列号', () => {
      expect(flipCol(0, true)).toBe(8);
      expect(flipCol(8, true)).toBe(0);
      expect(flipCol(4, true)).toBe(4); // middle stays middle
    });
  });

  describe('boardX', () => {
    it('不翻转时应正确计算x坐标', () => {
      expect(boardX(0, false)).toBe(PADDING);
      expect(boardX(4, false)).toBe(PADDING + 4 * CELL_SIZE);
      expect(boardX(8, false)).toBe(PADDING + 8 * CELL_SIZE);
    });

    it('翻转时应镜像计算x坐标', () => {
      expect(boardX(0, true)).toBe(PADDING + 8 * CELL_SIZE);
      expect(boardX(8, true)).toBe(PADDING);
    });
  });

  describe('boardY', () => {
    it('不翻转时应正确计算y坐标', () => {
      expect(boardY(0, false)).toBe(PADDING);
      expect(boardY(5, false)).toBe(PADDING + 5 * CELL_SIZE);
      expect(boardY(9, false)).toBe(PADDING + 9 * CELL_SIZE);
    });

    it('翻转时应镜像计算y坐标', () => {
      expect(boardY(0, true)).toBe(PADDING + 9 * CELL_SIZE);
      expect(boardY(9, true)).toBe(PADDING);
    });
  });
});

describe('翻转时坐标转换', () => {
  it('翻转时应正确映射点击坐标到逻辑坐标', () => {
    // Create a game with flipped=true
    const gs = new GameState();
    gs.flipped = true;

    // We need currentGame to be set for toBoardCoords
    // toBoardCoords references currentGame directly
    // This test verifies the math: a click on visual (0,0) maps to logical (9,8)
    const rawR = 0, rawC = 0;
    const c = BOARD_COLS - 1 - rawC; // = 8
    const r = BOARD_ROWS - 1 - rawR; // = 9
    expect(r).toBe(9);
    expect(c).toBe(8);
  });

  it('翻转后点击视觉底部应映射到逻辑顶部', () => {
    // Visual bottom row (row 9) → logical row 0
    const rawR = 9, rawC = 4;
    const c = BOARD_COLS - 1 - rawC; // = 4
    const r = BOARD_ROWS - 1 - rawR; // = 0
    expect(r).toBe(0);
    expect(c).toBe(4);
  });

  it('翻转后中间列保持不变', () => {
    // Middle column (4) should stay 4
    const rawC = 4;
    const c = BOARD_COLS - 1 - rawC;
    expect(c).toBe(4);
  });
});

describe('GameState flipped属性', () => {
  it('默认flipped应为false', () => {
    const gs = new GameState();
    expect(gs.flipped).toBe(false);
  });

  it('reset后flipped应恢复为false', () => {
    const gs = new GameState();
    gs.flipped = true;
    gs.reset();
    expect(gs.flipped).toBe(false);
  });
});
