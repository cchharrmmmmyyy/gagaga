# Gagaga Platform Server

```bash
cd server
npm install
npm start
```

默认地址为 `http://localhost:8080`，通过 `PORT` 可修改端口。

公共浏览器接口见 `/shared/platform.js`，完整协作约定见 `/ARCHITECTURE.md`。

象棋联机模块位于 `Chinese Chess/server.js`，由本服务自动加载，不需要独立启动。
