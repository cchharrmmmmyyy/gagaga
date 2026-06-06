const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "db.json");
const EMPTY_DB = {
  users: [],
  sessions: [],
  leaderboardEntries: [],
  matchRecords: [],
  gameData: {},
};

function load() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) return structuredClone(EMPTY_DB);
  return { ...structuredClone(EMPTY_DB), ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
}

let db = load();

function read() {
  return db;
}

function update(mutator) {
  const result = mutator(db);
  const temporary = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(db, null, 2)}\n`);
  fs.renameSync(temporary, DATA_FILE);
  return result;
}

module.exports = { read, update };
