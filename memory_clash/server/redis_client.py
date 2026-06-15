# /workspaces/random/memory_clash/server/redis_client.py
# Simple wrapper around aioredis for matchmaking queue and leaderboard.
# In a real deployment you would add reconnection logic and richer commands.

import aioredis
import json
from typing import Dict, Any

class RedisClient:
    """
    Minimal Redis client used for:
    - Storing matchmaking queue entries (optional persistence)
    - Keeping a leaderboard of player scores
    """

    def __init__(self, url: str = "redis://localhost:6379/0"):
        self.url = url
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        """Establish a connection to Redis."""
        self._redis = await aioredis.from_url(self.url, decode_responses=True)

    async def close(self):
        """Close the Redis connection."""
        if self._redis:
            await self._redis.close()

    # ------------------------------------------------------------------
    # Queue operations (optional – can also be handled in‑memory)
    # ------------------------------------------------------------------
    async def enqueue_for_matchmaking(self, player_id: str, nickname: str) -> str:
        """Add a player to a Redis set that represents the matchmaking queue."""
        if not self._redis:
            return player_id  # no‑op if not connected
        queue_key = "matchmaking_queue"
        # Store nickname with a timestamp for ordering
        entry = f"{player_id}|{nickname}|{int(asyncio.get_event_loop().time())}"
        await self._redis.sadd(queue_key, entry)
        return player_id

    async def get_queue_entries(self) -> List[Dict[str, Any]]:
        """Retrieve all entries in the matchmaking queue."""
        if not self._redis:
            return []
        queue_key = "matchmaking_queue"
        raw = await self._redis.smembers(queue_key)
        return [{"raw": r, "parts": r.split("|")} for r in raw]

    # ------------------------------------------------------------------
    # Leaderboard operations
    # ------------------------------------------------------------------
    async def update_score(self, player_id: str, score: int):
        """Increment a player's score in a sorted set called 'leaderboard'."""
        if not self._redis:
            return
        await self._redis.zincrby("leaderboard", score, player_id)

    async def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return the top `limit` players from the leaderboard."""
        if not self._redis:
            return []
        raw = await self._redis.zrevrange("leaderboard", 0, limit - 1, withscores=True)
        return [{"player_id": r[0], "score": int(r[1])} for r in raw]