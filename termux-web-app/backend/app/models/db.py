import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

async def get_connection():
    return await aiosqlite.connect(DB_PATH)

async def init_db():
    async with get_connection() as db:
        await db.execute("""CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        )""")
        await db.commit()

async def add_item(name: str, description: str = "") -> dict:
    async with get_connection() as db:
        async with db.execute(
            "INSERT INTO items (name, description) VALUES (?, ?)", (name, description)
        ):
            db.commit()
            item_id = db.total_changes()
            return {"id": item_id, "name": name, "description": description}

async def get_items() -> list[dict]:
    async with get_connection() as db:
        async with db.execute("SELECT id, name, description FROM items") as cur:
            rows = await cur.fetchall()
            return [{"id": r[0], "name": r[1], "description": r[2]} for r in rows]

async def get_item(item_id: int) -> dict | None:
    async with get_connection() as db:
        async with db.execute(
            "SELECT id, name, description FROM items WHERE id = ?", (item_id,)
        ):
            row = await db.fetchone()
            if row:
                return {"id": row[0], "name": row[1], "description": row[2]}
            return None

async def update_item(item_id: int, name: str, description: str = "") -> bool:
    async with get_connection() as db:
        cur = await db.execute(
            "UPDATE items SET name = ?, description = ? WHERE id = ?", (name, description, item_id)
        )
        await db.commit()
        return cur.rowcount > 0

async def delete_item(item_id: int) -> bool:
    async with get_connection() as db:
        cur = await db.execute("DELETE FROM items WHERE id = ?", (item_id,))
        await db.commit()
        return cur.rowcount > 0