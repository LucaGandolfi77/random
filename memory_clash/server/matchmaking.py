# /workspaces/random/memory_clash/server/matchmaking.py
# Matchmaking queue and room management for the Memory Clash server.

import uuid
from typing import Dict, List, Optional

# In‑memory store (replace with Redis calls in production)
_waiting_players: Dict[str, Dict] = {}   # sid -> {'nickname': str, 'enqueued_at': float}
_rooms: Dict[str, Dict] = {}            # room_id -> {'players': [sid, sid], 'state': str, 'grid': List, 'flips': List}


async def enqueue_player(sid: str, nickname: str) -> str:
    """
    Add a player to the matchmaking queue.
    Returns a unique player identifier.
    If a second player is found, a new room is created and both are moved out of the queue.
    """
    player_entry = {
        "nickname": nickname,
        "enqueued_at": asyncio.get_event_loop().time(),
    }
    _waiting_players[sid] = player_entry
    print(f"[Matchmaking] Enqueued player {sid} ({nickname})")

    # If another player is already waiting, pair them
    if len(_waiting_players) >= 2:
        # Grab the first waiting player (oldest)
        first_sid = next(iter(_waiting_players))
        first_entry = _waiting_players[first_sid]

        # Create a new room
        room_id = str(uuid.uuid4())
        _rooms[room_id] = {
            "players": [first_sid, sid],
            "state": "active",          # game in progress
            "grid": [],                 # will be filled when round starts
            "flips": [],                # list of flip events
            "room_id": room_id,
        }
        print(f"[Matchmaking] Created room {room_id} with players {first_sid} and {sid}")

        # Remove both from waiting dict
        del _waiting_players[first_sid]
        del _waiting_players[sid]

        # Store room mapping for each player
        _rooms[room_id]["players"][0] = first_sid
        _rooms[room_id]["players"][1] = sid
        _rooms[room_id]["player_names"] = [first_entry["nickname"], nickname]

        # Return a player identifier (e.g., the room id) – client can use it for later messages
        return room_id
    else:
        # Still waiting for a partner
        return sid


async def remove_player(sid: str):
    """Remove a disconnected player from the queue or room."""
    if sid in _waiting_players:
        del _waiting_players[sid]
        print(f"[Matchmaking] Removed player {sid} from queue")
    else:
        # Find and remove from any active room
        for room_id, room in _rooms.items():
            if sid in room["players"]:
                # If only one player left, just drop the room
                if len(room["players"]) == 1:
                    del _rooms[room_id]
                    print(f"[Matchmaking] Dropped incomplete room {room_id}")
                else:
                    # Remove from the list but keep room alive
                    room["players"].remove(sid)
                    print(f"[Matchmaking] Player {sid} left room {room_id}")
                break


async def get_room_of_player(sid: str) -> Optional[str]:
    """Return the room_id the player belongs to, or None if not in a game."""
    for room_id, room in _rooms.items():
        if sid in room["players"]:
            return room_id
    return None


async def get_room_state(room_id: str) -> Dict:
    """Return the current state of a room (used for debugging)."""
    return _rooms.get(room_id, {})


async def get_all_rooms() -> Dict[str, Dict]:
    """Expose all rooms (useful for admin tools)."""
    return _rooms.copy()