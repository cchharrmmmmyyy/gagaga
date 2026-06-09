const gameContainer = document.getElementById('game-container');
const currentScoreEl = document.getElementById('current-score');
const bestScoreEl = document.getElementById('best-score');
const gameOverOverlay = document.getElementById('game-over-overlay');
const winOverlay = document.getElementById('win-overlay');
const finalScoreEl = document.getElementById('final-score');
const tryAgainBtn = document.getElementById('try-again-btn');
const continueBtn = document.getElementById('continue-btn');
const newGameBtn = document.getElementById('new-game-btn');
const undoBtn = document.getElementById('undo-btn');
const undoCountEl = document.getElementById('undo-count');

let tiles = [];
let score = 0;
let hasWon = false;
let isGameOver = false;
let isContinuing = false;

// 悔棋相关变量
let history = [];
let undoCount = 3;

let bestScore = parseInt(localStorage.getItem('2048BestScore')) || 0;
bestScoreEl.textContent = bestScore;
undoCountEl.textContent = undoCount;

function createTile(value = 0) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.textContent = value ? value : '';
    if (value) {
        tile.classList.add(`tile-${value}`);
        if (value > 2048) {
            tile.classList.add('tile-super');
        }
    }
    return tile;
}

function initializeBoard() {
    gameContainer.innerHTML = '';
    tiles = [];
    score = 0;
    hasWon = false;
    isGameOver = false;
    isContinuing = false;
    history = [];
    undoCount = 3;
    undoCountEl.textContent = undoCount;
    undoBtn.disabled = false;
    currentScoreEl.textContent = score;
    gameOverOverlay.style.display = 'none';
    winOverlay.style.display = 'none';

    for (let i = 0; i < 16; i++) {
        const tile = createTile();
        tiles.push(tile);
        gameContainer.appendChild(tile);
    }
    addRandomTile();
    addRandomTile();
}

// 保存当前状态到历史记录
function saveState() {
    const state = {
        tiles: tiles.map(tile => parseInt(tile.textContent) || 0),
        score: score
    };
    history.push(state);
    // 最多保存10步历史
    if (history.length > 10) {
        history.shift();
    }
}

// 悔棋函数
function undo() {
    if (history.length === 0 || undoCount <= 0 || isGameOver) return;

    const previousState = history.pop();
    undoCount--;
    undoCountEl.textContent = undoCount;

    // 恢复分数
    score = previousState.score;
    currentScoreEl.textContent = score;

    // 恢复棋盘状态
    for (let i = 0; i < 16; i++) {
        tiles[i].textContent = previousState.tiles[i] || '';
        tiles[i].className = 'tile';
        if (previousState.tiles[i]) {
            tiles[i].classList.add(`tile-${previousState.tiles[i]}`);
            if (previousState.tiles[i] > 2048) {
                tiles[i].classList.add('tile-super');
            }
        }
    }

    // 禁用按钮当悔棋次数用完
    if (undoCount <= 0) {
        undoBtn.disabled = true;
    }
}

function addRandomTile() {
    const emptyTiles = tiles.filter(tile => !tile.textContent);
    if (emptyTiles.length > 0) {
        const randomTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        randomTile.textContent = value;
        randomTile.classList.add(`tile-${value}`);
        if (value > 2048) {
            randomTile.classList.add('tile-super');
        }
    }
}

function updateScore(points) {
    score += points;
    currentScoreEl.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        bestScoreEl.textContent = bestScore;
        localStorage.setItem('2048BestScore', bestScore);
    }
}

function moveTiles(direction) {
    if (isGameOver) return;

    // 保存当前状态用于悔棋
    saveState();

    let hasMoved = false;
    for (let i = 0; i < 4; i++) {
        let rowOrCol = [];
        for (let j = 0; j < 4; j++) {
            const index = direction === 'up' || direction === 'down' ? i + j * 4 : j + i * 4;
            rowOrCol.push({
                element: tiles[index],
                value: parseInt(tiles[index].textContent) || 0
            });
        }
        if (direction === 'right' || direction === 'down') rowOrCol.reverse();

        const result = moveAndMergeRowOrCol(rowOrCol);
        if (result.moved) hasMoved = true;
        if (result.score > 0) updateScore(result.score);

        if (direction === 'right' || direction === 'down') rowOrCol.reverse();

        for (let j = 0; j < 4; j++) {
            const index = direction === 'up' || direction === 'down' ? i + j * 4 : j + i * 4;
            tiles[index] = rowOrCol[j].element;
        }
    }

    if (hasMoved) {
        renderBoard();
        addRandomTile();
        renderBoard();

        if (!hasWon && !isContinuing) {
            checkWin();
        }

        if (!canMove()) {
            gameOver();
        }
    }
}

