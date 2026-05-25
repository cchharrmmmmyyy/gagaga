# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目范围

**只维护两个游戏：**
- [Memory Game](Memory%20Game/) — `memory.js` + `index.html`
- [Flappy Bird](Flappy%20Bird/) — `flappybird.js` + `index.html`

其他游戏（2048、Breakout、Catch the Ball、Pong、Rock-Paper-Scissors、Tetris、Tic-Tac-Toe）不在维护范围内，不要修改。

## 分支规则（严格遵守）

- **所有代码修改必须在 `cyc` 分支上进行**
- 禁止直接在 `main` 分支上修改代码
- 合并到 `main` 必须由用户明确指令触发
- 合并后如需继续修改，先切回 `cyc` 分支再改

## 项目结构

```
index.html                    — 游戏大厅/菜单
Memory Game/
  index.html                  — 记忆游戏页面（含 CSS）
  memory.js                   — 游戏逻辑
  README.md
Flappy Bird/
  index.html                  — 飞鸟游戏页面（含 CSS）
  flappybird.js               — 游戏逻辑
  README.md
images/                       — 游戏截图
.github/workflows/static.yml  — GitHub Pages 部署
```

- 纯 Vanilla JavaScript，无框架/无构建工具/无依赖
- 每个游戏自包含：一个 HTML 页面 + 一个 JS 文件
- CSS 内嵌在 HTML 的 `<style>` 标签中
- 根目录 `index.html` 是游戏大厅，使用 Bootstrap 5.3.3 CDN

## 开发指引

- 无需构建步骤，直接在浏览器打开对应 `index.html` 即可运行
- GitHub Actions 会在 push 到 `main` 时自动部署到 GitHub Pages
- 游戏之间完全独立，修改一个不会影响另一个

## 记忆游戏 (Memory Game)

- 8 对水果 emoji 卡片，4 列 CSS Grid 布局
- 四种难度模式：休闲(无时间限制)、简单(60s)、普通(45s)、困难(30s)
- 暗/亮主题切换，持久化到 `localStorage`（key: `theme`）
- 游戏流程：介绍面板 → 选择难度 → 游戏 → 胜利/失败

## 飞鸟游戏 (Flappy Bird)

- Canvas 2D 渲染，`requestAnimationFrame` 游戏循环带帧率归一化
- 游戏状态：START → COUNTDOWN → PLAYING → PAUSED → GAME_OVER
- 最高分持久化到 `localStorage`（key: `flappyHighScore`）
- 暗/亮主题切换，持久化到 `localStorage`（key: `flappyTheme`）
