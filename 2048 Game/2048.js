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
const comboCountEl = document.getElementById('combo-count');
const comboDisplay = document.getElementById('combo-display');
const moveCountEl = document.getElementById('move-count');
const maxNumberEl = document.getElementById('max-number');
const achievementContainer = document.getElementById('achievement-container');

// 挑战模式相关变量
const modeOverlay = document.getElementById('mode-overlay');
const challengeBtn = document.getElementById('challenge-btn');
const modeClose = document.getElementById('mode-close');
const challengeInfo = document.getElementById('challenge-info');
const challengeTimer = document.getElementById('challenge-timer');
const challengeMoves = document.getElementById('challenge-moves');
const timeRemainingEl = document.getElementById('time-remaining');
const movesRemainingEl = document.getElementById('moves-remaining');
const targetScoreEl = document.getElementById('target-score');
const challengeResultOverlay = document.getElementById('challenge-result-overlay');
const resultRetry = document.getElementById('result-retry');
const resultExit = document.getElementById('result-exit');

let gameMode = 'classic'; // classic, timed, moves
let challengeTimerInterval = null;
let challengeStartTime = 0;
let timeRemaining = 60;
let movesRemaining = 30;
let targetScore = 500;

let tiles = [];
let score = 0;
let hasWon = false;
let isGameOver = false;
let isContinuing = false;

// 悔棋相关变量
let history = [];
let undoCount = 3;

// 连击相关变量
let currentCombo = 0;

// 统计相关变量
let moveCount = 0;
let maxNumber = 2;

// 成就相关变量
let unlockedAchievements = JSON.parse(localStorage.getItem('2048Achievements')) || [];

// 成就列表
const achievements = [
    { id: 'num_64', icon: '🔲', title: '初露锋芒', desc: '达到 64', type: 'number-achievement', check: (s) => s >= 64 },
    { id: 'num_128', icon: '📦', title: '小有所成', desc: '达到 128', type: 'number-achievement', check: (s) => s >= 128 },
    { id: 'num_256', icon: '🎁', title: '渐入佳境', desc: '达到 256', type: 'number-achievement', check: (s) => s >= 256 },
    { id: 'num_512', icon: '💎', title: '五五开', desc: '达到 512', type: 'number-achievement', check: (s) => s >= 512 },
    { id: 'num_1024', icon: '🌟', title: '千载难逢', desc: '达到 1024', type: 'number-achievement', check: (s) => s >= 1024 },
    { id: 'num_2048', icon: '🏆', title: '通关达成', desc: '达到 2048', type: 'milestone-achievement', check: (s) => s >= 2048 },
    { id: 'num_4096', icon: '👑', title: '傲视群雄', desc: '达到 4096', type: 'milestone-achievement', check: (s) => s >= 4096 },
    { id: 'combo_3', icon: '⚡', title: '三连击', desc: '连击 3 次', type: 'combo-achievement', check: () => currentCombo >= 3 },
    { id: 'combo_5', icon: '🔥', title: '五连击', desc: '连击 5 次', type: 'combo-achievement', check: () => currentCombo >= 5 },
    { id: 'score_1000', icon: '💯', title: '初试锋芒', desc: '分数达到 1000', type: 'score-achievement', check: () => score >= 1000 },
    { id: 'score_5000', icon: '💰', title: '腰缠万贯', desc: '分数达到 5000', type: 'score-achievement', check: () => score >= 5000 },
    { id: 'score_10000', icon: '💎', title: '富甲一方', desc: '分数达到 10000', type: 'score-achievement', check: () => score >= 10000 },
];

// 显示成就徽章
function showAchievement(achievement) {
    if (unlockedAchievements.includes(achievement.id)) return;

    unlockedAchievements.push(achievement.id);
    localStorage.setItem('2048Achievements', JSON.stringify(unlockedAchievements));

    const badge = document.createElement('div');
    badge.className = `achievement-badge ${achievement.type}`;
    badge.innerHTML = `
        <span class="achievement-icon">${achievement.icon}</span>
        <div class="achievement-content">
            <div class="achievement-title">${achievement.title}</div>
            <div class="achievement-desc">${achievement.desc}</div>
        </div>
    `;

    achievementContainer.appendChild(badge);

    setTimeout(() => {
        badge.style.animation = 'achievementSlideOut 0.5s ease forwards';
        setTimeout(() => {
            badge.remove();
        }, 500);
    }, 3000);
}

