# Game Service

This folder now contains two small services:

- `index.js`: existing Chinese Chess WebSocket room server.
- `app.py`: Flask auth and leaderboard API.

## Run Flask API

```bash
pip install -r requirements.txt
python app.py
```

Default URL:

```text
http://localhost:5000
```

## Auth APIs

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

## Leaderboard APIs

```http
GET /api/leaderboards/config
GET /api/leaderboards/<game_id>
POST /api/leaderboards/<game_id>/submit
```

Supported `game_id` values:

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

Score games submit higher-is-better metrics:

```json
{ "score": 2048, "level": 3, "elapsed_ms": 123000 }
```

Memory submits lower-is-better metrics:

```json
{ "moves": 18, "elapsed_ms": 42000 }
```

Match games submit results:

```json
{ "result": "win" }
```

Valid match results are `win`, `loss`, and `draw`.
