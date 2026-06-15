"""Eco‑Simulator entry point.

This file provides a minimal but functional game loop that integrates:

* **SimPy** for the simulation engine
* **pygame** for a simple graphical window (stub UI components are used)
* Configuration loading from ``eco_simulator/config/default_config.json``

The original file became corrupted after multiple patches, resulting in
missing imports, duplicated code and indentation errors.  The implementation
below restores a clean structure and adds lightweight logging so the user can
see why the program may exit automatically.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pygame
import simpy

from ecosystem import EcoSystem
from ui.board import IslandBoard
from ui.dashboard import LiveDashboard
from utils.save_load import load_state

# ----------------------------------------------------------------------
# Global constants
# ----------------------------------------------------------------------
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 800
FPS = 60


def load_config() -> dict:
    """Load the default configuration JSON.

    The configuration file lives in ``eco_simulator/config/default_config.json``.
    Using ``Path(__file__)`` ensures the path works regardless of the current
    working directory.
    """
    config_path = (
        Path(__file__).resolve().parent.parent / "config" / "default_config.json"
    )
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    # ------------------------------------------------------------------
    # Load configuration
    # ------------------------------------------------------------------
    print("[EcoSim] Loading configuration…")
    cfg = load_config()
    print("[EcoSim] Configuration loaded.")

    # ------------------------------------------------------------------
    # Parse CLI arguments for optional save/load
    # ------------------------------------------------------------------
    parser = argparse.ArgumentParser()
    parser.add_argument("--save", type=str, help="File path to save the game state")
    parser.add_argument("--load", type=str, help="File path to load a saved game state")
    args = parser.parse_args()

    # If a save file is requested, perform a quick save (no UI) and exit.
    if args.save:
        print(f"[EcoSim] Save requested to {args.save} – operation not implemented in stub.")
        return

    # ------------------------------------------------------------------
    # Initialise pygame
    # ------------------------------------------------------------------
    print("[EcoSim] Initialising pygame…")
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Eco‑Simulator: The Garden of Species")
    clock = pygame.time.Clock()

    # ------------------------------------------------------------------
    # Create simulation environment and ecosystem model
    # ------------------------------------------------------------------
    print("[EcoSim] Creating SimPy environment and ecosystem model…")
    env = simpy.Environment()
    ecosystem = EcoSystem(env, cfg)
    ecosystem.start_all()  # Start all SimPy processes so events are scheduled

    # If a load file was supplied, populate the ecosystem now.
    if args.load:
        load_state(args.load, ecosystem)

    # ------------------------------------------------------------------
    # Setup UI components (stub implementations)
    # ------------------------------------------------------------------
    board = IslandBoard(screen, ecosystem)
    dashboard = LiveDashboard(screen, ecosystem)

    # Initial draw so the window is not blank.
    board.draw()
    dashboard.draw()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    print("[EcoSim] Starting main loop…")
    running = True
    frame = 0
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            else:
                board.handle_event(event)
                dashboard.handle_event(event)

        # Update UI each frame
        dashboard.update_plot()
        board.draw()
        dashboard.draw()

        # Advance the simulation; exit gracefully when no events remain.
        try:
            env.step()
        except simpy.core.EmptySchedule:
            print(f"[EcoSim] No more scheduled events after frame {frame}. Exiting.")
            running = False

        pygame.display.flip()
        clock.tick(FPS)
        frame += 1
        if frame % 60 == 0:
            print(f"[EcoSim] Frame {frame} rendered.")

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()