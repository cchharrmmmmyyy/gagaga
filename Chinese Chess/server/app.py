import os
import re
import secrets
import sqlite3
import time
from pathlib import Path

from flask import Flask, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "game_service.sqlite3"
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14

LEADERBOARD_CONFIGS = {
    "2048": {
        "label": "2048",
        "strategy": "best_high_score",
        "sort": [{"key": "score", "dir": "desc"}],
    },
    "breakout": {
        "label": "Breakout",
        "strategy": "best_high_score",
        "sort": [{"key": "score", "dir": "desc"}, {"key": "elapsed_ms", "dir": "asc"}],
    },
    "catch-the-ball": {
        "label": "Catch the Ball",
        "strategy": "best_high_score",
        "sort": [{"key": "score", "dir": "desc"}],
    },
    "chinese-chess": {
        "label": "Chinese Chess",
        "strategy": "match_record",
        "sort": [{"key": "wins", "dir": "desc"}, {"key": "win_rate", "dir": "desc"}, {"key": "games_played", "dir": "asc"}],
    },
    "flappy-bird": {
        "label": "Flappy Bird",
        "strategy": "best_high_score",
        "sort": [{"key": "score", "dir": "desc"}],
    },
    "memory": {
        "label": "Memory Game",
        "strategy": "best_low_score",
        "sort": [{"key": "moves", "dir": "asc"}, {"key": "elapsed_ms", "dir": "asc"}],
    },
    "pong": {
        "label": "Pong",
        "strategy": "match_record",
        "sort": [{"key": "wins", "dir": "desc"}, {"key": "win_rate", "dir": "desc"}, {"key": "games_played", "dir": "asc"}],
    },
    "tetris": {
        "label": "Tetris",
        "strategy": "best_high_score",
        "sort": [{"key": "score", "dir": "desc"}, {"key": "lines", "dir": "desc"}, {"key": "level", "dir": "desc"}],
    },
    "tic-tac-toe": {
        "label": "Tic-Tac-Toe",
        "strategy": "match_record",
        "sort": [{"key": "wins", "dir": "desc"}, {"key": "win_rate", "dir": "desc"}, {"key": "games_played", "dir": "asc"}],
    },
}

app = Flask(__name__)


