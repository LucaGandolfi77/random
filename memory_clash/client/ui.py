# /workspaces/random/memory_clash/client/ui.py
# UI components for the client side of "Multiplayer Memory Clash".

import pygame
from .network import SocketIOClient

# ----------------------------------------------------------------------
# Lobby UI
# ----------------------------------------------------------------------
class LobbyUI:
    """Simple lobby where the player enters a nickname and joins a match."""

    def __init__(self, screen):
        self.screen = screen
        self.font = pygame.font.SysFont("arial", 24)
        self.small_font = pygame.font.SysFont("arial", 18)
        self.nickname = ""
        self.join_enabled = False

    # ------------------------------------------------------------------
    # Event handling
    # ------------------------------------------------------------------
    def handle_event(self, event):
        """Process pygame events for nickname input and button clicks."""
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_RETURN:
                # Accept nickname when Enter is pressed
                self.join_enabled = True
            elif event.key == pygame.K_BACKSPACE:
                self.nickname = self.nickname[:-1]
            else:
                # Append printable characters
                if len(self.nickname) < 20:  # limit length
                    self.nickname += event.unicode

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            mx, my = event.pos
            # Simple button: check if Join button rect contains click
            btn_rect = pygame.Rect(WINDOW_WIDTH // 2 - 60, WINDOW_HEIGHT // 2 + 40, 120, 40)
            if btn_rect.collidepoint(mx, my):
                if self.nickname:
                    # Emit a socket event to request joining the matchmaking queue
                    SocketIOClient.sio.emit('join_queue', {'nickname': self.nickname})
                    self.join_enabled = False
                    # Switch to game screen after a short delay (simulate waiting)
                    pygame.time.set_timer(pygame.USEREVENT + 1, 500)

    # ------------------------------------------------------------------
    # Drawing
    # ------------------------------------------------------------------
    def draw(self):
        """Render the lobby background and UI elements."""
        self.screen.fill((30, 30, 30))
        title = self.font.render("Multiplayer Memory Clash", True, (255, 255, 255))
        self.screen.blit(title, (WINDOW_WIDTH // 2 - title.get_width() // 2, 100))

        # Nickname input box
        nickname_surf = self.small_font.render(f"Nickname: {self.nickname}", True, (200, 200, 200))
        self.screen.blit(nickname_surf, (WINDOW_WIDTH // 2 - nickname_surf.get_width() // 2, 200))

        # Join button
        btn_color = (70, 130, 180) if self.join_enabled else (50, 50, 50)
        pygame.draw.rect(self.screen, btn_color, (WINDOW_WIDTH // 2 - 60, WINDOW_HEIGHT // 2 + 40, 120, 40))
        join_text = self.small_font.render("JOIN MATCH", True, (255, 255, 255))
        self.screen.blit(join_text, (WINDOW_WIDTH // 2 - 10, WINDOW_HEIGHT // 2 + 45))

    # ------------------------------------------------------------------
    # Helper for drawing the nickname input field
    # ------------------------------------------------------------------
    def draw_nickname_input(self):
        """Draw a simple input field rectangle (placeholder)."""
        input_rect = pygame.Rect(WINDOW_WIDTH // 2 - 150, 150, 300, 40)
        pygame.draw.rect(self.screen, (50, 50, 50), input_rect)
        # (No text rendering needed here – handled in handle_event)


# ----------------------------------------------------------------------
# Game Board UI
# ----------------------------------------------------------------------
class GameBoardUI:
    """Handles the in‑game board, timer, scores, and card interactions."""

    def __init__(self, screen):
        self.screen = screen
        self.font = pygame.font.SysFont("arial", 20)
        self.large_font = pygame.font.SysFont("arial", 28)

        # Game state (placeholder – will be overwritten by server messages)
        self.grid_size = 4  # default 4x4
        self.cards = []     # list of dicts: {'id': int, 'flipped': bool, 'matched': bool, 'image': str}
        self.flip_timer = 0
        self.round_timer = 60  # seconds
        self.scores = {'player1': 0, 'player2': 0}
        self.running = False

        # Load placeholder card back image (replace with real assets later)
        self.card_back = pygame.Surface((80, 80))
        self.card_back.fill((120, 120, 120))

        # Card front images placeholder (will be set by server)
        self.card_images = {}

    # ------------------------------------------------------------------
    # Event handling
    # ------------------------------------------------------------------
    def handle_event(self, event):
        """Process mouse clicks to flip cards or trigger UI actions."""
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and self.running:
            mx, my = event.pos
            # Convert screen coordinates to grid coordinates
            col = mx // 80
            row = my // 80
            idx = row * self.grid_size + col

            if 0 <= row < self.grid_size and 0 <= col < self.grid_size:
                # Flip the selected card if it hasn't been flipped already
                if not self.cards[idx]['flipped'] and not self.cards[idx]['matched']:
                    self.cards[idx]['flipped'] = True
                    SocketIOClient.sio.emit('flip_card', {'index': idx})
                    # Check if this is the first flip of the pair
                    # (the server will handle matching logic and broadcast updates)

    # ------------------------------------------------------------------
    # Drawing helpers
    # ------------------------------------------------------------------
    def _draw_card(self, card, x, y):
        """Render a single card at position (x, y)."""
        if card['flipped'] or card['matched']:
            img_key = card['id']
            if img_key in self.card_images:
                img = self.card_images[img_key]
                self.screen.blit(img, (x, y))
            else:
                # Fallback: draw a simple colored rectangle with the id
                color = (100, 200, 100) if card['matched'] else (200, 100, 100)
                pygame.draw.rect(self.screen, color, (x, y, 80, 80))
                txt = self.font.render(str(img_key), True, (255, 255, 255))
                self.screen.blit(txt, (x + 20, y + 20))
        else:
            self.screen.blit(self.card_back, (x, y))

    # ------------------------------------------------------------------
    # Main draw routine
    # ------------------------------------------------------------------
    def draw(self):
        """Render the entire game board, timer, and scores."""
        self.screen.fill((0, 100, 0))  # green background

        # Draw card grid
        for row in range(self.grid_size):
            for col in range(self.grid_size):
                idx = row * self.grid_size + col
                x = col * 80
                y = row * 80
                self._draw_card(self.cards[idx], x, y)

        # Draw timer (remaining seconds)
        timer_surf = self.large_font.render(
            f"Time: {max(0, int(self.round_timer))}", True, (255, 255, 0)
        )
        self.screen.blit(timer_surf, (10, 10))

        # Draw scores
        score_surf = self.large_font.render(
            f"Score – P1: {self.scores['player1']} | P2: {self.scores['player2']}",
            True,
            (255, 255, 255),
        )
        self.screen.blit(score_surf, (10, 40))

    # ------------------------------------------------------------------
    # Additional UI draws (called each frame)
    # ------------------------------------------------------------------
    def draw_timer(self):
        """Separate timer drawing (used if you want to animate separately)."""
        # Currently a placeholder – main draw handles timer text.
        pass

    def draw_scores(self):
        """Separate scores drawing (placeholder)."""
        pass