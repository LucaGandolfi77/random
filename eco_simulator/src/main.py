# /workspaces/random/eco_simulator/src/main.py
# Entry point: initializes SimPy environment, Pygame UI, and starts the game loop.
import pygame
import sys
import json
import random
from pathlib import Path

import simpy
import matplotlib.pyplot as plt
import matplotlib.animation as animation

from ecosystem import EcoSystem
from ui.board import IslandBoard
from ui.dashboard import LiveDashboard
from utils.mutation import generate_mutation

# ----------------------------------------------------------------------
# Global constants
# ----------------------------------------------------------------------
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 800
FPS = 60
ISLAND_GRID_SIZE = 10  # number of cells per side
CELL_SIZE = 80

# ----------------------------------------------------------------------
# Helper to load config
# ----------------------------------------------------------------------
def load_config():
    config_path = Path("config/default_config.json")
    with open(config_path) as f:
        return json.load(f)

# ----------------------------------------------------------------------
# Main function
# ----------------------------------------------------------------------
def main():
    # Load configuration
    cfg = load_config()


    # Parse CLI arguments for save/load
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--save', type=str, help='File path to save the game state')
    parser.add_argument('--load', type=str, help='File path to load a saved game state')
    args = parser.parse_args()
    
    # If a save file is provided, load it and skip the UI
    if args.save:
        from utils.save_load import load_state
        load_state(args.save, ecosystem)
        return
    if args.load:
        from utils.save_load import load_state
        load_state(args.load, ecosystem)
        # Continue to UI after loading

    # Initialize pygame
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Eco‑Simulator: The Garden of Species")
    clock = pygame.time.Clock()

    # Create SimPy environment and ecosystem model
    env = simpy.Environment()
    ecosystem = EcoSystem(env, cfg)
# Parse CLI arguments for save/load
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--save', type=str, help='File path to save the game state')
    parser.add_argument('--load', type=str, help='File path to load a saved game state')
    args = parser.parse_args()

    # If a save file is provided, load it and exit
    if args.save:
        from utils.save_load import load_state
        load_state(args.save, ecosystem)
        return
    if args.load:
        from utils.save_load import load_state
        load_state(args.load, ecosystem)
    # Setup UI components
    board = IslandBoard(screen, ecosystem)
    dashboard = LiveDashboard(screen, ecosystem)

    # Initial draw
    board.draw()
    dashboard.draw()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            else:
                # Forward events to UI components
                board.handle_event(event)
                dashboard.handle_event(event)

        # Update dashboard data (plots) at each frame
        dashboard.update_plot()

        # Advance SimPy time a little each frame to keep events flowing
        env.step(0.1)

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()

# ----------------------------------------------------------------------
if __name__ == "__main__":
    main()