function moveAndMergeRowOrCol(rowOrCol) {
    let moved = false;
    let totalScore = 0;

    for (let i = 0; i < rowOrCol.length; i++) {
        for (let j = i + 1; j < rowOrCol.length; j++) {
            if (!rowOrCol[i].value && rowOrCol[j].value) {
                rowOrCol[i].value = rowOrCol[j].value;
                rowOrCol[i].element.textContent = rowOrCol[j].value;
                rowOrCol[i].element.className = `tile tile-${rowOrCol[j].value}`;
                if (rowOrCol[j].value > 2048) {
                    rowOrCol[i].element.classList.add('tile-super');
                }

                rowOrCol[j].value = 0;
                rowOrCol[j].element.textContent = '';
                rowOrCol[j].element.className = 'tile';
                moved = true;
                break;
            } else if (rowOrCol[i].value && rowOrCol[i].value === rowOrCol[j].value) {
                rowOrCol[i].value *= 2;
                rowOrCol[i].element.textContent = rowOrCol[i].value;
                rowOrCol[i].element.className = `tile tile-${rowOrCol[i].value}`;
                if (rowOrCol[i].value > 2048) {
                    rowOrCol[i].element.classList.add('tile-super');
                }

                totalScore += rowOrCol[i].value;

                rowOrCol[j].value = 0;
                rowOrCol[j].element.textContent = '';
                rowOrCol[j].element.className = 'tile';
                moved = true;
                break;
            } else if (rowOrCol[j].value) {
                break;
            }
        }
    }
    return { moved, score: totalScore };
}

function renderBoard() {
    for (let i = 0; i < 16; i++) {
        const tile = tiles[i];
        const value = parseInt(tile.textContent) || 0;
        tile.className = 'tile';
        if (value) {
            tile.classList.add(`tile-${value}`);
            if (value > 2048) {
                tile.classList.add('tile-super');
            }
        }
    }
}

function canMove() {
    for (let i = 0; i < 16; i++) {
        if (!tiles[i].textContent) return true;

        const row = Math.floor(i / 4);
        const col = i % 4;

        if (col < 3 && tiles[i].textContent === tiles[i + 1].textContent) return true;
        if (row < 3 && tiles[i].textContent === tiles[i + 4].textContent) return true;
    }
    return false;
}

function checkWin() {
    for (let i = 0; i < 16; i++) {
        if (parseInt(tiles[i].textContent) === 2048) {
            hasWon = true;
            winOverlay.style.display = 'flex';
            return;
        }
    }
}

function gameOver() {
    isGameOver = true;
    finalScoreEl.textContent = score;
    gameOverOverlay.style.display = 'flex';
}

function handleKeyPress(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        const direction = event.key.replace('Arrow', '').toLowerCase();
        moveTiles(direction);
    }
}

function handleTouch(event) {
    if (isGameOver) return;

    const touch = event.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const handleTouchEnd = (endEvent) => {
        const endTouch = endEvent.changedTouches[0];
        const deltaX = endTouch.clientX - startX;
        const deltaY = endTouch.clientY - startY;
        const minSwipeDistance = 30;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) > minSwipeDistance) {
                moveTiles(deltaX > 0 ? 'right' : 'left');
            }
        } else {
            if (Math.abs(deltaY) > minSwipeDistance) {
                moveTiles(deltaY > 0 ? 'down' : 'up');
            }
        }

        document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchend', handleTouchEnd);
}

tryAgainBtn.addEventListener('click', initializeBoard);
continueBtn.addEventListener('click', () => {
    isContinuing = true;
    winOverlay.style.display = 'none';
});
newGameBtn.addEventListener('click', initializeBoard);
undoBtn.addEventListener('click', undo);
document.addEventListener('keydown', handleKeyPress);
gameContainer.addEventListener('touchstart', handleTouch);

// 初始化游戏
initializeBoard();