def get_db():
    if "db" not in g:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS leaderboard_scores (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            score REAL DEFAULT 0,
            moves REAL DEFAULT 0,
            elapsed_ms REAL DEFAULT 0,
            lines REAL DEFAULT 0,
            level REAL DEFAULT 0,
            mode TEXT DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(game_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS match_records (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            draws INTEGER DEFAULT 0,
            games_played INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(game_id, user_id)
        );
        """
    )
    db.commit()


@app.before_request
def before_request():
    init_db()
    if request.method == "OPTIONS":
        return ("", 204)


@app.after_request
def after_request(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


def row_to_dict(row):
    return dict(row) if row else None


def now_ts():
    return int(time.time())


def public_user(row):
    return {"id": row["id"], "username": row["username"], "created_at": row["created_at"]}


def clean_sessions():
    db = get_db()
    db.execute("DELETE FROM sessions WHERE expires_at <= ?", (now_ts(),))
    db.commit()


def current_user():
    clean_sessions()
    auth = request.headers.get("Authorization", "")
    match = re.match(r"Bearer\s+(.+)", auth, re.I)
    if not match:
        return None
    token = match.group(1)
    db = get_db()
    return db.execute(
        """
        SELECT users.* FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ? AND sessions.expires_at > ?
        """,
        (token, now_ts()),
    ).fetchone()


def require_user():
    user = current_user()
    if not user:
        return None, (jsonify({"error": "Login required"}), 401)
    return user, None


def make_session(user_id):
    db = get_db()
    token = secrets.token_hex(32)
    ts = now_ts()
    db.execute(
        "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        (token, user_id, ts + TOKEN_TTL_SECONDS, ts),
    )
    db.commit()
    return token


def valid_username(username):
    return bool(re.fullmatch(r"[a-zA-Z0-9_\u4e00-\u9fa5]{3,20}", username or ""))


def to_number(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def sort_value(row, key):
    if key == "win_rate":
        games = row.get("games_played", 0) or 0
        return (row.get("wins", 0) or 0) / games if games else 0
    return row.get(key, 0) or 0


def compare_entries(a, b, sort_rules):
    for rule in sort_rules:
        av = sort_value(a, rule["key"])
        bv = sort_value(b, rule["key"])
        if av == bv:
            continue
        if rule["dir"] == "asc":
            return -1 if av < bv else 1
        return -1 if av > bv else 1
    return 0


def should_replace(current, incoming, sort_rules):
    return current is None or compare_entries(incoming, current, sort_rules) < 0


@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if not valid_username(username):
        return jsonify({"error": "Username must be 3-20 letters, numbers, underscores, or Chinese characters"}), 400
    if len(password) < 6 or len(password) > 72:
        return jsonify({"error": "Password must be 6-72 characters"}), 400

    db = get_db()
    if db.execute("SELECT id FROM users WHERE lower(username) = lower(?)", (username,)).fetchone():
        return jsonify({"error": "Username already exists"}), 409

    user_id = "user_" + secrets.token_hex(12)
    ts = now_ts()
    db.execute(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
        (user_id, username, generate_password_hash(password), ts),
    )
    db.commit()
    token = make_session(user_id)
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return jsonify({"user": public_user(user), "token": token}), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE lower(username) = lower(?)", (username,)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    token = make_session(user["id"])
    return jsonify({"user": public_user(user), "token": token})


@app.get("/api/me")
def me():
    user, error = require_user()
    if error:
        return error
    return jsonify({"user": public_user(user)})


@app.post("/api/logout")
def logout():
    auth = request.headers.get("Authorization", "")
    match = re.match(r"Bearer\s+(.+)", auth, re.I)
    if match:
        db = get_db()
        db.execute("DELETE FROM sessions WHERE token = ?", (match.group(1),))
        db.commit()
    return jsonify({"ok": True})


@app.get("/api/leaderboards/config")
def leaderboard_config():
    return jsonify({"games": LEADERBOARD_CONFIGS})


@app.get("/api/leaderboards/<game_id>")
def leaderboard(game_id):
    config = LEADERBOARD_CONFIGS.get(game_id)
    if not config:
        return jsonify({"error": "Unknown game"}), 404
    limit = max(1, min(100, int(request.args.get("limit", 10))))
    db = get_db()

    if config["strategy"] == "match_record":
        rows = [
            row_to_dict(row)
            for row in db.execute("SELECT * FROM match_records WHERE game_id = ?", (game_id,)).fetchall()
        ]
        for row in rows:
            row["win_rate"] = round((row["wins"] / row["games_played"]) if row["games_played"] else 0, 4)
    else:
        rows = [
            row_to_dict(row)
            for row in db.execute("SELECT * FROM leaderboard_scores WHERE game_id = ?", (game_id,)).fetchall()
        ]

    rows.sort(key=lambda item: LeaderboardSorter(item, config["sort"]))
    return jsonify({"game": config, "rows": rows[:limit]})


class LeaderboardSorter:
    def __init__(self, row, sort_rules):
        self.row = row
        self.sort_rules = sort_rules

    def __lt__(self, other):
        return compare_entries(self.row, other.row, self.sort_rules) < 0


@app.post("/api/leaderboards/<game_id>/submit")
def submit_score(game_id):
    config = LEADERBOARD_CONFIGS.get(game_id)
    if not config:
        return jsonify({"error": "Unknown game"}), 404
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    db = get_db()
    ts = now_ts()

    if config["strategy"] == "match_record":
        result = str(data.get("result", "")).lower()
        if result not in {"win", "loss", "draw"}:
            return jsonify({"error": "result must be win, loss, or draw"}), 400

        record = db.execute(
            "SELECT * FROM match_records WHERE game_id = ? AND user_id = ?",
            (game_id, user["id"]),
        ).fetchone()
        if record is None:
            db.execute(
                """
                INSERT INTO match_records
                (id, game_id, user_id, username, wins, losses, draws, games_played, created_at, updated_at)
                VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
                """,
                ("match_" + secrets.token_hex(12), game_id, user["id"], user["username"], ts, ts),
            )

        column = {"win": "wins", "loss": "losses", "draw": "draws"}[result]
        db.execute(
            f"""
            UPDATE match_records
            SET {column} = {column} + 1,
                games_played = games_played + 1,
                username = ?,
                updated_at = ?
            WHERE game_id = ? AND user_id = ?
            """,
            (user["username"], ts, game_id, user["id"]),
        )
        db.commit()
        record = db.execute(
            "SELECT * FROM match_records WHERE game_id = ? AND user_id = ?",
            (game_id, user["id"]),
        ).fetchone()
        return jsonify({"record": row_to_dict(record)})

    incoming = {
        "score": to_number(data.get("score")),
        "moves": to_number(data.get("moves")),
        "elapsed_ms": to_number(data.get("elapsed_ms")),
        "lines": to_number(data.get("lines")),
        "level": to_number(data.get("level")),
    }
    current_row = db.execute(
        "SELECT * FROM leaderboard_scores WHERE game_id = ? AND user_id = ?",
        (game_id, user["id"]),
    ).fetchone()
    current = row_to_dict(current_row)
    accepted = should_replace(current, incoming, config["sort"])

    if accepted:
        if current:
            db.execute(
                """
                UPDATE leaderboard_scores
                SET username = ?, score = ?, moves = ?, elapsed_ms = ?, lines = ?, level = ?, mode = ?, updated_at = ?
                WHERE game_id = ? AND user_id = ?
                """,
                (
                    user["username"],
                    incoming["score"],
                    incoming["moves"],
                    incoming["elapsed_ms"],
                    incoming["lines"],
                    incoming["level"],
                    str(data.get("mode", ""))[:40],
                    ts,
                    game_id,
                    user["id"],
                ),
            )
        else:
            db.execute(
                """
                INSERT INTO leaderboard_scores
                (id, game_id, user_id, username, score, moves, elapsed_ms, lines, level, mode, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "score_" + secrets.token_hex(12),
                    game_id,
                    user["id"],
                    user["username"],
                    incoming["score"],
                    incoming["moves"],
                    incoming["elapsed_ms"],
                    incoming["lines"],
                    incoming["level"],
                    str(data.get("mode", ""))[:40],
                    ts,
                    ts,
                ),
            )
        db.commit()

    entry = db.execute(
        "SELECT * FROM leaderboard_scores WHERE game_id = ? AND user_id = ?",
        (game_id, user["id"]),
    ).fetchone()
    return jsonify({"accepted": accepted, "entry": row_to_dict(entry)})


@app.get("/")
def health():
    return jsonify({"ok": True, "service": "game auth and leaderboards"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
