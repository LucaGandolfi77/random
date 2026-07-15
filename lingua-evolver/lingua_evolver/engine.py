"""Engine module: core simulation loop for language evolution."""

from __future__ import annotations

import random
from typing import Callable

from lingua_evolver.agents.base import (
    add_memory,
    compose_utterance,
    compose_clarification,
    compose_dialogue_turn,
    create_agent,
    get_random_name,
    interpret_utterance,
    learn_from_success,
    negotiate_meaning,
    should_clarify,
    update_fluency,
)
from lingua_evolver.agents.llm_agent import llm_compose_utterance, llm_interpret_utterance
from lingua_evolver.client import OpenRouterClient
from lingua_evolver.config import RuntimeSettings
from lingua_evolver.grammar import detect_morphology, detect_word_order, strengthen_rule, weaken_rule
from lingua_evolver.input_queue import InputQueue
from lingua_evolver.lexicon import add_word_to_lexicon, create_word, find_word_by_meaning
from lingua_evolver.models import (
    Community,
    Dialogue,
    DialogueAct,
    DialogueTurn,
    LanguageAgent,
    LanguageWorld,
    GenerationSnapshot,
    MEANING_CATEGORIES,
    Phoneme,
    SemanticCategory,
    Utterance,
    Word,
    WorldStats,
)
from lingua_evolver.phonology import generate_inventory, mutate_inventory, apply_sound_change

# Meanings pool for agents to communicate
MEANINGS = [
    "io", "tu", "lui", "lei", "noi", "voi", "loro",
    "vedere", "andare", "mangiare", "bere", "dormire",
    "acqua", "fuoco", "terra", "cielo", "sole", "luna",
    "grande", "piccolo", "buono", "cattivo", "caldo", "freddo",
    "amico", "nemico", "casa", "via", "monte", "fiume",
    "giorno", "notte", "alba", "tramonto",
    "uno", "due", "tre", "molti", "pochi",
    "qui", "là", "dentro", "fuori",
]

AGENT_NAME_POOL = [
    "Akira", "Bora", "Cael", "Duna", "Eppo",
    "Fira", "Gaku", "Hala", "Iori", "Juna",
]


