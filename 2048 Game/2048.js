// 测试修改：完成了分数统计功能
const gameContainer = document.getElementById('game-container');
const currentScoreEl = document.getElementById('current-score');
const bestScoreEl = document.getElementById('best-score');
const gameOverOverlay = document.getElementById('game-over-overlay');
const winOverlay = document.getElementById('win-overlay');
const finalScoreEl = document.getElementById('final-score');
const tryAgainBtn = document.getElementById('try-again-btn');
const continueBtn = document.getElementById('continue-btn');
const newGameBtn = document.getElementById('new-game-btn');

// 登录注册相关元素
const authOverlay = document.getElementById('auth-overlay');
const userBar = document.getElementById('user-bar');
const userQQ = document.getElementById('user-qq');
const logoutBtn = document.getElementById('logout-btn');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

// 排行榜相关元素
const rankingBtn = document.getElementById('ranking-btn');
const rankingOverlay = document.getElementById('ranking-overlay');
const rankingClose = document.getElementById('ranking-close');
const rankingList = document.getElementById('ranking-list');

let tiles = [];
let score = 0;
let hasWon = false;
let isGameOver = false;
let isContinuing = false;
let leaderboardSubmitted = false;

// 检查是否已登录
let currentUser = localStorage.getItem('2048CurrentUser');
let bestScore = currentUser 
    ? parseInt(localStorage.getItem(`2048BestScore_${currentUser}`)) || 0 
    : parseInt(localStorage.getItem('2048BestScore')) || 0;

bestScoreEl.textContent = bestScore;

// 初始化登录状态
function initAuth() {
    if (currentUser) {
        authOverlay.style.display = 'none';
        userBar.classList.add('show');
        userQQ.textContent = currentUser;
    } else {
        authOverlay.style.display = 'flex';
        userBar.classList.remove('show');
    }
}

// 切换登录/注册标签
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        if (tab.dataset.tab === 'login') {
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
        } else {
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        }
        
        loginError.textContent = '';
        registerError.textContent = '';
    });
});

// 登录处理
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const qq = document.getElementById('login-qq').value.trim();
    const password = document.getElementById('login-password').value;
    
    loginError.textContent = '';
    
    // 验证输入
    if (!qq) {
        loginError.textContent = '请输入QQ号';
        return;
    }
    
    if (!/^\d+$/.test(qq)) {
        loginError.textContent = 'QQ号只能是数字';
        return;
    }
    
    if (!password) {
        loginError.textContent = '请输入密码';
        return;
    }
    
    // 检查用户是否存在
    const users = JSON.parse(localStorage.getItem('2048Users') || '{}');
    const user = users[qq];
    
    if (!user) {
        loginError.textContent = '账号不存在，请先注册';
        return;
    }
    
    if (user.password !== password) {
        loginError.textContent = '密码错误';
        return;
    }
    
    // 登录成功
    currentUser = qq;
    localStorage.setItem('2048CurrentUser', qq);
    bestScore = parseInt(localStorage.getItem(`2048BestScore_${qq}`)) || 0;
    bestScoreEl.textContent = bestScore;
    
    authOverlay.style.display = 'none';
    userBar.classList.add('show');
    userQQ.textContent = qq;
    
    // 清空表单
    loginForm.reset();
});

// 注册处理
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const qq = document.getElementById('register-qq').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    registerError.textContent = '';
    
    // 验证输入
    if (!qq) {
        registerError.textContent = '请输入QQ号';
        return;
    }
    
    if (!/^\d+$/.test(qq)) {
        registerError.textContent = 'QQ号只能是数字';
        return;
    }
    
    if (qq.length < 5) {
        registerError.textContent = 'QQ号至少5位';
        return;
    }
    
    if (password.length < 8) {
        registerError.textContent = '密码至少8位';
        return;
    }
    
    if (password !== confirm) {
        registerError.textContent = '两次密码不一致';
        return;
    }
    
    // 检查用户是否已存在
    const users = JSON.parse(localStorage.getItem('2048Users') || '{}');
    
    if (users[qq]) {
        registerError.textContent = '该QQ号已注册';
        return;
    }
    
    // 注册成功
    users[qq] = { password: password };
    localStorage.setItem('2048Users', JSON.stringify(users));
    
    // 自动登录
    currentUser = qq;
    localStorage.setItem('2048CurrentUser', qq);
    bestScore = 0;
    bestScoreEl.textContent = bestScore;
    
    authOverlay.style.display = 'none';
    userBar.classList.add('show');
    userQQ.textContent = qq;
    
    // 清空表单
    registerForm.reset();
    
    // 切换回登录标签
    authTabs[0].click();
});

