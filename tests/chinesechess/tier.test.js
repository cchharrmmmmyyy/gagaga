import { describe, it, expect } from 'vitest';
import {
  getTier,
  getTierProgress,
} from '../../Chinese Chess/chinesechess.js';

describe('段位系统', () => {
  describe('getTier', () => {
    it('0胜应返回青铜', () => {
      const tier = getTier(0);
      expect(tier.name).toBe('青铜');
    });

    it('5胜应返回青铜', () => {
      const tier = getTier(5);
      expect(tier.name).toBe('青铜');
    });

    it('10胜应返回白银', () => {
      const tier = getTier(10);
      expect(tier.name).toBe('白银');
    });

    it('25胜应返回白银', () => {
      const tier = getTier(25);
      expect(tier.name).toBe('白银');
    });

    it('30胜应返回黄金', () => {
      const tier = getTier(30);
      expect(tier.name).toBe('黄金');
    });

    it('55胜应返回黄金', () => {
      const tier = getTier(55);
      expect(tier.name).toBe('黄金');
    });

    it('60胜应返回铂金', () => {
      const tier = getTier(60);
      expect(tier.name).toBe('铂金');
    });

    it('99胜应返回铂金', () => {
      const tier = getTier(99);
      expect(tier.name).toBe('铂金');
    });

    it('100胜应返回钻石', () => {
      const tier = getTier(100);
      expect(tier.name).toBe('钻石');
    });

    it('199胜应返回钻石', () => {
      const tier = getTier(199);
      expect(tier.name).toBe('钻石');
    });

    it('200胜应返回王者', () => {
      const tier = getTier(200);
      expect(tier.name).toBe('王者');
    });

    it('500胜应返回王者', () => {
      const tier = getTier(500);
      expect(tier.name).toBe('王者');
    });
  });

  describe('getTierProgress', () => {
    it('青铜5胜应显示晋升白银的进度', () => {
      const progress = getTierProgress(5);
      expect(progress.current.name).toBe('青铜');
      expect(progress.next.name).toBe('白银');
      expect(progress.progress).toBe(5);
      expect(progress.needed).toBe(10);
    });

    it('黄金45胜应显示晋升铂金的进度', () => {
      const progress = getTierProgress(45);
      expect(progress.current.name).toBe('黄金');
      expect(progress.next.name).toBe('铂金');
      expect(progress.progress).toBe(15);
      expect(progress.needed).toBe(30);
    });

    it('王者300胜应无下一个段位', () => {
      const progress = getTierProgress(300);
      expect(progress.current.name).toBe('王者');
      expect(progress.next).toBeNull();
    });
  });
});
