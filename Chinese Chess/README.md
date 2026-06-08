# Game Name: Chinese Chess (中国象棋)

# Game Description
Chinese Chess (中国象棋) is a classic two-player strategy board game from China. It belongs to the same family as Western chess, shogi (Japanese chess), and janggi (Korean chess). The game represents a battle between two armies, with the objective being to capture the opponent's general (king).

## Features
- **Complete Chinese Chess rules** — All 7 piece types with correct movement, check/checkmate detection, flying general rule
- **Human vs AI mode** — Play against an AI opponent with adjustable difficulty (Easy/Normal/Hard)
- **Local 2-Player mode** — Two players on the same device
- **P2P Multiplayer** — Play over network via browser-to-browser WebRTC (PeerJS), no server needed
- **Ranked Matchmaking** — Logged-in players can join an online queue and automatically start a match
- **Ranked Title** — A ranked winner receives the “天才少年” title
- **Pixel retro art style** — Matching the project's Mario-themed aesthetic

## Game Rules

### Board
The game is played on a 10×9 grid. Pieces are placed on the intersections (points) of the grid lines. The board is divided by a river (楚河汉界) separating the two sides.

### Pieces
| Chinese | English | Movement |
|---------|---------|----------|
| 将/帅 | General/King | 1 step orthogonally within the 3×3 palace |
| 士/仕 | Advisor | 1 step diagonally within the palace |
| 象/相 | Elephant | 2 steps diagonally (cannot cross river, can be blocked) |
| 馬/傌 | Horse | L-shape (1 step orthogonal + 1 diagonal, can be blocked) |
| 車/俥 | Rook | Any distance orthogonally |
| 砲/炮 | Cannon | Any distance orthogonally (must jump exactly 1 piece to capture) |
| 卒/兵 | Pawn | 1 step forward; after crossing river can also move sideways |

### Special Rules
- **Flying General**: The two generals cannot face each other on the same column with no pieces between them
- **Check**: Must escape check on the next move
- **Checkmate**: King is in check with no legal moves to escape
- **Stalemate**: Player has no legal moves but is not in check (draw)

## How to Play
1. **VS AI**: Select difficulty (Easy/Normal/Hard) and click "人机对战 vs AI"
2. **Local 2P**: Click "本地双人 Local 2P" — players take turns on the same device
3. **P2P**: Click "联机对战" and create or join a room
4. **Ranked**: Log in on the platform, click "排位匹配", then join the online queue

### Controls
- Click a piece to select it, then click a highlighted square to move
- Press `U` to undo (not available in LAN mode)
- Press `R` to resign
- Press `Esc` to return to menu

## 联机对战 (无需服务器)
1. 双方用浏览器打开 `index.html`（演示时直接双击即可）
2. 一方点击"创建房间"，获得 4 位房间号，发给对手
3. 另一方点击"加入房间"，输入房间号即可开始对弈
4. 纯前端 P2P 直连 (PeerJS + WebRTC)，需要短暂联网完成握手，握手后断网也可继续

> 提示：纯前端 P2P 直连，无需任何后端服务

## Files
- `index.html` — Game UI
- `chinesechess.js` — Complete game logic (renderer, rules, AI, P2P networking)
- `README.md` — This file
