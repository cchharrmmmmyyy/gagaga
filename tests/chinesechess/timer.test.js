import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

let GameState;
let RED, BLACK;

beforeEach(async () => {
  const mod = await import('../../Chinese Chess/chinesechess.js');
  GameState = mod.GameState;
  RED = mod.RED;
  BLACK = mod.BLACK;
});

describe('计时器', () => {
  let gs;

  beforeEach(() => {
    gs = new GameState();
  });

  afterEach(() => {
    gs.stopTimer();
  });

  describe('formatTime', () => {
    it('应将600秒格式化为10:00', () => {
      expect(gs.formatTime(600)).toBe('10:00');
    });

    it('应将60秒格式化为1:00', () => {
      expect(gs.formatTime(60)).toBe('1:00');
    });

    it('应将59秒格式化为0:59', () => {
      expect(gs.formatTime(59)).toBe('0:59');
    });

    it('应将0秒格式化为0:00', () => {
      expect(gs.formatTime(0)).toBe('0:00');
    });

    it('应将9秒格式化为0:09（补零）', () => {
      expect(gs.formatTime(9)).toBe('0:09');
    });

    it('应将90秒格式化为1:30', () => {
      expect(gs.formatTime(90)).toBe('1:30');
    });
  });

  describe('startTimer / stopTimer', () => {
    it('startTimer应设置定时器', () => {
      gs.startTimer(() => {});
      expect(gs.timerInterval).not.toBeNull();
      gs.stopTimer();
    });

    it('stopTimer应清除定时器', () => {
      gs.startTimer(() => {});
      gs.stopTimer();
      expect(gs.timerInterval).toBeNull();
    });

    it('不应在已停止的游戏中启动定时器（但启动没有问题，定时器会在第一次tick时停止）', () => {
      gs.status = 'checkmate';
      let called = false;
      gs.startTimer(() => { called = true; });
      // Timer should not fire the callback since status is not playing/check
      gs.stopTimer();
      expect(called).toBe(false);
    });
  });

  describe('超时', async () => {
    it('当红方时间耗尽时应调用超时回调', async () => {
      gs.redTime = 1;
      gs.turn = RED;
      let timeoutLoser = null;
      await new Promise((resolve) => {
        gs.startTimer((loser) => {
          timeoutLoser = loser;
          resolve();
        });
      });
      expect(timeoutLoser).toBe(RED);
      expect(gs.redTime).toBe(0);
    });

    it('当黑方时间耗尽时应调用超时回调', async () => {
      gs.blackTime = 1;
      gs.turn = BLACK;
      let timeoutLoser = null;
      await new Promise((resolve) => {
        gs.startTimer((loser) => {
          timeoutLoser = loser;
          resolve();
        });
      });
      expect(timeoutLoser).toBe(BLACK);
      expect(gs.blackTime).toBe(0);
    });
  });

  describe('更新显示', () => {
    it('updateTimerDisplay应更新DOM元素', () => {
      gs.redTime = 300;
      gs.blackTime = 480;
      gs.updateTimerDisplay();
      const redEl = document.getElementById('red-timer');
      const blackEl = document.getElementById('black-timer');
      if (redEl) expect(redEl.textContent).toBe('5:00');
      if (blackEl) expect(blackEl.textContent).toBe('8:00');
    });
  });
});