// 退出登录
logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('2048CurrentUser');
    authOverlay.style.display = 'flex';
    userBar.classList.remove('show');
});

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
    leaderboardSubmitted = false;
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
        if (currentUser) {
            localStorage.setItem(`2048BestScore_${currentUser}`, bestScore);
        } else {
            localStorage.setItem('2048BestScore', bestScore);
        }
    }
}

function moveTiles(direction) {
    if (isGameOver) return;

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
            submit2048Score('win');
            return;
        }
    }
}

function gameOver() {
    isGameOver = true;
    finalScoreEl.textContent = score;
    gameOverOverlay.style.display = 'flex';
    submit2048Score('game-over');
}

function submit2048Score(mode) {
    if (leaderboardSubmitted || !window.GagagaPlatform) return;
    leaderboardSubmitted = true;
    window.GagagaPlatform.submitScore('2048', { score, mode }, `2048:${Date.now()}:${score}`);
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
document.addEventListener('keydown', handleKeyPress);
gameContainer.addEventListener('touchstart', handleTouch);

// 排行榜功能
function getRankingData() {
    const users = JSON.parse(localStorage.getItem('2048Users') || '{}');
    const rankings = [];
    
    for (const qq in users) {
        const userScore = parseInt(localStorage.getItem(`2048BestScore_${qq}`)) || 0;
        if (userScore > 0) {
            rankings.push({
                qq: qq,
                score: userScore
            });
        }
    }
    
    // 按分数降序排序
    rankings.sort((a, b) => b.score - a.score);
    
    return rankings;
}

function renderRanking() {
    const rankings = getRankingData();
    
    if (rankings.length === 0) {
        rankingList.innerHTML = `
            <div class="ranking-empty">
                <div class="ranking-empty-icon">📊</div>
                <div class="ranking-empty-text">暂无排行榜数据<br>快去玩游戏上榜吧！</div>
            </div>
        `;
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉'];
    const rankClasses = ['gold', 'silver', 'bronze', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal'];
    
    rankingList.innerHTML = rankings.slice(0, 10).map((item, index) => {
        const isCurrentUser = item.qq === currentUser;
        const rankClass = rankClasses[index] || 'normal';
        const medal = medals[index] || '';
        
        return `
            <div class="ranking-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="ranking-rank ${rankClass}">${index + 1}</div>
                <div class="ranking-info">
                    <div class="ranking-user">
                        ${isCurrentUser ? '<span style="color: #667eea;">★ </span>' : ''}${item.qq}${isCurrentUser ? ' (你)' : ''}
                    </div>
                    <div class="ranking-score">最高分: ${item.score}</div>
                </div>
                ${medal ? `<div class="ranking-medal">${medal}</div>` : ''}
            </div>
        `;
    }).join('');
}

function showRanking() {
    renderRanking();
    rankingOverlay.classList.add('show');
}

function hideRanking() {
    rankingOverlay.classList.remove('show');
}

// 排行榜事件监听
rankingBtn.addEventListener('click', showRanking);
rankingClose.addEventListener('click', hideRanking);
rankingOverlay.addEventListener('click', (e) => {
    if (e.target === rankingOverlay) {
        hideRanking();
    }
});

// ESC键关闭排行榜
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rankingOverlay.classList.contains('show')) {
        hideRanking();
    }
});

// 初始化认证状态
initAuth();

// 只有登录后才能开始游戏
if (currentUser) {
    initializeBoard();
}
