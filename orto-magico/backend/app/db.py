import aiosqlite
import os
import contextlib
from . import catalog

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "orto.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    coins INTEGER DEFAULT 500,
    gems INTEGER DEFAULT 5,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    selected_seed TEXT,
    is_test INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    idx INTEGER,
    seed TEXT,
    planted_at REAL,
    grown_seconds REAL DEFAULT 0,
    last_tick REAL,
    water INTEGER DEFAULT 100,
    fertilized INTEGER DEFAULT 0,
    UNIQUE(user_id, idx)
);
CREATE TABLE IF NOT EXISTS inventory (
    user_id INTEGER,
    seed TEXT,
    qty INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, seed)
);
CREATE TABLE IF NOT EXISTS achievements (
    user_id INTEGER,
    ach_id TEXT,
    progress INTEGER DEFAULT 0,
    claimed INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, ach_id)
);
CREATE TABLE IF NOT EXISTS collection_log (
    user_id INTEGER,
    seed TEXT,
    count INTEGER DEFAULT 0,
    first_at REAL,
    PRIMARY KEY (user_id, seed)
);
"""

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()
        await ensure_test_user(db)

async def ensure_test_user(db):
    cur = await db.execute("SELECT id FROM users WHERE username='giardiniere'")
    row = await cur.fetchone()
    if not row:
        await db.execute(
            "INSERT INTO users(username, coins, gems, level, xp, is_test) VALUES('giardiniere', 500, 999999, 1, 0, 1)"
        )
        uid = (await (await db.execute("SELECT last_insert_rowid()")).fetchone())[0]
        for i in range(catalog.INITIAL_PLOTS):
            await db.execute(
                "INSERT INTO plots(user_id, idx, seed, water) VALUES(?,?,NULL,100)",
                (uid, i),
            )
        for k, qty in catalog.STARTER_SEEDS.items():
            await db.execute(
                "INSERT INTO inventory(user_id, seed, qty) VALUES(?,?,?)",
                (uid, k, qty),
            )
        await db.commit()

@contextlib.asynccontextmanager
async def get_conn():
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        yield conn