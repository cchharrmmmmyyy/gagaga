# Gagaga - 经典小游戏合集 🎮

Gagaga 是一个基于 HTML、CSS、JavaScript 和 Node.js 的多人协作小游戏平台。项目采用超级马里奥像素风格，集成多个经典小游戏，并提供统一登录、排行榜、公共聊天和部分游戏联机功能。

## 游戏列表

| 游戏 | 说明 | 操作方式 |
|------|------|---------|
| **2048** | 滑动合并数字方块，挑战 2048 | 方向键 ↑ ↓ ← → |
| **打砖块 (Breakout)** | 马里奥主题打砖块游戏 | 方向键/鼠标、空格、P |
| **接球游戏 (Catch the Ball)** | 移动篮子接住下落的球 | 方向键 ← → |
| **Flappy Bird** | 控制小鸟穿过管道 | 点击/空格 |
| **记忆翻牌 (Memory Game)** | 配对卡片，支持多种难度 | 点击卡片 |
| **乒乓球 (Pong)** | 经典乒乓球游戏 | 方向键 ↑ ↓ |
| **中国象棋** | 支持房间联机的中国象棋 | 鼠标点击 |
| **俄罗斯方块 (Tetris)** | 经典俄罗斯方块 | 方向键 |
| **井字棋 (Tic-Tac-Toe)** | 支持双人和 AI 对战 | 点击棋盘 |

## 平台功能

- 统一用户注册和登录
- 各游戏统一排行榜
- 公共聊天室
- 游戏清单自动发现
- 游戏独立后端模块
- 中国象棋房间联机
- GitHub Pages 自动部署

## 技术栈

- HTML5、CSS3、JavaScript ES6+
- Canvas API
- Web Audio API
- Bootstrap 5.3.3
- Node.js
- WebSocket（`ws`）
- Node.js Test Runner
- GitHub Actions

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm

### 安装并启动

```bash
cd server
npm install
npm start
```

服务默认运行在：

```text
http://localhost:8080
```

可以通过 `PORT` 环境变量修改端口。

> 排行榜、登录、聊天和联机功能依赖 Node.js 服务，不建议直接打开根目录的 `index.html`。

## 项目结构

```text
gagaga/
├── server/              # 统一 Node.js 服务
├── shared/              # 浏览器公共接口
├── 2048 Game/           # 2048 游戏
├── Breakout Game/       # 打砖块
├── Catch the Ball/      # 接球游戏
├── Chinese Chess/       # 中国象棋
├── Flappy Bird/         # Flappy Bird
├── Memory Game/         # 记忆翻牌
├── Pong Game/           # 乒乓球
├── Tetris Game/         # 俄罗斯方块
├── Tic-Tac-Toe/         # 井字棋
├── ARCHITECTURE.md      # 模块开发约定
└── CONTRIBUTING.md      # 项目协作规范
```

## 开发检查

提交代码前运行：

```bash
cd server
npm run check
```

游戏开发者原则上只修改自己负责的游戏目录。公共平台与游戏模块之间的约定见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 协作流程

所有修改均应采用以下流程：

1. 创建或认领 Issue。
2. 从最新 `main` 创建任务分支。
3. 在任务分支中完成修改并运行检查。
4. 提交 Pull Request，并关联对应 Issue。
5. 由至少一名其他成员进行 Code Review。
6. 检查通过后合并到 `main`。

具体分支、提交和评审规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 贡献

欢迎通过 Issue 报告问题或提出建议，并通过 Pull Request 贡献代码。

## 许可

本项目使用 MIT License。

## 致谢

项目基于 [SUBHADIPMAITI-DEV/Simple-JavaScript-Games](https://github.com/SUBHADIPMAITI-DEV/Simple-JavaScript-Games) 进行二次开发。
```

