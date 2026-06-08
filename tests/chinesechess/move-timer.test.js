import { beforeEach, describe, expect, it } from 'vitest';

let BLACK;
let GameState;
let MOVE_TIME_LIMIT;

beforeEach(async () => {
  const mod = await import('../../Chinese Chess/chinesechess.js');
  BLACK = mod.BLACK;
  GameState = mod.GameState;
  MOVE_TIME_LIMIT = mod.MOVE_TIME_LIMIT;
});

describe('per-move timer', () => {
  it('defaults to a 90-second limit for each move', () => {
    const game = new GameState();
    expect(game.timerConfig).toBe(MOVE_TIME_LIMIT);
    expect(game.redTime).toBe(90);
    expect(game.blackTime).toBe(90);
  });

  it('resets both displayed move timers after a successful move', () => {
    const game = new GameState();
    game.redTime = 42;

    const moved = game.makeMove(6, 0, 5, 0);

    expect(moved).toBe(true);
    expect(game.turn).toBe(BLACK);
    expect(game.redTime).toBe(90);
    expect(game.blackTime).toBe(90);
  });
});
