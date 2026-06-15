# /workspaces/random/eco_simulator/src/utils/mutation.py
# Utility for generating random genetic mutations.
import random

def generate_mutation() -> dict:
    """
    Return a dictionary representing a new trait.
    The function can be expanded with more sophisticated logic.
    """
    traits = {
        "photosynthetic": random.random() < 0.5,
        "camouflage": random.random() < 0.5,
        "fast_reproduction": random.random() < 0.5
    }
    # Return only the traits that are True to keep the dict small
    return {k: v for k, v in traits.items() if v}