// 检测成就
function checkAchievements() {
    achievements.forEach(achievement => {
        if (!unlockedAchievements.includes(achievement.id) && achievement.check()) {
            showAchievement(achievement);
        }
    });
}

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
    currentCombo = 0;
    moveCount = 0;
    maxNumber = 2;
    undoCountEl.textContent = undoCount;
    comboCountEl.textContent = currentCombo;
    moveCountEl.textContent = moveCount;
    maxNumberEl.textContent = maxNumber;
    undoBtn.disabled = false;
    currentScoreEl.textContent = score;
    gameOverOverlay.style.display = 'none';
    winOverlay.style.display = 'none';

    // 重置挑战模式
    if (gameMode !== 'classic') {
        if (challengeTimerInterval) {
            clearInterval(challengeTimerInterval);
            challengeTimerInterval = null;
        }
        timeRemaining = 60;
        movesRemaining = 30;
        targetScore = 500;

        if (gameMode === 'timed') {
            challengeStartTime = Date.now();
            challengeTimerInterval = setInterval(updateTimer, 1000);
            challengeTimer.style.display = 'flex';
            challengeMoves.style.display = 'none';
        } else if (gameMode === 'moves') {
            challengeMoves.style.display = 'flex';
            challengeTimer.style.display = 'none';
        }

        targetScoreEl.textContent = targetScore;
        movesRemainingEl.textContent = movesRemaining;
        timeRemainingEl.textContent = timeRemaining;
    }

    for (let i = 0; i < 16; i++) {
        const tile = createTile();
        tiles.push(tile);
        gameContainer.appendChild(tile);
    }
    addRandomTile();
    addRandomTile();
}

// 更新计时器
function updateTimer() {
    const elapsed = Math.floor((Date.now() - challengeStartTime) / 1000);
    timeRemaining = Math.max(0, 60 - elapsed);
    timeRemainingEl.textContent = timeRemaining;

    if (timeRemaining <= 10) {
        timeRemainingEl.style.color = '#ff0000';
    }

    if (timeRemaining <= 0) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
        challengeFailed('时间到！');
    }
}

