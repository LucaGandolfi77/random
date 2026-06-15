"""Minimal UI board implementation for eco_simulator.

The original project expects a fairly complex board that draws a grid of
cells and reacts to mouse clicks.  For the purpose of simply running the
application we provide a lightweight stub that satisfies the interface
used in ``main.py``:

* ``__init__(self, screen, ecosystem)`` – stores the arguments.
* ``draw(self)`` – fills the screen with a background colour.
* ``handle_event(self, event)`` – a no‑op placeholder.

This is sufficient for the program to start and for developers to replace
the stub with a full implementation later.
"""

from __future__ import annotations

import pygame


class IslandBoard:
    """Simple placeholder for the island board UI component.

    Parameters
    ----------
    screen: pygame.Surface
        The surface on which the board should draw.
    ecosystem: Any
        The simulation model – stored but not used by the stub.
    """

    def __init__(self, screen: pygame.Surface, ecosystem):
        self.screen = screen
        self.ecosystem = ecosystem
        # Choose a neutral background colour.
        self.bg_color = (30, 30, 30)
        self.grid_color = (100, 100, 100)
        self.CELL_SIZE = 80
        self.GRID_SIZE = 10

    def draw(self) -> None:
        """Draw the board background with a visible grid and species indicators.

        The real implementation would render a grid of islands; the stub
        fills the screen with a solid colour, draws a visible grid, and
        displays colored circles representing each species population.
        """
        self.screen.fill(self.bg_color)
        # Draw a visible grid
        for i in range(self.GRID_SIZE + 1):
            pygame.draw.line(
                self.screen,
                self.grid_color,
                (0, i * self.CELL_SIZE),
                (self.GRID_SIZE * self.CELL_SIZE, i * self.CELL_SIZE),
                2
            )
            pygame.draw.line(
                self.screen,
                self.grid_color,
                (i * self.CELL_SIZE, 0),
                (i * self.CELL_SIZE, self.GRID_SIZE * self.CELL_SIZE),
                2
            )

        # Draw species population indicators
        if hasattr(self.ecosystem, 'species_list'):
            colors = [(0, 255, 0), (255, 0, 0)]  # Green for herbivore, red for carnivore
            for idx, sp in enumerate(self.ecosystem.species_list):
                # Draw a colored circle for each species
                center_x = 50 + idx * 100
                center_y = 50
                radius = 20 + sp.population  # Size based on population
                color = colors[idx % len(colors)]
                pygame.draw.circle(self.screen, color, (center_x, center_y), radius)
                # Draw species name
                font = pygame.font.SysFont(None, 20)
                text = font.render(f"{sp.name}: {sp.population}", True, (255, 255, 255))
                self.screen.blit(text, (center_x - 30, center_y + 30))

    def handle_event(self, event: pygame.event.Event) -> None:
        """Process a pygame event.

        The stub does nothing – it merely exists so that ``main.py`` can
        forward events without raising ``AttributeError``.
        """
        # No interaction required for the placeholder.
        return None
