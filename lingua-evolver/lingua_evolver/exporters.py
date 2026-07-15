"""Exporters module: generating reports from simulation data."""

from __future__ import annotations

from lingua_evolver.lexicon import format_word
from lingua_evolver.models import LanguageWorld


def export_markdown(world: LanguageWorld) -> str:
    """Export simulation results as a Markdown report."""
    lines = [
        "# LINGUA-EVOLVER Report",
        "",
        f"**Generations**: {world.generation}",
        f"**Agents**: {len(world.agents)}",
        f"**Shared Words**: {len(world.shared_lexicon)}",
        f"**Grammar Rules**: {len(world.shared_grammar)}",
        f"**Communication Success**: {world.stats.communication_success:.1%}",
        f"**Average Fluency**: {world.stats.avg_fluency:.2f}",
        "",
        "---",
        "",
        "## Shared Lexicon",
        "",
        "| Word | Meaning | Source |",
        "|------|---------|--------|",
    ]

    phoneme_map = {}
    for agent in world.agents:
        for p in agent.inventory:
            phoneme_map[p.id] = p

    for word in world.shared_lexicon:
        formatted = format_word(word, phoneme_map)
        source = "AI Emerged" if word.source == "emerged" else "User Input"
        lines.append(f"| {formatted} | {word.meaning} | {source} |")

    lines.extend([
        "",
        "## Grammar Rules",
        "",
        "| Rule Type | Pattern | Strength |",
        "|-----------|---------|----------|",
    ])

    for rule in world.shared_grammar:
        lines.append(
            f"| {rule.rule_type} | {rule.pattern} | {rule.strength:.0%} |"
        )

    lines.extend([
        "",
        "## Agent Summary",
        "",
        "| Name | Fluency | Words Known |",
        "|------|---------|-------------|",
    ])

    for agent in world.agents:
        lines.append(
            f"| {agent.name} | {agent.fluency_score:.2f} | {len(agent.lexicon)} |"
        )

    lines.extend([
        "",
        "## Recent Interactions",
        "",
    ])

    for utt in world.history[-20:]:
        symbols = []
        for pid in utt.phoneme_sequence:
            if pid in phoneme_map:
                symbols.append(phoneme_map[pid].symbol)
        utterance_str = "-".join(symbols) if symbols else "?"
        result = "V" if utt.understood else "X"
        lines.append(f"- Gen {utt.generation}: `{utterance_str}` -> {utt.intended_meaning} [{result}]")

    return "\n".join(lines)


def export_lexicon(world: LanguageWorld) -> str:
    """Export the shared lexicon as a dictionary."""
    lines = [
        "# LINGUA-EVOLVER Lexicon",
        "",
        f"Generation: {world.generation}",
        f"Total words: {len(world.shared_lexicon)}",
        "",
        "---",
        "",
    ]

    phoneme_map = {}
    for agent in world.agents:
        for p in agent.inventory:
            phoneme_map[p.id] = p

    # Group by source
    emerged = [w for w in world.shared_lexicon if w.source == "emerged"]
    user_input = [w for w in world.shared_lexicon if w.source == "user_input"]

    if emerged:
        lines.append("## AI Emerged Words")
        lines.append("")
        for word in sorted(emerged, key=lambda w: w.meaning):
            formatted = format_word(word, phoneme_map)
            lines.append(f"- **{formatted}** = {word.meaning}")

    if user_input:
        lines.extend([
            "",
            "## User Input Words",
            "",
        ])
        for word in sorted(user_input, key=lambda w: w.meaning):
            formatted = format_word(word, phoneme_map)
            lines.append(f"- **{formatted}** = {word.meaning}")

    return "\n".join(lines)


def export_csv(world: LanguageWorld) -> str:
    """Export time-series data as CSV."""
    lines = ["generation,total_words,total_rules,communication_success,phoneme_count,avg_fluency,agent_count"]

    for snapshot in world.snapshots:
        lines.append(
            f"{snapshot.generation},{snapshot.total_words},{snapshot.total_rules},"
            f"{snapshot.communication_success:.4f},{snapshot.phoneme_count},"
            f"{snapshot.avg_fluency:.4f},{snapshot.agent_count}"
        )

    return "\n".join(lines)