// 挑战成功
function challengeSuccess() {
    if (gameMode === 'timed' && challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }

    const elapsed = Math.floor((Date.now() - challengeStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    document.getElementById('challenge-result-title').textContent = '🎉 挑战成功!';
    document.getElementById('result-final-score').textContent = score;
    document.getElementById('result-target-score').textContent = targetScore;
    document.getElementById('result-time').textContent = `${minutes}分${seconds}秒`;
    document.getElementById('result-moves').textContent = moveCount;
    document.getElementById('challenge-result-message').textContent = `太棒了！你成功达成了目标分数！`;

    challengeResultOverlay.style.display = 'flex';
    hideChallengeInfo();
}

// 挑战失败
function challengeFailed(reason) {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }

    const elapsed = Math.floor((Date.now() - challengeStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    document.getElementById('challenge-result-title').textContent = '😢 挑战失败';
    document.getElementById('result-final-score').textContent = score;
    document.getElementById('result-target-score').textContent = targetScore;
    document.getElementById('result-time').textContent = `${minutes}分${seconds}秒`;
    document.getElementById('result-moves').textContent = moveCount;
    document.getElementById('challenge-result-message').textContent = reason;

    challengeResultOverlay.style.display = 'flex';
    hideChallengeInfo();
}

// 显示挑战信息
function showChallengeInfo() {
    challengeInfo.style.display = 'flex';
}

// 隐藏挑战信息
function hideChallengeInfo() {
    challengeInfo.style.display = 'none';
    challengeTimer.style.display = 'none';
    challengeMoves.style.display = 'none';
}

// 开始挑战模式
function startChallenge(mode) {
    gameMode = mode;

    // 根据难度调整目标
    const difficulty = Math.random();
    if (difficulty < 0.33) {
        targetScore = 500;
    } else if (difficulty < 0.66) {
        targetScore = 1000;
    } else {
        targetScore = 1500;
    }

    if (mode === 'timed') {
        timeRemaining = 60;
        movesRemaining = 999; // 限时模式不限制步数
    } else if (mode === 'moves') {
        movesRemaining = 30;
        timeRemaining = 999; // 限步模式不限制时间
    }

    modeOverlay.style.display = 'none';
    initializeBoard();
    showChallengeInfo();
}

// 显示连击效果
function showCombo(combo) {
    if (combo < 2) return; // 只有2连击以上才显示

    comboCountEl.textContent = combo;
    comboDisplay.innerHTML = '';

    const comboText = document.createElement('div');
    comboText.className = 'combo-text';

    if (combo >= 4) {
        comboText.textContent = `🔥 ${combo} 连击!`;
        comboText.style.color = '#f5576c';
        comboText.style.fontSize = '40px';
    } else if (combo >= 3) {
        comboText.textContent = `⚡ ${combo} 连击!`;
        comboText.style.color = '#f093fb';
        comboText.style.fontSize = '36px';
    } else {
        comboText.textContent = `${combo} 连击!`;
    }

    comboDisplay.appendChild(comboText);

    // 动画结束后清除
    setTimeout(() => {
        comboDisplay.innerHTML = '';
    }, 800);
}

// 保存当前状态到历史记录
function saveState() {
    const state = {
        tiles: tiles.map(tile => parseInt(tile.textContent) || 0),
        score: score,
        moveCount: moveCount,
        maxNumber: maxNumber,
        currentCombo: currentCombo
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

    // 恢复统计
    moveCount = previousState.moveCount;
    maxNumber = previousState.maxNumber;
    currentCombo = previousState.currentCombo;
    moveCountEl.textContent = moveCount;
    maxNumberEl.textContent = maxNumber;
    comboCountEl.textContent = currentCombo;

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
    let mergeCount = 0; // 统计本次移动的合并次数

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
        if (result.score > 0) {
            updateScore(result.score);
            mergeCount++; // 统计合并次数
        }

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

        // 更新统计
        moveCount++;
        moveCountEl.textContent = moveCount;

        // 更新最大数字
        let currentMax = 0;
        for (let i = 0; i < 16; i++) {
            const value = parseInt(tiles[i].textContent) || 0;
            if (value > currentMax) {
                currentMax = value;
            }
        }
        if (currentMax > maxNumber) {
            maxNumber = currentMax;
            maxNumberEl.textContent = maxNumber;
        }

        // 更新连击次数
        if (mergeCount >= 2) {
            currentCombo += mergeCount;
            showCombo(mergeCount);
        } else {
            // 如果没有合并，连击次数重置
            currentCombo = 0;
            comboCountEl.textContent = currentCombo;
        }

        // 检测成就
        checkAchievements();

        // 挑战模式检查
        if (gameMode === 'moves') {
            movesRemaining--;
            movesRemainingEl.textContent = movesRemaining;

            if (movesRemaining <= 5) {
                movesRemainingEl.style.color = '#ff0000';
            }

            if (score >= targetScore) {
                challengeSuccess();
                return;
            } else if (movesRemaining <= 0) {
                challengeFailed('步数用尽！');
                return;
            }
        } else if (gameMode === 'timed') {
            if (score >= targetScore) {
                challengeSuccess();
                return;
            }
        }

        if (!hasWon && !isContinuing) {
            checkWin();
        }

        if (!canMove()) {
            if (gameMode !== 'classic') {
                if (score >= targetScore) {
                    challengeSuccess();
                } else {
                    challengeFailed('无法移动更多方块！');
                }
            } else {
                gameOver();
            }
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

// 挑战模式事件监听
challengeBtn.addEventListener('click', () => {
    modeOverlay.style.display = 'flex';
});

modeClose.addEventListener('click', () => {
    modeOverlay.style.display = 'none';
});

modeOverlay.addEventListener('click', (e) => {
    if (e.target === modeOverlay) {
        modeOverlay.style.display = 'none';
    }
});

document.getElementById('mode-classic').addEventListener('click', () => {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }
    hideChallengeInfo();
    gameMode = 'classic';
    modeOverlay.style.display = 'none';
    initializeBoard();
});

document.getElementById('mode-timed').addEventListener('click', () => {
    startChallenge('timed');
});

document.getElementById('mode-moves').addEventListener('click', () => {
    startChallenge('moves');
});

resultRetry.addEventListener('click', () => {
    challengeResultOverlay.style.display = 'none';
    startChallenge(gameMode);
});

resultExit.addEventListener('click', () => {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }
    hideChallengeInfo();
    gameMode = 'classic';
    challengeResultOverlay.style.display = 'none';
    initializeBoard();
});

// 初始化游戏
initializeBoard();
