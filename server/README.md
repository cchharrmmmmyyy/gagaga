# Gagaga Game Service

One Node.js service for shared platform features:

- Account registration and login
- Game leaderboards
- Chinese Chess WebSocket room relay

The service is intentionally split by feature under `src/modules` so the platform APIs and Chinese Chess networking stay decoupled while sharing one process and one port.

## Run

```bash
cd server
npm install
npm start
```

Default URL:

```text
http://localhost:8080
```

Chinese Chess WebSocket:

```text
ws://localhost:8080/ws/chinese-chess
```

## Auth

```http
POST /api/register
POST /api/login
GET /api/me
POST /api/logout
```

Use this header after login/register:

```http
Authorization: Bearer <token>
```

## Leaderboards

```http
GET /api/leaderboards/config
GET /api/leaderboards/<game_id>
POST /api/leaderboards/<game_id>/submit
```

Supported game IDs:

```text
2048
breakout
catch-the-ball
chinese-chess
flappy-bird
memory
pong
tetris
tic-tac-toe
```

High-score games:

```json
{ "score": 2048, "level": 3, "elapsedMs": 123000 }
```

Memory, lower is better:

```json
{ "moves": 18, "elapsedMs": 42000 }
```

Match games:

```json
{ "result": "win" }
```

Valid match results are `win`, `loss`, and `draw`.