def export_chart(world: LanguageWorld, metric: str = "fluency", width: int = 60) -> str:
    """Export an ASCII chart of a metric over generations."""
    if not world.snapshots:
        return "No data available"

    # Get metric values
    metric_map = {
        "fluency": lambda s: s.avg_fluency,
        "words": lambda s: s.total_words,
        "rules": lambda s: s.total_rules,
        "success": lambda s: s.communication_success,
        "phonemes": lambda s: s.phoneme_count,
        "agents": lambda s: s.agent_count,
    }

    if metric not in metric_map:
        return f"Unknown metric: {metric}. Available: {', '.join(metric_map.keys())}"

    extractor = metric_map[metric]
    values = [extractor(s) for s in world.snapshots]

    if not values:
        return "No data"

    min_val = min(values)
    max_val = max(values)
    val_range = max_val - min_val if max_val > min_val else 1

    # Build chart
    lines = [
        f"=== {metric.upper()} OVER GENERATIONS ===",
        f"Min: {min_val:.2f}  Max: {max_val:.2f}  Current: {values[-1]:.2f}",
        "",
    ]

    # Simplify: show 20 bars max
    step = max(1, len(values) // 20)
    sampled = values[::step]

    for i, val in enumerate(sampled):
        gen = i * step
        bar_len = int((val - min_val) / val_range * width)
        bar = "█" * bar_len
        lines.append(f"Gen {gen:4d} | {bar} {val:.2f}")

    return "\n".join(lines)


def export_phoneme_overlap(world: LanguageWorld) -> str:
    """Export a matrix showing phoneme overlap between agents."""
    if not world.agents:
        return "No agents"

    lines = [
        "=== PHONEME OVERLAP MATRIX ===",
        "",
    ]

    # Build phoneme sets per agent
    agent_phonemes: list[set[str]] = []
    agent_names: list[str] = []
    for agent in world.agents:
        phonemes = {p.symbol for p in agent.inventory}
        agent_phonemes.append(phonemes)
        agent_names.append(agent.name)

    # Header
    header = "        " + " ".join(f"{name[:4]:>4}" for name in agent_names)
    lines.append(header)

    # Matrix
    for i, name_i in enumerate(agent_names):
        row = f"{name_i[:4]:4}   "
        for j, phonemes_j in enumerate(agent_phonemes):
            if i == j:
                row += "  --"
            else:
                overlap = len(agent_phonemes[i] & phonemes_j)
                row += f"  {overlap:2d}"
        lines.append(row)

    lines.extend([
        "",
        f"Total unique phonemes: {len(set().union(*agent_phonemes))}",
    ])

    return "\n".join(lines)


def export_convergence(world: LanguageWorld) -> str:
    """Export convergence metrics."""
    if not world.agents:
        return "No agents"

    lines = [
        "=== LANGUAGE CONVERGENCE METRICS ===",
        "",
    ]

    # Lexical convergence: how many agents share each meaning
    meaning_agents: dict[str, int] = {}
    for agent in world.agents:
        for word in agent.lexicon:
            meaning_agents[word.meaning] = meaning_agents.get(word.meaning, 0) + 1

    total_agents = len(world.agents)
    if meaning_agents:
        avg_convergence = sum(meaning_agents.values()) / len(meaning_agents) / total_agents
        lines.append(f"Lexical Convergence: {avg_convergence:.1%}")
        lines.append(f"  (avg agents sharing each word / total agents)")
    else:
        lines.append("Lexical Convergence: N/A")

    # Grammar convergence
    if world.shared_grammar:
        avg_strength = sum(r.strength for r in world.shared_grammar) / len(world.shared_grammar)
        lines.append(f"Grammar Convergence: {avg_strength:.1%}")
        lines.append(f"  (avg rule strength)")
    else:
        lines.append("Grammar Convergence: N/A")

    # Community divergence
    if world.communities and len(world.communities) > 1:
        avg_divergence = sum(c.dialect_divergence for c in world.communities) / len(world.communities)
        lines.append(f"Community Divergence: {avg_divergence:.1%}")
    else:
        lines.append("Community Divergence: N/A (single community)")

    # Success rate trend
    if len(world.snapshots) >= 10:
        recent = world.snapshots[-10:]
        early = world.snapshots[:10] if len(world.snapshots) >= 20 else world.snapshots[:5]

        recent_success = sum(s.communication_success for s in recent) / len(recent)
        early_success = sum(s.communication_success for s in early) / len(early)

        if recent_success > early_success:
            lines.append(f"Trend: IMPROVING ({early_success:.1%} -> {recent_success:.1%})")
        elif recent_success < early_success:
            lines.append(f"Trend: DECLINING ({early_success:.1%} -> {recent_success:.1%})")
        else:
            lines.append(f"Trend: STABLE ({recent_success:.1%})")

    return "\n".join(lines)
