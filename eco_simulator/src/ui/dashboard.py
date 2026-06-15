"""Minimal dashboard UI component for eco_simulator.

The real dashboard would display plots and statistics about the ecosystem.
For the current goal we only need a class with ``draw`` and ``update_plot``
methods so that ``main.py`` can call them without errors.
"""

from __future__ import annotations

import pygame


class LiveDashboard:
    """Placeholder dashboard that draws a simple overlay.

    Parameters
    ----------
    screen: pygame.Surface
        The surface used for drawing – the same surface as the board.
    ecosystem: Any
        The simulation model – stored for potential future use.
    """

    def __init__(self, screen: pygame.Surface, ecosystem):
        self.screen = screen
        self.ecosystem = ecosystem
        # Simple colour for the overlay text background.
        self.bg_color = (0, 0, 0, 120)  # semi‑transparent black
        self.font = pygame.font.SysFont(None, 24)

    def draw(self) -> None:
        """Draw a minimal overlay.

        The stub draws a small rectangle in the top‑left corner with the
        text ``"Dashboard"``.  This provides visual feedback that the UI
        component is active.
        """
        # Render text.
        text_surf = self.font.render("Dashboard", True, (255, 255, 255))
        # Create a semi‑transparent background surface.
        bg_surf = pygame.Surface((text_surf.get_width() + 10, text_surf.get_height() + 10), pygame.SRCALPHA)
        bg_surf.fill(self.bg_color)
        # Blit background and text.
        self.screen.blit(bg_surf, (5, 5))
        self.screen.blit(text_surf, (10, 10))

    def update_plot(self) -> None:
        """Placeholder for updating any live plots.

        The real implementation would refresh Matplotlib figures.  The stub
        simply passes – the method exists so ``main.py`` can call it each
        frame without error.
        """
        return None

    # ------------------------------------------------------------------
    # Event handling
    # ------------------------------------------------------------------
    def handle_event(self, event: pygame.event.Event) -> None:
        """Placeholder for handling pygame events.

        The full dashboard would react to mouse clicks or key presses to
        update displayed statistics.  For now we simply ignore the event so
        that ``main.py`` can forward all events without raising an
        ``AttributeError``.
        """
        # No interactive behaviour required for the stub implementation.
        return None
