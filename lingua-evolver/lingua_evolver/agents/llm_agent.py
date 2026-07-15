"""LLM-powered agent that participates in language evolution."""

from __future__ import annotations

from lingua_evolver.client import OpenRouterClient
from lingua_evolver.models import LanguageAgent, Phoneme


def llm_compose_utterance(
    agent: LanguageAgent,
    meaning: str,
    client: OpenRouterClient,
) -> list[Phoneme] | None:
    """Ask the LLM to compose an utterance for a meaning.

    Returns the phonemes to use, or None if LLM fails.
    """
    inventory_str = ", ".join(p.symbol for p in agent.inventory)
    lexicon_str = "\n".join(
        f"  {meaning}: {'-'.join(str(pid)[:6] for pid in word.phonemes)}"
        for word in agent.lexicon
    ) or "  (none)"

    system_prompt = f"""You are an agent learning an artificial language.
Your phoneme inventory: {inventory_str}
Your known words:
{lexicon_str}

When asked to express a meaning, output ONLY the phoneme symbols
separated by hyphens. Use your known words if available.
If no word exists, compose new sounds from your inventory.
Example output: ka-mu-ti"""

    user_prompt = f'Express the meaning: "{meaning}"'

    try:
        result, _ = client.complete_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.5,
            max_tokens=50,
        )

        if isinstance(result, str):
            symbols = result.strip().split("-")
        elif isinstance(result, dict) and "phonemes" in result:
            symbols = result["phonemes"].split("-") if isinstance(result["phonemes"], str) else result["phonemes"]
        else:
            symbols = str(result).strip().split("-")

        # Map symbols back to phoneme objects
        symbol_map = {p.symbol: p for p in agent.inventory}
        phonemes = []
        for s in symbols:
            s = s.strip().lower()
            if s in symbol_map:
                phonemes.append(symbol_map[s])

        return phonemes if phonemes else None

    except Exception:
        return None


def llm_interpret_utterance(
    agent: LanguageAgent,
    symbols: list[str],
    client: OpenRouterClient,
) -> str | None:
    """Ask the LLM to interpret a phoneme sequence.

    Returns the interpreted meaning, or None if LLM fails.
    """
    sequence = "-".join(symbols)
    lexicon_str = "\n".join(
        f"  {word.meaning}: {'-'.join(str(pid)[:6] for pid in word.phonemes)}"
        for word in agent.lexicon
    ) or "  (none)"

    system_prompt = f"""You are an agent trying to understand an artificial language.
Your known words:
{lexicon_str}

When shown a phoneme sequence, guess what it means.
Output ONLY the single word/meaning you think it represents.
If you don't recognize it, output "unknown"."""

    user_prompt = f"What does '{sequence}' mean?"

    try:
        result, _ = client.complete_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,
            max_tokens=30,
        )

        meaning = str(result).strip().lower()
        if meaning == "unknown" or not meaning:
            return None
        return meaning

    except Exception:
        return None
