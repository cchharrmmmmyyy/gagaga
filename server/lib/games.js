const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

function discoverGames() {
  const games = new Map();
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(ROOT, entry.name);
    const manifestPath = path.join(directory, "game.manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!manifest.id || games.has(manifest.id)) throw new Error(`Invalid or duplicate game id: ${manifest.id}`);
    const backendPath = path.join(directory, "server.js");
    const backend = fs.existsSync(backendPath) ? require(backendPath) : {};
    games.set(manifest.id, { directory, manifest, backend });
  }
  return games;
}

module.exports = { discoverGames, ROOT };
