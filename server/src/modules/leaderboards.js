const { LEADERBOARD_CONFIGS } = require('../config/leaderboards');
const { randomId } = require('./auth');

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function metricValue(entry, key) {
  if (key === 'winRate') return entry.gamesPlayed ? entry.wins / entry.gamesPlayed : 0;
  return toNumber(entry[key]);
}

function compareEntries(a, b, sortRules) {
  for (const rule of sortRules) {
    const av = metricValue(a, rule.key);
    const bv = metricValue(b, rule.key);
    if (av === bv) continue;
    return rule.dir === 'asc' ? av - bv : bv - av;
  }
  return String(a.updatedAt || a.createdAt).localeCompare(String(b.updatedAt || b.createdAt));
}

function shouldReplace(current, incoming, sortRules) {
  return !current || compareEntries(incoming, current, sortRules) < 0;
}

function listLeaderboard(db, gameId, limit = 10) {
  const config = LEADERBOARD_CONFIGS[gameId];
  if (!config) return null;

  if (config.strategy === 'matchRecord') {
    return db.matchRecords
      .filter((record) => record.gameId === gameId)
      .map((record) => ({
        ...record,
        winRate: record.gamesPlayed ? Number((record.wins / record.gamesPlayed).toFixed(4)) : 0,
      }))
      .sort((a, b) => compareEntries(a, b, config.sort))
      .slice(0, limit);
  }

  return db.leaderboardEntries
    .filter((entry) => entry.gameId === gameId)
    .sort((a, b) => compareEntries(a, b, config.sort))
    .slice(0, limit);
}

function submitScore(db, user, gameId, input) {
  const config = LEADERBOARD_CONFIGS[gameId];
  if (!config) return { status: 404, data: { error: 'Unknown game' } };

  const now = new Date().toISOString();

  if (config.strategy === 'matchRecord') {
    const result = String(input.result || '').toLowerCase();
    if (!['win', 'loss', 'draw'].includes(result)) {
      return { status: 400, data: { error: 'result must be win, loss, or draw' } };
    }

    let record = db.matchRecords.find((item) => item.gameId === gameId && item.userId === user.id);
    if (!record) {
      record = {
        id: randomId('match'),
        gameId,
        userId: user.id,
        username: user.username,
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.matchRecords.push(record);
    }

    if (result === 'win') record.wins += 1;
    if (result === 'loss') record.losses += 1;
    if (result === 'draw') record.draws += 1;
    record.gamesPlayed += 1;
    record.username = user.username;
    record.updatedAt = now;
    return { status: 200, data: { record } };
  }

  const incoming = {
    id: randomId('score'),
    gameId,
    userId: user.id,
    username: user.username,
    score: toNumber(input.score),
    moves: toNumber(input.moves),
    elapsedMs: toNumber(input.elapsedMs),
    lines: toNumber(input.lines),
    level: toNumber(input.level),
    mode: typeof input.mode === 'string' ? input.mode.slice(0, 40) : '',
    createdAt: now,
    updatedAt: now,
  };

  const index = db.leaderboardEntries.findIndex((entry) => entry.gameId === gameId && entry.userId === user.id);
  const current = index >= 0 ? db.leaderboardEntries[index] : null;
  const accepted = shouldReplace(current, incoming, config.sort);
  if (accepted) {
    db.leaderboardEntries[index >= 0 ? index : db.leaderboardEntries.length] = {
      ...(current || {}),
      ...incoming,
      createdAt: current ? current.createdAt : incoming.createdAt,
    };
  }

  return {
    status: 200,
    data: {
      accepted,
      entry: index >= 0 ? db.leaderboardEntries[index] : incoming,
    },
  };
}

module.exports = { LEADERBOARD_CONFIGS, listLeaderboard, submitScore };