class SimulationEngine:
    """Core engine that runs the language evolution simulation."""

    def __init__(
        self,
        settings: RuntimeSettings,
        client: OpenRouterClient | None = None,
        on_tick: Callable[[LanguageWorld], None] | None = None,
    ) -> None:
        self._settings = settings
        self._client = client
        self._on_tick = on_tick
        self._input_queue = InputQueue()
        self._success_count = 0
        self._attempt_count = 0

    @property
    def input_queue(self) -> InputQueue:
        """Access the input queue for adding user words."""
        return self._input_queue

    def initialize_world(self) -> LanguageWorld:
        """Create the initial world with random agents and communities."""
        agents = []
        for i in range(self._settings.num_agents):
            name = AGENT_NAME_POOL[i % len(AGENT_NAME_POOL)]
            if i >= len(AGENT_NAME_POOL):
                name += str(i)
            inventory = generate_inventory(self._settings.phonemes_per_agent)
            agent = create_agent(name, inventory, generation=0)
            agents.append(agent)

        # Create communities (2-3 groups)
        num_communities = min(3, max(2, self._settings.num_agents // 3))
        communities = []
        agents_per_community = self._settings.num_agents // num_communities

        for i in range(num_communities):
            start_idx = i * agents_per_community
            end_idx = start_idx + agents_per_community if i < num_communities - 1 else self._settings.num_agents
            member_ids = [agents[j].id for j in range(start_idx, end_idx)]

            community = Community(
                name=f"Community_{i + 1}",
                member_ids=member_ids,
            )
            communities.append(community)

        return LanguageWorld(
            generation=0,
            agents=agents,
            communities=communities,
            stats=WorldStats(),
        )

    def run_simulation(self, world: LanguageWorld) -> LanguageWorld:
        """Run the full simulation for the configured number of generations."""
        patience_counter = 0
        best_success = 0.0

        for gen in range(world.generation, self._settings.generations):
            world = self.tick_generation(world)

            # Early stopping check
            if world.stats.communication_success > best_success + 0.01:
                best_success = world.stats.communication_success
                patience_counter = 0
            else:
                patience_counter += 1

            if (self._settings.convergence_threshold > 0
                and world.stats.communication_success >= self._settings.convergence_threshold
                and patience_counter >= self._settings.early_stop_patience):
                break

        return world

    def tick_generation(self, world: LanguageWorld) -> LanguageWorld:
        """Advance the simulation by one generation."""
        # Phase 1: Process user input queue
        world = self._process_input_queue(world)

        # Phase 2: Interaction phase (simple utterances)
        world, success, attempts = self._interaction_phase(world)
        self._success_count += success
        self._attempt_count += attempts

        # Phase 3: Dialogue phase (multi-turn conversations)
        world = self._dialogue_phase(world)

        # Phase 4: Language contact between communities
        world = self._language_contact_phase(world)

        # Phase 5: Emergence phase
        world = self._emergence_phase(world)

        # Phase 6: Reproduction phase
        world = self._reproduction_phase(world)

        # Phase 7: Update stats
        world.stats = self._compute_stats(world)

        # Advance generation
        world.generation += 1

        # Save snapshot for time-series
        snapshot = GenerationSnapshot(
            generation=world.generation,
            total_words=world.stats.total_words,
            total_rules=world.stats.total_rules,
            communication_success=world.stats.communication_success,
            phoneme_count=world.stats.phoneme_count,
            avg_fluency=world.stats.avg_fluency,
            agent_count=len(world.agents),
        )
        world.snapshots.append(snapshot)

        # Callback
        if self._on_tick:
            self._on_tick(world)

        return world

    def _process_input_queue(self, world: LanguageWorld) -> LanguageWorld:
        """Process all pending user input words."""
        pending = self._input_queue.process_pending()

        for entry in pending:
            # Find or create phoneme
            existing_phoneme = None
            for agent in world.agents:
                for p in agent.inventory:
                    if p.symbol == entry.phoneme_symbol:
                        existing_phoneme = p
                        break
                if existing_phoneme:
                    break

            if not existing_phoneme:
                # Create new phoneme and distribute to all agents
                new_phoneme = Phoneme(symbol=entry.phoneme_symbol)
                for agent in world.agents:
                    agent.inventory.append(Phoneme(symbol=entry.phoneme_symbol))
                existing_phoneme = new_phoneme

            # Create word in shared lexicon
            word = create_word(
                phoneme_ids=[existing_phoneme.id],
                meaning=entry.meaning,
                generation=world.generation,
                source="user_input",
            )
            add_word_to_lexicon(world.shared_lexicon, word)

            # Distribute word to all agents
            for agent in world.agents:
                add_word_to_lexicon(agent.lexicon, Word(
                    phonemes=[existing_phoneme.id],
                    meaning=entry.meaning,
                    source="user_input",
                ))

            # Add to history
            world.history.append(Utterance(
                speaker_id=world.agents[0].id if world.agents else word.id,
                listener_id=world.agents[1].id if len(world.agents) > 1 else word.id,
                phoneme_sequence=[existing_phoneme.id],
                intended_meaning=entry.meaning,
                understood=True,
                generation=world.generation,
            ))

        return world

    def _interaction_phase(
        self, world: LanguageWorld
    ) -> tuple[LanguageWorld, int, int]:
        """Run the interaction phase for this generation."""
        success_count = 0
        attempt_count = 0

        for _ in range(self._settings.interactions_per_generation):
            if len(world.agents) < 2:
                break

            # Pick random speaker and listener
            speaker, listener = random.sample(world.agents, 2)

            # Pick random meaning
            meaning = random.choice(MEANINGS)

            # Compose utterance
            use_llm = (
                self._settings.effective_llm_enabled
                and self._client is not None
                and random.random() < 0.3  # 30% chance LLM
            )

            if use_llm and self._client:
                phonemes = llm_compose_utterance(speaker, meaning, self._client)
                if phonemes:
                    used_existing = any(
                        word.meaning == meaning
                        for word in speaker.lexicon
                    )
                else:
                    # Fallback to deterministic
                    phonemes, used_existing = compose_utterance(
                        speaker, meaning, world.agents
                    )
            else:
                phonemes, used_existing = compose_utterance(
                    speaker, meaning, world.agents
                )

            # Interpret utterance
            phoneme_ids = [p.id for p in phonemes]

            if use_llm and self._client:
                symbols = [p.symbol for p in phonemes]
                interpreted = llm_interpret_utterance(
                    listener, symbols, self._client
                )
                understood = interpreted == meaning if interpreted else False
            else:
                interpreted = interpret_utterance(listener, phoneme_ids)
                understood = interpreted == meaning

            # Create utterance record
            utterance = Utterance(
                speaker_id=speaker.id,
                listener_id=listener.id,
                phoneme_sequence=phoneme_ids,
                intended_meaning=meaning,
                understood=understood,
                generation=world.generation,
            )

            # Update agents
            if understood:
                learn_from_success(speaker, phoneme_ids, meaning)
                learn_from_success(listener, phoneme_ids, meaning)
                success_count += 1

            update_fluency(speaker, understood)
            update_fluency(listener, understood)
            add_memory(speaker, utterance)
            add_memory(listener, utterance)

            # Record in world history (keep last 500)
            world.history.append(utterance)
            if len(world.history) > 500:
                world.history = world.history[-500:]

            attempt_count += 1

        return world, success_count, attempt_count

    def _dialogue_phase(self, world: LanguageWorld) -> LanguageWorld:
        """Run multi-turn dialogue phase for this generation."""
        if len(world.agents) < 2:
            return world

        # Run a few dialogues per generation
        num_dialogues = min(3, len(world.agents) // 2)

        for _ in range(num_dialogues):
            speaker, listener = random.sample(world.agents, 2)
            meaning = random.choice(MEANINGS)

            # Create dialogue
            dialogue = Dialogue(
                participants=[speaker.id, listener.id],
                generation=world.generation,
                topic=meaning,
            )

            # Multi-turn conversation (2-4 turns)
            max_turns = random.randint(2, 4)
            success_count = 0

            for turn_num in range(max_turns):
                # Speaker's turn
                speaker_turn = compose_dialogue_turn(
                    speaker, meaning, DialogueAct.STATEMENT, world.agents
                )
                speaker_turn.generation = world.generation

                # Listener interprets
                interpreted = interpret_utterance(
                    listener, speaker_turn.phoneme_sequence
                )
                speaker_turn.understood = (interpreted == meaning)

                dialogue.turns.append(speaker_turn)

                if speaker_turn.understood:
                    success_count += 1
                    # Confirm understanding
                    confirm_turn = compose_dialogue_turn(
                        listener, meaning, DialogueAct.CONFIRMATION, world.agents
                    )
                    confirm_turn.generation = world.generation
                    confirm_turn.understood = True
                    dialogue.turns.append(confirm_turn)

                    learn_from_success(
                        listener, speaker_turn.phoneme_sequence, meaning
                    )
                    break
                else:
                    # Ask for clarification
                    if should_clarify(listener, 0.0):
                        clarify_turn = DialogueTurn(
                            agent_id=listener.id,
                            act=DialogueAct.CLARIFICATION,
                            phoneme_sequence=[],
                            intended_meaning="?",
                            understood=False,
                            generation=world.generation,
                        )
                        dialogue.turns.append(clarify_turn)

                        # Speaker tries again with different phonemes
                        new_phonemes, _ = compose_utterance(
                            speaker, meaning, world.agents
                        )
                        speaker_turn_2 = DialogueTurn(
                            agent_id=speaker.id,
                            act=DialogueAct.STATEMENT,
                            phoneme_sequence=[p.id for p in new_phonemes],
                            intended_meaning=meaning,
                            understood=False,
                            generation=world.generation,
                        )

                        interpreted_2 = interpret_utterance(
                            listener, speaker_turn_2.phoneme_sequence
                        )
                        speaker_turn_2.understood = (interpreted_2 == meaning)
                        dialogue.turns.append(speaker_turn_2)

                        if speaker_turn_2.understood:
                            success_count += 1
                            learn_from_success(
                                listener, speaker_turn_2.phoneme_sequence, meaning
                            )

            dialogue.success_rate = success_count / max_turns if max_turns > 0 else 0
            world.dialogues.append(dialogue)

            # Keep only recent dialogues
            if len(world.dialogues) > 20:
                world.dialogues = world.dialogues[-20:]

        return world

    def _language_contact_phase(self, world: LanguageWorld) -> LanguageWorld:
        """Handle language contact between communities.

        Agents from different communities occasionally interact,
        leading to dialect convergence or borrowing.
        """
        if len(world.communities) < 2:
            return world

        # Pick two random communities
        comm1, comm2 = random.sample(world.communities, 2)

        # Pick one agent from each community
        agents1 = [a for a in world.agents if a.id in comm1.member_ids]
        agents2 = [a for a in world.agents if a.id in comm2.member_ids]

        if not agents1 or not agents2:
            return world

        agent1 = random.choice(agents1)
        agent2 = random.choice(agents2)

        # 20% chance of language contact event
        if random.random() > 0.2:
            return world

        # Agent1 teaches a word to Agent2
        if agent1.lexicon and random.random() < 0.5:
            word_to_share = random.choice(agent1.lexicon)
            # Check if agent2 doesn't have this word
            existing = next(
                (w for w in agent2.lexicon if w.meaning == word_to_share.meaning),
                None,
            )
            if not existing:
                new_word = Word(
                    phonemes=word_to_share.phonemes,
                    meaning=word_to_share.meaning,
                    category=word_to_share.category,
                    source=word_to_share.source,
                )
                agent2.lexicon.append(new_word)

                # Update community lexicon
                comm2.shared_lexicon.append(new_word)

                # Increase dialect divergence
                comm2.dialect_divergence = min(
                    1.0, comm2.dialect_divergence + 0.05
                )
        else:
            # Agent2 teaches a word to Agent1
            if agent2.lexicon:
                word_to_share = random.choice(agent2.lexicon)
                existing = next(
                    (w for w in agent1.lexicon if w.meaning == word_to_share.meaning),
                    None,
                )
                if not existing:
                    new_word = Word(
                        phonemes=word_to_share.phonemes,
                        meaning=word_to_share.meaning,
                        category=word_to_share.category,
                        source=word_to_share.source,
                    )
                    agent1.lexicon.append(new_word)
                    comm1.shared_lexicon.append(new_word)
                    comm1.dialect_divergence = min(
                        1.0, comm1.dialect_divergence + 0.05
                    )

        return world

    def _emergence_phase(self, world: LanguageWorld) -> LanguageWorld:
        """Detect and add new words and grammar rules."""
        # Track which rules were strengthened this generation
        strengthened_rules: set[str] = set()

        # Word emergence from successful utterances
        recent = [
            u for u in world.history
            if u.generation == world.generation and u.understood
        ]

        # Count meaning -> phoneme patterns
        meaning_patterns: dict[str, dict[tuple, int]] = {}
        for utt in recent:
            key = utt.intended_meaning
            pattern = tuple(utt.phoneme_sequence)
            if key not in meaning_patterns:
                meaning_patterns[key] = {}
            meaning_patterns[key][pattern] = meaning_patterns[key].get(pattern, 0) + 1

        # Create shared words for frequently used patterns
        for meaning, patterns in meaning_patterns.items():
            for pattern, count in patterns.items():
                if count >= 3 and not find_word_by_meaning(world.shared_lexicon, meaning):
                    # Determine semantic category
                    category = MEANING_CATEGORIES.get(meaning, SemanticCategory.UNKNOWN)

                    word = create_word(
                        phoneme_ids=list(pattern),
                        meaning=meaning,
                        generation=world.generation,
                    )
                    word.category = category
                    add_word_to_lexicon(world.shared_lexicon, word)

                    # Distribute to agents
                    for agent in world.agents:
                        agent_word = Word(
                            phonemes=list(pattern),
                            meaning=meaning,
                            category=category,
                        )
                        add_word_to_lexicon(agent.lexicon, agent_word)

        # Grammar emergence
        word_order = detect_word_order(world.history, world.shared_lexicon)
        if word_order:
            strengthened_rules.add("word_order")
            existing = next(
                (r for r in world.shared_grammar if r.rule_type == "word_order"),
                None,
            )
            if existing:
                strengthen_rule(existing)
            else:
                word_order.emerged_generation = world.generation
                world.shared_grammar.append(word_order)
                for agent in world.agents:
                    agent.grammar.append(word_order)

        morphology_rules = detect_morphology(world.history, world.shared_lexicon)
        for rule in morphology_rules:
            strengthened_rules.add(rule.rule_type)
            existing = next(
                (r for r in world.shared_grammar if r.rule_type == rule.rule_type),
                None,
            )
            if existing:
                strengthen_rule(existing)
            else:
                rule.emerged_generation = world.generation
                world.shared_grammar.append(rule)
                for agent in world.agents:
                    agent.grammar.append(rule)

        # Decay rules that were not strengthened this generation
        for rule in world.shared_grammar:
            if rule.rule_type not in strengthened_rules:
                weaken_rule(rule)
                # Remove very weak rules
                if rule.strength <= 0.05:
                    world.shared_grammar.remove(rule)
                    for agent in world.agents:
                        agent.grammar = [r for r in agent.grammar if r.id != rule.id]

        return world

    def _reproduction_phase(self, world: LanguageWorld) -> LanguageWorld:
        """Reproduce agents: remove weak, add offspring of strong."""
        # Separate survivors and weak
        survivors = [a for a in world.agents if a.fluency_score >= 0.5]
        weak = [a for a in world.agents if a.fluency_score < 0.3]

        # Remove weak agents
        for agent in weak:
            if agent in world.agents:
                world.agents.remove(agent)

        # Add new agents to maintain population
        target = self._settings.num_agents
        while len(world.agents) < target and survivors:
            parent = random.choice(survivors)
            child = self._create_offspring(parent, world)
            world.agents.append(child)

        # Add completely new agents if still below target
        while len(world.agents) < target:
            inventory = generate_inventory(self._settings.phonemes_per_agent)
            name = get_random_name() + str(world.generation)
            new_agent = create_agent(name, inventory, world.generation)
            world.agents.append(new_agent)

        return world

    def _create_offspring(
        self, parent: LanguageAgent, world: LanguageWorld
    ) -> LanguageAgent:
        """Create a child agent inheriting from a parent."""
        # Inherit 70% of parent's phonemes
        inherit_count = max(3, int(len(parent.inventory) * 0.7))
        inherited_phonemes = random.sample(
            parent.inventory, min(inherit_count, len(parent.inventory))
        )

        # Apply mutations
        mutated = mutate_inventory(inherited_phonemes, mutation_rate=0.1)

        # Apply sound change (small chance per generation)
        if random.random() < 0.1:
            mutated, _ = apply_sound_change(mutated, probability=0.2)

        # Create child
        name = get_random_name() + str(world.generation)
        child = create_agent(name, mutated, world.generation)

        # Inherit parent's lexicon (not just shared)
        child.lexicon = list(parent.lexicon)

        # Add any shared words not in parent's lexicon
        parent_meanings = {w.meaning for w in parent.lexicon}
        for word in world.shared_lexicon:
            if word.meaning not in parent_meanings:
                child.lexicon.append(Word(
                    phonemes=word.phonemes,
                    meaning=word.meaning,
                    source=word.source,
                ))

        child.grammar = list(world.shared_grammar)

        # Inherit fluency (slightly reduced)
        child.fluency_score = parent.fluency_score * 0.8

        return child

    def _compute_stats(self, world: LanguageWorld) -> WorldStats:
        """Compute current world statistics."""
        all_phonemes = set()
        for agent in world.agents:
            for p in agent.inventory:
                all_phonemes.add(p.symbol)

        avg_fluency = 0.0
        if world.agents:
            avg_fluency = sum(a.fluency_score for a in world.agents) / len(world.agents)

        success_rate = 0.0
        if self._attempt_count > 0:
            success_rate = self._success_count / self._attempt_count

        return WorldStats(
            total_words=len(world.shared_lexicon),
            total_rules=len(world.shared_grammar),
            communication_success=success_rate,
            phoneme_count=len(all_phonemes),
            avg_fluency=avg_fluency,
        )
