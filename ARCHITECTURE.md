# Gagaga 模块开发约定

## 唯一启动方式

整个项目只启动一个服务：

```bash
cd server
npm install
npm start
```

访问 `http://localhost:8080`。不要再在游戏目录里单独启动 Flask、Express、WebSocket 或静态服务器。

主服务统一负责静态页面、登录注册、公共聊天、排行榜，以及加载各游戏自己的后端模块。

## 目录所有权

公共平台负责人维护：

```text
server/
shared/
index.html
```

游戏负责人只维护自己的目录，例如：

```text
Flappy Bird/
  index.html
  flappybird.js
  game.manifest.json
  server.js              # 可选
```

游戏开发者不要修改 `server/index.js` 注册游戏。主服务会自动扫描所有 `game.manifest.json`。

## 排行榜由游戏声明

每个游戏在自己的 `game.manifest.json` 中决定提交字段、排序方式，以及是最好成绩还是累计胜负。

```json
{
  "id": "my-game",
  "name": "My Game",
  "entry": "/My%20Game/index.html",
  "leaderboard": {
    "type": "best",
    "fields": {
      "score": { "type": "number", "required": true },
      "elapsedMs": { "type": "number" }
    },
    "sort": [
      { "field": "score", "direction": "desc" },
      { "field": "elapsedMs", "direction": "asc" }
    ]
  }
}
```

游戏页面统一引用：

```html
<script src="/shared/platform.js"></script>
```

提交成绩：

```js
await GamePlatform.submitScore("my-game", {
  score: finalScore,
  elapsedMs: Date.now() - startedAt
});
```

公共服务根据登录令牌确定用户。游戏代码不能提交或伪造 `userId`、`username`。

## 游戏专属后端

需要后端的游戏在自己的目录添加 `server.js`，可导出：

```js
async function handleHttp(context) {
  // 对应 /api/games/<game-id>/*
}

function handleWebSocket(ws, context) {
  // 对应 /ws/games/<game-id>
}

module.exports = { handleHttp, handleWebSocket };
```

不要自行创建另一套用户表、登录接口或监听端口。

## 合并规则

每个人使用独立分支：

```bash
git switch -c game/<game-id>-<name>
```

1. 普通游戏 PR 只改自己的游戏目录。
2. 需要公共能力时先提接口需求，不直接改公共实现。
3. `game.manifest.json` 的 `id` 一旦确定不得随意更名。
4. 不提交 `node_modules`、数据库、密码或令牌。
5. 合并前运行 `cd server && npm run check`，并从主服务进入游戏测试。

同时修改公共目录和游戏目录的改动应拆成两个 PR：先合并公共接口，再合并游戏接入。
