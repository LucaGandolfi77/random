# /workspaces/random/memory_clash/client/network.py
# Socket.IO client wrapper for the Multiplayer Memory Clash game.

import json
from socketio import Client as SocketIOClient

class SocketIOClient:
    """
    Thin wrapper around python‑socketio to handle game events.
    All incoming messages are dispatched to the calling code via
    `handle_socket_message(data)`.
    """

    def __init__(self, sio: SocketIOClient):
        self.sio = sio
        # Bind event handlers
        self.sio.on('connect', self._on_connect)
        self.sio.on('disconnect', self._on_disconnect)
        self.sio.on('start_round', self._on_start_round)
        self.sio.on('flip_result', self._on_flip_result)
        self.sio.on('game_over', self._on_game_over)
        self.sio.on('update_scores', self._on_update_scores)

    # ------------------------------------------------------------------
    # Internal event handlers
    # ------------------------------------------------------------------
    def _on_connect(self):
        print("[Socket] Connected to server")

    def _on_disconnect(self):
        print("[Socket] Disconnected from server")

    def _on_start_round(self, data):
        """
        Expected payload:
        {
            "grid_size": 4,
            "cards": [{ "id": 0, "image_key": "img0" }, ...],
            "round_timer": 60
        }
        """
        # Store grid configuration locally
        self.grid_size = data.get("grid_size", 4)
        # Build a dictionary of card images (currently just IDs)
        self.cards = data.get("cards", [])
        # Notify the GameBoardUI to prepare the board
        # (In a full implementation this would forward the data to the UI)

    _flip_queue = []  # temporary storage for pending flips

    def _on_flip_result(self, data):
        """
        Expected payload:
        {
            "indices": [0, 3],
            "match": true|false,
            "new_transform": [...]   # optional transformation list
        }
        """
        # Forward the result to the GameBoardUI for animation
        # (Implementation would call a method on the UI to flip the shown cards)

    def _on_game_over(self, data):
        """
        Expected payload:
        {
            "winner": "player1"|"player2"|null,
            "scores": {"player1": 12, "player2": 8}
        }
        """
        # Broadcast final scores to all clients; UI can show a game‑over screen
        pass

    def _on_update_scores(self, data):
        """
        Expected payload:
        {
            "player1": 15,
            "player2": 10
        }
        """
        # Update the score display in the UI

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------
    def connect(self, host: str = "localhost", port: int = 8080):
        """Open the WebSocket connection."""
        self.sio.connect(host, port)

    def disconnect(self):
        """Close the WebSocket connection."""
        self.sio.disconnect()

    def request_start_round(self):
        """Ask the server to begin a new round (called after matchmaking)."""
        self.sio.emit('ready_to_play')

    def submit_flip(self, index: int):
        """Send a flip request for the given card index."""
        self.sio.emit('flip', {'index': index})