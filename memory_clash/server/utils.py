# /workspaces/random/memory_clash/server/utils.py
# Utility functions for card transformations and board setup.

import random
from typing import List, Dict, Any


def generate_initial_layout(grid_size: int) -> List[Dict[str, Any]]:
    """
    Create a new game board with paired cards.
    Returns a list of dicts, each containing:
        - id: unique identifier for the card image
        - flipped: bool (initially False)
        - matched: bool (initially False)
    The board is randomly shuffled.
    """
    # Each pair gets a unique integer ID; we need an even number of cards
    pair_count = (grid_size * grid_size) // 2
    ids = list(range(pair_count))
    # Duplicate each ID to create pairs
    card_ids = []
    for i in ids:
        card_ids.extend([i, i])  # two copies of each ID
    random.shuffle(card_ids)

    layout = []
    for idx, card_id in enumerate(card_ids):
        layout.append({
            "id": card_id,
            "flipped": False,
            "matched": False,
            "index": idx
        })
    return layout


class CardTransformer:
    """
    Static methods that encapsulate card transformation logic.
    The transformations are deterministic given the same seed,
    ensuring all clients see the same result.
    """

    @staticmethod
    def apply_random_transform(cards: List[Dict[str, Any]], grid_size: int) -> List[Dict[str, Any]]:
        """
        Randomly transform a subset of face‑down cards after a successful match.
        Transformation can be a rotation of the card ID (modulo number of pairs)
        or a swap with another card. For simplicity we rotate each non‑matched
        card by a random offset and then optionally swap two of them.

        The method returns a **new list** (leaving the original untouched).
        """
        # Create a shallow copy so we don't mutate the caller's list
        transformed = [dict(card) for card in cards]

        # Determine how many cards are still face‑down and not matched
        non_matched = [c for c in transformed if not c["matched"] and not c["flipped"]]
        if not non_matched:
            return transformed  # nothing to transform

        # Randomly pick up to 30% of the non‑matched cards to transform
        transform_count = max(1, int(0.3 * len(non_matched)))
        selected = random.sample(non_matched, transform_count)

        # Apply a rotation to each selected card's ID
        for card in selected:
            # Number of distinct IDs is half the total cards
            max_id = (grid_size * grid_size) // 2 - 1
            offset = random.randint(1, max_id)
            card["id"] = (card["id"] + offset) % (max_id + 1)

        # Optionally perform a swap between two randomly chosen transformed cards
        if len(selected) >= 2:
            a, b = random.sample(selected, 2)
            a_id, b_id = a["id"], b["id"]
            a["id"], b["id"] = b_id, a_id

        return transformed