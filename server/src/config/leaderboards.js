const LEADERBOARD_CONFIGS = {
  '2048': {
    label: '2048',
    strategy: 'bestHighScore',
    sort: [{ key: 'score', dir: 'desc' }],
  },
  breakout: {
    label: 'Breakout',
    strategy: 'bestHighScore',
    sort: [{ key: 'score', dir: 'desc' }, { key: 'elapsedMs', dir: 'asc' }],
  },
  'catch-the-ball': {
    label: 'Catch the Ball',
    strategy: 'bestHighScore',
    sort: [{ key: 'score', dir: 'desc' }],
  },
  'chinese-chess': {
    label: 'Chinese Chess',
    strategy: 'matchRecord',
    sort: [{ key: 'wins', dir: 'desc' }, { key: 'winRate', dir: 'desc' }, { key: 'gamesPlayed', dir: 'asc' }],
  },
  'flappy-bird': {
    label: 'Flappy Bird',
    strategy: 'bestHighScore',
    sort: [{ key: 'score', dir: 'desc' }],
  },
  memory: {
    label: 'Memory Game',
    strategy: 'bestLowScore',
    sort: [{ key: 'moves', dir: 'asc' }, { key: 'elapsedMs', dir: 'asc' }],
  },
  pong: {
    label: 'Pong',
    strategy: 'matchRecord',
    sort: [{ key: 'wins', dir: 'desc' }, { key: 'winRate', dir: 'desc' }, { key: 'gamesPlayed', dir: 'asc' }],
  },
  tetris: {
    label: 'Tetris',
    strategy: 'bestHighScore',
    sort: [{ key: 'score', dir: 'desc' }, { key: 'lines', dir: 'desc' }, { key: 'level', dir: 'desc' }],
  },
  'tic-tac-toe': {
    label: 'Tic-Tac-Toe',
    strategy: 'matchRecord',
    sort: [{ key: 'wins', dir: 'desc' }, { key: 'winRate', dir: 'desc' }, { key: 'gamesPlayed', dir: 'asc' }],
  },
};

module.exports = { LEADERBOARD_CONFIGS };
