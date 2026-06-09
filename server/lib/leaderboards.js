const crypto = require("crypto");
const store = require("./store");

function value(entry, field) {
  if (field === "winRate") return entry.gamesPlayed ? entry.wins / entry.gamesPlayed : 0;
  return Number(entry.payload?.[field] ?? entry[field] ?? 0);
}

function compare(a, b, rules) {
  for (const rule of rules) {
    const difference = value(a, rule.field) - value(b, rule.field);
    if (difference) return rule.direction === "asc" ? difference : -difference;
  }
  return 0;
}

function configFor(game) {
  const config = game?.manifest?.leaderboard;
  if (!config) throw Object.assign(new Error("该游戏未启用排行榜"), { status: 404 });
  return config;
}

function list(game, limit = 10) {
  const config = configFor(game);
  const db = store.read();
  const source = config.type === "match" ? db.matchRecords : db.leaderboardEntries;
  return source
    .filter((entry) => entry.gameId === game.manifest.id)
    .sort((a, b) => compare(a, b, config.sort))
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 10)));
}

function validatePayload(config, body) {
  const payload = {};
  for (const [name, definition] of Object.entries(config.fields || {})) {
    const raw = body[name];
    if (definition.required && raw === undefined) {
      throw Object.assign(new Error(`缺少排行榜字段: ${name}`), { status: 400 });
    }
    if (raw === undefined) continue;
    if (definition.type === "number") {
      const number = Number(raw);
      if (!Number.isFinite(number)) throw Object.assign(new Error(`${name} 必须是数字`), { status: 400 });
      payload[name] = number;
    } else {
      payload[name] = String(raw).slice(0, definition.maxLength || 80);
    }
  }
  return payload;
}

function submit(game, user, body) {
  const config = configFor(game);
  const now = new Date().toISOString();
  if (config.type === "match") {
    const result = String(body.result || "").toLowerCase();
    if (!["win", "loss", "draw"].includes(result)) {
      throw Object.assign(new Error("result 必须是 win、loss 或 draw"), { status: 400 });
    }
    return store.update((db) => {
      let record = db.matchRecords.find((item) => item.gameId === game.manifest.id && item.userId === user.id);
      if (!record) {
        record = {
          id: `match_${crypto.randomBytes(12).toString("hex")}`,
          gameId: game.manifest.id,
          userId: user.id,
          username: user.username,
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
          createdAt: now,
        };
        db.matchRecords.push(record);
      }
      record[{ win: "wins", loss: "losses", draw: "draws" }[result]] += 1;
      record.gamesPlayed += 1;
      record.username = user.username;
      record.updatedAt = now;
      return { accepted: true, entry: record };
    });
  }

  const payload = validatePayload(config, body);
  const accumulateFields = new Set(config.accumulateFields || []);
  return store.update((db) => {
    let entry = db.leaderboardEntries.find(
      (item) => item.gameId === game.manifest.id && item.userId === user.id,
    );
    if (accumulateFields.size) {
      if (!entry) {
        entry = {
          id: `score_${crypto.randomBytes(12).toString("hex")}`,
          gameId: game.manifest.id,
          userId: user.id,
          payload: {},
          createdAt: now,
        };
        db.leaderboardEntries.push(entry);
      }
      for (const field of accumulateFields) {
        payload[field] = Number(entry.payload?.[field] || entry[field] || 0) + Number(payload[field] || 0);
      }
    }
    const candidate = { payload };
    const accepted = !entry || compare(candidate, entry, config.sort) < 0;
    if (accepted) {
      if (!entry) {
        entry = {
          id: `score_${crypto.randomBytes(12).toString("hex")}`,
          gameId: game.manifest.id,
          userId: user.id,
          createdAt: now,
        };
        db.leaderboardEntries.push(entry);
      }
      entry.username = user.username;
      entry.payload = payload;
      Object.assign(entry, payload);
      entry.updatedAt = now;
    }
    return { accepted, entry };
  });
}

module.exports = { list, submit };
