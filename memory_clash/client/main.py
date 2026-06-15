# /workspaces/random/memory_clash/client/main.py
# Entry point for the Pygame client of "Multiplayer Memory Clash".

import pygame
import sys
import json
from socketio import socketio

# Import local modules
from .ui import LobbyUI, GameBoardUI
from .network import SocketIOClient

# ----------------------------------------------------------------------
# Configuration constants (could be moved to a separate config.py)
# ----------------------------------------------------------------------
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 900
FPS = 60

# ----------------------------------------------------------------------
# Initialize pygame
# ----------------------------------------------------------------------
pygame.init()
screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption("Multiplayer Memory Clash")
clock = pygame.time.Clock()

# ----------------------------------------------------------------------
# Socket.IO client setup
# ----------------------------------------------------------------------
sio = socketio.Client()
client = SocketIOClient(sio)

# ----------------------------------------------------------------------
# Game state variables
# ----------------------------------------------------------------------
current_screen = "lobby"          # Could be "lobby" or "game"
lobby_ui = LobbyUI(screen)
game_ui = GameBoardUI(screen)

def quit_game():
    """Gracefully shut down pygame and exit."""
    pygame.quit()
    sys.exit()

# ----------------------------------------------------------------------
# Main loop
# ----------------------------------------------------------------------
while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            quit_game()

        # Forward events to the active UI
        if current_screen == "lobby":
            lobby_ui.handle_event(event)
        elif current_screen == "game":
            game_ui.handle_event(event)

        # Handle socket events (client side)
        if event.type == pygame.USEREVENT + 1:
            # Custom event used to pass socket messages to the client
            data = event.dict.get("data")
            if data:
                client.handle_socket_message(data)

    # ------------------------------------------------------------------
    # Rendering based on current screen
    # ------------------------------------------------------------------
    if current_screen == "lobby":
        lobby_ui.draw()
        lobby_ui.draw_nickname_input()
        lobby_ui.draw_join_button()
    elif current_screen == "game":
        game_ui.draw()
        game_ui.draw_timer()
        game_ui.draw_scores()

    # ------------------------------------------------------------------
    # Update display
    # ------------------------------------------------------------------
    pygame.display.flip()
    clock.tick(FPS)