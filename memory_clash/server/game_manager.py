# /workspaces/random/memory_clash/server/game_manager.py
# Central manager for game state per room.
# Handles round start, card flips, match detection, scoring, and transformations.

import random
import asyncio
import json
from typing import Dict, List, Any
from .utils import generate_initial_layout, CardTransformer

# ----------------------------------------------------------------------
# Simple data container for a room's state
# ----------------------------------------------------------------------
class RoomState:
    """
    Holds all mutable state for a matched pair of players.
    """
    def __init__(self, room_id: str, player1_sid: str, player1_name: str,
                 player2_sid: str, player2_name: str):
        self.room_id = room_id
        self.players = {
            player1_sid: {"name": player1_name, "ready": False},
            player2_sid: {"name": player2_name, "ready": False},
        }
        self.grid: List[Dict[str, Any]] = []
        self.flip_queue: List[int] = []          # indices flipped this turn
        self.scores: Dict[str, int] = {player1_name: 0, player2_name: 0}
        self.round_timer: float = 60.0           # seconds
        self.game_active: bool = False
        self.grid_size: int = 4                  # default grid size

    # ------------------------------------------------------------------
    # Player readiness
    # ------------------------------------------------------------------
    def player_ready(self, sid: str):
        """Mark a player as ready; start the round when both are ready."""
        if sid in self.players:
            self.players[sid]["ready"] = True
            if all(info["ready"] for info in self.players.values()):
                # Both players are ready – launch the round
                asyncio.create_task(self._start_round())

    # ------------------------------------------------------------------
    # Round start
    # ------------------------------------------------------------------
    async def _start_round(self):
        """Generate board, broadcast start, and mark round as active."""
        self.grid = generate_initial_layout(self.grid_size)
        self.flip_queue = []
        self.game_active = True
        # Store layout for later broadcast
        self.current_layout = self.grid
        # Broadcast to both players
        await broadcast_to_room(self.room_id, {
            "type": "start_round",
            "grid_size": self.grid_size,
            "cards": self.grid,
            "round_timer": self.round_timer
        })

    # ------------------------------------------------------------------
    # Flip handling
    # ------------------------------------------------------------------
    def record_flip(self, sid: str, index: int) -> bool:
        """
        Record a card flip. Returns True if a match was found.
        """
        if not self.game_active:
            return False

        # Add the flipped index to the queue
        self.flip_queue.append(index)

        # When two flips have been made, evaluate
        if len(self.flip_queue) == 2:
            i, j = self.flip_queue
            card_i = self.grid[i]
            card_j = self.grid[j]

            # Check for a match (same id)
            if card_i["id"] == card_j["id"]:
                # Match! Mark both as matched and increase the current player's score
                card_i["matched"] = True
                card_j["matched"] = True
                # Increase score of the player who initiated the flip (sid)
                self.scores[self.players[sid]["name"]] += 1
                # Notify server to broadcast match result
                return True
            else:
                # No match – simply clear the queue; cards will flip back after a delay
                self.flip_queue.clear()
                return False

        return False  # not enough flips yet

    # ------------------------------------------------------------------
    # Scoring & game end
    # ------------------------------------------------------------------
    def get_scores(self) -> Dict[str, int]:
        return self.scores.copy()

    def is_game_over(self) -> bool:
        """Game ends when every card is matched."""
        return all(card["matched"] for card in self.grid)

    def apply_transformation(self):
        """Apply a deterministic random transformation to remaining cards."""
        # Deterministic seed per room to ensure all clients see the same result
        random.seed(self.room_id)
        self.grid = CardTransformer.apply_random_transform(self.grid, self.grid_size)
        return self.grid


# ----------------------------------------------------------------------
# Global GameManager singleton
# ----------------------------------------------------------------------
game_manager = GameManager()# /workspaces/random/memory_clash/server/game_manager.py
# Central manager for game state per room.
# Handles round start, card flips, match detection, scoring, and transformations.

import random
import asyncio
from typing import Dict, List, Any
from .utils import CardTransformer

# ----------------------------------------------------------------------
# Simple data container for a room's state
# ----------------------------------------------------------------------
class RoomState:
    def __init__(self, room_id: str, player1_sid: str, player2_sid: str,
                 player1_name: str, player2_name: str):
        self.room_id = room_id
        self.players = {
            player1_sid: {"name": player1_name, "ready": False},
            player2_sid: {"name": player2_name, "ready": False},
        }
        self.grid: List[Dict[str, Any]] = []
        self.flip_queue: List[int] = []          # stores indices flipped this turn
        self.scores: Dict[str, int] = {player1_name: 0, player2_name: 0}
        self.round_timer: float = 60.0           # seconds
        self.game_active: bool = False

    async def start_round(self):
        """Generate a new board, set timer, and mark round as active."""
        self.grid = generate_initial_layout(self.grid_size if hasattr(self, "grid_size") else 4)
        self.flip_queue = []
        self.game_active = True
        # Store the layout for later broadcast
        self.current_layout = self.grid
        return self.grid

    def is_full(self) -> bool:
        """Return True if both players are present and ready."""
        return all(info["ready"] for info in self.players.values())

    def player_ready(self, sid: str):
        """Mark a player as ready; if both are ready, start the round."""
        if sid in self.players:
            self.players[sid]["ready"] = True
            if self.is_full():
                # Both ready – start the round
                asyncio.create_task(self._run_round())

    async def _run_round(self):
        """Internal coroutine that runs the round logic."""
        await asyncio.sleep(0.1)  # tiny delay to ensure async context
        await self.start_round()
        # The actual broadcasting of 'start_round' is done in the server
        # after this method completes.

    def record_flip(self, sid: str, index: int):
        """Record a flip, check for a match, and handle outcome."""
        if not self.game_active:
            return False  # ignore flips if round not active

        # Append to flip queue
        self.flip_queue.append(index)

        # When two flips have been made, evaluate
        if len(self.flip_queue) == 2:
            i, j = self.flip_queue
            card_i = self.grid[i]
            card_j = self.grid[j]

            # Check if they match (same id)
            if card_i["id"] == card_j["id"]:
                # Match found – mark as matched and increase score
                card_i["matched"] = True
                card_j["matched"] = True
                self.scores[self.players[sid]["name"]] += 1  # type: ignore
                # Notify server to broadcast match result
                return True  # indicate a match
            else:
                # No match – flip back after a short delay
                # For simplicity we just clear the queue; real game would
                # animate a flip‑back before resetting.
                await asyncio.sleep(1.0)
                self.flip_queue.clear()
                return False

        return False  # not enough flips yet

    def apply_transformation(self):
        """Apply a deterministic random transformation to remaining cards."""
        # Use a fixed seed for reproducibility across clients
        random.seed(self.room_id)  # deterministic per room
        self.grid = CardTransformer.apply_random_transform(self.grid, self.grid_size)
        return self.grid

    def is_game_over(self) -> bool:
        """Check if all cards are matched (i.e., game finished)."""
        return all(card["matched"] for card in self.grid)

    def get_scores(self) -> Dict[str, int]:
        return self.scores.copy()


# ----------------------------------------------------------------------
# Global manager instance (singleton for the process)
# ----------------------------------------------------------------------
game_manager = GameManager()