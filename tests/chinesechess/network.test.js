import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to import after DOM setup to access NetworkManager
// The global NetworkManager is exposed on the module
let NetworkManager;

beforeEach(async () => {
  const mod = await import('../../Chinese Chess/chinesechess.js');
  NetworkManager = mod.NetworkManager;
});

describe('NetworkManager 断线处理', () => {
  let nm;
  let gameStatusBefore;

  beforeEach(() => {
    nm = new NetworkManager();
    nm.myColor = 'r';

    // Mock currentGame (global in chinesechess.js)
    // We need to set up the global state via the module's scope
    // Since currentGame is a module-level let, we access it indirectly
  });

  it('NetworkManager应正确初始化', () => {
    expect(nm).toBeDefined();
    expect(nm.connected).toBe(false);
    expect(nm.roomCode).toBeNull();
    expect(nm.myColor).toBe('r');
    expect(nm.isHost).toBe(false);
  });

  it('opponent_disconnected消息应设置connected为false', () => {
    nm.connected = true;
    nm.handleMessage({ type: 'opponent_disconnected' });
    expect(nm.connected).toBe(false);
  });

  it('opponent_disconnected应触发onStatus回调', () => {
    let statusMsg = '';
    nm.onStatus = (msg) => { statusMsg = msg; };
    nm.handleMessage({ type: 'opponent_disconnected' });
    expect(statusMsg).toContain('对手已断开连接');
  });

  it('当没有活动游戏时disconnect不应崩溃', () => {
    nm.connected = true;
    expect(() => {
      nm.handleMessage({ type: 'opponent_disconnected' });
    }).not.toThrow();
    expect(nm.connected).toBe(false);
  });
});
