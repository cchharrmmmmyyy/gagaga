# Gagaga - 经典小游戏合集 🎮

一个基于纯前端（HTML + CSS + JavaScript）的经典街机小游戏合集，采用 **超级马里奥** 像素风格作为游戏大厅主题。

## 游戏列表

| 游戏 | 说明 | 操作方式 |
|------|------|---------|
| **2048** | 滑动合并数字方块，挑战 2048 | 方向键 ↑ ↓ ← → |
| **打砖块 (Breakout)** | 马里奥主题打砖块，4个世界关卡，含道具、粒子特效、音效 | 方向键/鼠标移动，空格开始，P 暂停 |
| **接球游戏 (Catch the Ball)** | 移动篮子接住下落的球 | 方向键 ← → |
| **Flappy Bird** | 点击/空格控制小鸟飞行，穿过管道间隙 | 点击/空格 |
| **记忆翻牌 (Memory Game)** | 配对 emoji 水果卡片，4种难度模式 | 点击卡片翻转 |
| **乒乓球 (Pong)** | 经典乒乓，人机对战 | 方向键 ↑ ↓ |
| **石头剪刀布 (Rock-Paper-Scissors)** | 经典猜拳游戏 | 点击按钮 |
| **俄罗斯方块 (Tetris)** | 经典 10x20 俄罗斯方块，7种方块 | 方向键移动/旋转 |
| **井字棋 (Tic-Tac-Toe)** | 双人井字棋 | 点击棋盘落子 |

## 技术栈

- **HTML5** + **CSS3**（CSS 变量、动画、Flexbox/Grid 布局）
- **JavaScript (ES6+)**
- **Canvas API** — 打砖块、接球、Flappy Bird、乒乓、俄罗斯方块、井字棋
- **Web Audio API** — 打砖块音效
- **localStorage** — Flappy Bird/记忆翻牌 主题偏好持久化
- **Bootstrap 5.3.3** (CDN) — 游戏大厅页面布局

无需构建工具，纯静态网页，开箱即用。

## 快速开始

直接打开 `index.html` 即可游玩，或本地启动一个 HTTP 服务器：

```bash
# 使用 Python
python -m http.server 8080

# 或使用 npx
npx serve .
```

然后访问 `http://localhost:8080`。

## 在线地址

项目已配置 GitHub Pages 自动部署，推送到 `main` 分支即可触发。

## 预览

游戏大厅采用马里奥风格主题，包含：
- 云朵飘动动画 ☁️
- 板栗仔漫步 🍄
- 问号砖块弹跳 ❓
- 像素房屋与管道 🏠
- 金币旋转漂浮 🪙

## 开发

项目无构建流程，直接在浏览器中运行。所有游戏逻辑均在对应子目录的独立 JavaScript 文件中。

## 贡献

欢迎提交 Issue 或 Pull Request！

## 许可

MIT License

## 致谢

- 原作者：[SUBHADIPMAITI-DEV](https://github.com/SUBHADIPMAITI-DEV/Simple-JavaScript-Games.git)
