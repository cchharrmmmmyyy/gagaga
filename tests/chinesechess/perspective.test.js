import { describe, expect, it } from 'vitest';
import {
  BLACK,
  RED,
  shouldFlipBoard,
} from '../../Chinese Chess/chinesechess.js';

describe('board perspective', () => {
  it('places the local Black pieces at the bottom in ranked games', () => {
    expect(shouldFlipBoard('ranked', BLACK)).toBe(true);
    expect(shouldFlipBoard('ranked', RED)).toBe(false);
  });

  it('keeps the same Black perspective behavior in LAN games', () => {
    expect(shouldFlipBoard('lan', BLACK)).toBe(true);
    expect(shouldFlipBoard('lan', RED)).toBe(false);
  });
});
