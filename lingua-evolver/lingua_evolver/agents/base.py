"""Base language agent with deterministic logic."""

from __future__ import annotations

import random
from uuid import UUID

from lingua_evolver.models import (
    DialogueAct,
    DialogueTurn,
    LanguageAgent,
    Phoneme,
    Utterance,
    Word,
)


def create_agent(
    name: str,
    inventory: list[Phoneme],
    generation: int = 0,
) -> LanguageAgent:
    """Create a new language agent with the given phoneme inventory."""
    return LanguageAgent(
        name=name,
        generation=generation,
        inventory=inventory,
    )


def compose_utterance(
    agent: LanguageAgent,
    meaning: str,
    all_agents: list[LanguageAgent],
) -> tuple[list[Phoneme], bool]:
    """Attempt to compose an utterance for a given meaning.

    Returns (phonemes_used, used_existing_word).
    """
    # Check if agent has a word for this meaning
    for word in agent.lexicon:
        if word.meaning == meaning:
            phonemes = [
                p for p in agent.inventory
                if p.id in word.phonemes
            ]
            if phonemes:
                return phonemes, True

    # Fallback: compose random phonemes from inventory
    count = random.randint(2, 4)
    selected = random.sample(agent.inventory, min(count, len(agent.inventory)))
    return selected, False


def interpret_utterance(
    agent: LanguageAgent,
    phoneme_ids: list[UUID],
) -> str | None:
    """Try to interpret a received phoneme sequence.

    Returns the meaning if recognized, None otherwise.
    """
    for word in agent.lexicon:
        if word.phonemes == phoneme_ids:
            return word.meaning
    return None


def learn_from_success(
    agent: LanguageAgent,
    phoneme_ids: list[UUID],
    meaning: str,
    boost: float = 0.1,
) -> None:
    """Update agent's lexicon after a successful communication."""
    # Check if word already exists
    for word in agent.lexicon:
        if word.meaning == meaning:
            word.frequency = min(1.0, word.frequency + boost)
            return

    # Create new word in agent's lexicon
    new_word = Word(
        phonemes=phoneme_ids,
        meaning=meaning,
        frequency=boost,
    )
    agent.lexicon.append(new_word)


def update_fluency(agent: LanguageAgent, success: bool) -> None:
    """Update agent's fluency score based on communication success."""
    if success:
        agent.fluency_score = min(1.0, agent.fluency_score + 0.01)
    else:
        agent.fluency_score = max(0.0, agent.fluency_score - 0.005)


def add_memory(
    agent: LanguageAgent,
    utterance: Utterance,
    max_memory: int = 20,
) -> None:
    """Add an utterance to agent's memory, keeping only recent entries."""
    agent.memory.append(utterance)
    if len(agent.memory) > max_memory:
        agent.memory = agent.memory[-max_memory:]


def compose_clarification(
    agent: LanguageAgent,
    unknown_phonemes: list[Phoneme],
) -> list[Phoneme]:
    """Compose a clarification request when encountering unknown utterance.

    Returns a short sequence asking for repetition.
    """
    # Use a simple "what?" pattern with common phonemes
    if len(agent.inventory) >= 2:
        return random.sample(agent.inventory, 2)
    return agent.inventory[:1] if agent.inventory else []


def should_clarify(agent: LanguageAgent, confidence: float) -> bool:
    """Determine if agent should ask for clarification based on confidence.

    Lower fluency agents clarify more often.
    """
    threshold = 0.3 + (1.0 - agent.fluency_score) * 0.3
    return confidence < threshold


def negotiate_meaning(
    agent: LanguageAgent,
    phoneme_ids: list[UUID],
    proposed_meaning: str,
) -> tuple[bool, str]:
    """Negotiate meaning of an unknown word based on context.

    Returns (accepted, final_meaning).
    """
    # Check if any known word is similar
    for word in agent.lexicon:
        # Simple similarity: shared phonemes
        shared = set(word.phonemes) & set(phoneme_ids)
        if len(shared) >= len(word.phonemes) * 0.5:
            # Similar pattern found, might be related
            if word.meaning == proposed_meaning:
                return True, proposed_meaning
            # Could be a synonym or variant
            return True, proposed_meaning

    # Accept new meaning if agent is fluent enough
    if agent.fluency_score > 0.5:
        return True, proposed_meaning

    return False, ""


def compose_dialogue_turn(
    agent: LanguageAgent,
    meaning: str,
    act: DialogueAct,
    all_agents: list[LanguageAgent],
) -> DialogueTurn:
    """Compose a dialogue turn with a specific act type."""
    phonemes, _ = compose_utterance(agent, meaning, all_agents)

    return DialogueTurn(
        agent_id=agent.id,
        act=act,
        phoneme_sequence=[p.id for p in phonemes],
        intended_meaning=meaning,
        understood=False,
        generation=0,
    )


AGENT_NAMES = [
    "Akira", "Bora", "Cael", "Duna", "Eppo",
    "Fira", "Gaku", "Hala", "Iori", "Juna",
    "Kael", "Lira", "Moku", "Nara", "Oba",
    "Pira", "Roku", "Suna", "Tira", "Uka",
]


def get_random_name() -> str:
    """Get a random agent name."""
    return random.choice(AGENT_NAMES)
