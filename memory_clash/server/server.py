# /workspaces/random/memory_clash/server/server.py
# Main entry point for the aiohttp + python‑socketio server.
# Starts the WebSocket server, handles matchmaking, and broadcasts game state.

import asyncio
import json
import uuid
from typing import Dict, List, Optional

import aiohttp
import socketio

from .matchmaking import MatchmakingQueue
from .game_manager import GameManager

# ----------------------------------------------------------------------
# Global server state
# ----------------------------------------------------------------------
sio = socketio.AsyncServer(async_mode='aiohttp')
app = aiohttp.web.Application()
sio.attach(app)

# ----------------------------------------------------------------------
# Helper to broadcast to a room
# ----------------------------------------------------------------------
async def broadcast_to_room(room: str, message: dict):
    """Send a JSON message to all sockets in the given room."""
    await sio.emit(message, room=room)


# ----------------------------------------------------------------------
# Socket.IO event handlers
# ----------------------------------------------------------------------
@sio.event
async def connect(sid, environ):
    """Assign a unique session ID and add the client to the 'lobby' room."""
    print(f"[Socket] Client connected: {sid}")
    await sio.emit('welcome', {'msg': 'connected'}, room=sid)


@sio.event
async def disconnect(sid):
    """Remove client from any room and clean up matchmaking state."""
    print(f"[Socket] Client disconnected: {sid}")
    # Cleanup any pending matchmaking entry
    await MatchmakingQueue.remove_player(sid)


@sio.event
async def join_queue(sid, data):
    """
    Client asks to join the matchmaking queue.
    Payload: {"nickname": "PlayerName"}
    """
    nickname = data.get('nickname', 'Anonymous')
    # Enqueue the player; returns a room_id once paired
    await MatchmakingQueue.enqueue_player(sid, nickname)


@sio.event
async def ready_to_play(sid):
    """
    Signal from a client that it is ready to start a match.
    This is called after the client receives the 'welcome' event and
    has entered a nickname.
    """
    # Find the room the player is in (if any) and mark them ready
    room_id = await MatchmakingQueue.get_room_of_player(sid)
    if room_id:
        # Mark player ready in the room's state
        await GameManager.mark_player_ready(sid, room_id)


@sio.event
async def flip(sid, data):
    """
    Client reports a card flip.
    Payload: {"index": 3}
    """
    # Determine which room the player belongs to
    room_id = await MatchmakingQueue.get_room_of_player(sid)
    if not room_id:
        return  # not in an active game

    # Forward the flip to the GameManager
    await GameManager.handle_flip(sid, data['index'])