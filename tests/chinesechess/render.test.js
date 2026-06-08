import { describe, it, expect } from 'vitest';
import {
  drawArrow,
  MOVE_ANIM_DURATION,
} from '../../Chinese Chess/chinesechess.js';

describe('走棋动画', () => {
  describe('drawArrow', () => {
    it('drawArrow应为函数', () => {
      expect(typeof drawArrow).toBe('function');
    });

    it('相同坐标不应崩溃', () => {
      const ctx = getMockCtx();
      expect(() => drawArrow(ctx, 100, 100, 100, 100, '#f39c12', 0.7)).not.toThrow();
    });

    it('不同坐标不应崩溃', () => {
      const ctx = getMockCtx();
      expect(() => drawArrow(ctx, 50, 50, 250, 250, '#f39c12', 0.7)).not.toThrow();
    });
  });

  describe('MOVE_ANIM_DURATION', () => {
    it('动画时长应为600ms', () => {
      expect(MOVE_ANIM_DURATION).toBe(600);
    });
  });
});

function getMockCtx() {
  return {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'round',
    globalAlpha: 1,
  };
}
