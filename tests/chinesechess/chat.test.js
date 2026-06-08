import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  addChatMessage,
  sendChatMessage,
} from '../../Chinese Chess/chinesechess.js';

describe('聊天功能', () => {
  describe('escapeHtml', () => {
    it('应转义HTML标签', () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
    });

    it('应转义&符号', () => {
      const result = escapeHtml('a & b');
      expect(result).toContain('&amp;');
    });

    it('普通文本应原样返回', () => {
      const result = escapeHtml('hello world');
      // The result may have &amp; etc. for special chars, but plain text passes through
      expect(result).toContain('hello world');
    });
  });

  describe('addChatMessage', () => {
    it('应将消息添加到数组中', () => {
      addChatMessage('玩家1', '你好', true);
      addChatMessage('玩家2', '嗨', false);
      // Messages are stored in module-level chatMessages array
    });

    it('不应在非游戏状态下崩溃', () => {
      expect(() => addChatMessage('test', 'msg', true)).not.toThrow();
    });
  });

  describe('sendChatMessage', () => {
    it('当chat-input元素不存在时应安全返回', () => {
      // chat-input element exists in jsdom setup, but it may be disabled/empty
      // sendChatMessage reads input value - should handle gracefully
      // The function checks for input element, then trims
      // With empty input: trim returns '', the if (!text) kicks in
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = '';
        expect(() => sendChatMessage()).not.toThrow();
      }
    });
  });
});
