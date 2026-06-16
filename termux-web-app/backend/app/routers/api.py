from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import List

from models.db import get_items as db_get_items, get_item as db_get_item, add_item as db_add_item
router = APIRouter()

# Sample in-memory store
items_db: List[dict] = []

# Pydantic model for Item
class Item(BaseModel):
    id: int
    name: str
    description: str = ""

# ---------- Basic CRUD endpoints ----------
@router.get("/items/", response_model=List[Item])
async def get_items():
    return await db_get_items()

@router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: int):
    item = await db_get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("/items/", response_model=Item)
async def create_item(item: Item):
    new_item = await db_add_item(item.name, item.description)
    return new_item

# ---------- WebSocket chat ----------
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        pass

# ---------- Health check ----------
@router.get("/ping")
async def ping() -> dict:
    return {"msg": "pong"}