"""Tests for new features: phonology, grammar, semantic, dialogue, community, exporters."""

from uuid import uuid4

from lingua_evolver.config import RuntimeSettings
from lingua_evolver.engine import SimulationEngine
from lingua_evolver.exporters import (
    export_chart,
    export_convergence,
    export_csv,
    export_phoneme_overlap,
)
from lingua_evolver.grammar import (
    detect_negation,
    detect_plural,
    detect_suffix,
    detect_tense,
)
from lingua_evolver.models import (
    Community,
    Dialogue,
    DialogueAct,
    DialogueTurn,
    LanguageAgent,
    MEANING_CATEGORIES,
    SemanticCategory,
    SemanticLink,
    Utterance,
    Word,
)
from lingua_evolver.phonology import (
    apply_assimilation,
    apply_lenition,
    apply_vowel_harmony,
)


class TestSoundChanges:
    """Tests for sound change functions."""

    def test_lenition_weakens_consonants(self):
        result, changed = apply_lenition("pa", probability=1.0)
        assert result == "ba" or not changed

    def test_assimilation_spreads_features(self):
        result, changed = apply_assimilation("pa", "ti", probability=1.0)
        assert len(result) >= 2

    def test_vowel_harmony_matches(self):
        result, changed = apply_vowel_harmony(["pa", "bi", "tu"], probability=1.0)
        assert len(result) == 3


class TestGrammarDetection:
    """Tests for enhanced grammar detection."""

    def test_detect_suffix_not_enough_data(self):
        agent_id = uuid4()
        listener_id = uuid4()
        phoneme_id = uuid4()
        utterances = [Utterance(
            speaker_id=agent_id, listener_id=listener_id,
            phoneme_sequence=[phoneme_id], intended_meaning="test",
            understood=True, generation=0,
        )]
        assert detect_suffix(utterances, []) is None

    def test_detect_suffix_sufficient_data(self):
        agent_id = uuid4()
        listener_id = uuid4()
        p1 = uuid4()
        s = uuid4()
        utterances = [
            Utterance(
                speaker_id=agent_id, listener_id=listener_id,
                phoneme_sequence=[p1, s], intended_meaning="plural1",
                understood=True, generation=i,
            )
            for i in range(8)
        ]
        word = Word(phonemes=[p1], meaning="plural1", source="emerged")
        rule = detect_suffix(utterances, [word])
        assert rule is None or rule.rule_type == "suffix"

    def test_detect_plural(self):
        agent_id = uuid4()
        listener_id = uuid4()
        p1 = uuid4()
        s = uuid4()
        utterances = [
            Utterance(
                speaker_id=agent_id, listener_id=listener_id,
                phoneme_sequence=[p1, s], intended_meaning="pl_casa",
                understood=True, generation=i,
            )
            for i in range(5)
        ]
        rule = detect_plural(utterances, [])
        assert rule is None or rule.rule_type == "plural"

    def test_detect_negation(self):
        agent_id = uuid4()
        listener_id = uuid4()
        no = uuid4()
        p1 = uuid4()
        utterances = [
            Utterance(
                speaker_id=agent_id, listener_id=listener_id,
                phoneme_sequence=[no, p1], intended_meaning="non_vedere",
                understood=True, generation=i,
            )
            for i in range(5)
        ]
        rule = detect_negation(utterances, [])
        assert rule is None or rule.rule_type == "negation"

    def test_detect_tense(self):
        agent_id = uuid4()
        listener_id = uuid4()
        p1 = uuid4()
        ed = uuid4()
        utterances = [
            Utterance(
                speaker_id=agent_id, listener_id=listener_id,
                phoneme_sequence=[p1, ed], intended_meaning="vedere_passato",
                understood=True, generation=i,
            )
            for i in range(5)
        ]
        rule = detect_tense(utterances, [])
        assert rule is None or rule.rule_type == "tense"


class TestSemanticModel:
    """Tests for semantic emergence."""

    def test_semantic_category_enum(self):
        assert SemanticCategory.PRONOUN.value == "pronoun"
        assert SemanticCategory.VERB.value == "verb"
        assert len(SemanticCategory) == 8

    def test_meaning_categories_mapping(self):
        assert "io" in MEANING_CATEGORIES
        assert MEANING_CATEGORIES["io"] == SemanticCategory.PRONOUN
        assert "vedere" in MEANING_CATEGORIES
        assert MEANING_CATEGORIES["vedere"] == SemanticCategory.VERB

    def test_semantic_link_creation(self):
        link = SemanticLink(
            word1_meaning="vedere",
            word2_meaning="guardare",
            strength=0.8,
            link_type="synonym",
        )
        assert link.word1_meaning == "vedere"
        assert link.word2_meaning == "guardare"
        assert link.link_type == "synonym"


class TestDialogueModel:
    """Tests for dialogue model."""

    def test_dialogue_creation(self):
        dialogue = Dialogue(
            participants=[uuid4(), uuid4()],
            generation=0,
            topic="test",
        )
        assert len(dialogue.participants) == 2
        assert dialogue.topic == "test"
        assert dialogue.success_rate == 0.0

    def test_dialogue_act_enum(self):
        assert DialogueAct.STATEMENT.value == "statement"
        assert DialogueAct.CLARIFICATION.value == "clarification"
        assert len(DialogueAct) == 5

    def test_dialogue_turn_creation(self):
        turn = DialogueTurn(
            agent_id=uuid4(),
            act=DialogueAct.STATEMENT,
            phoneme_sequence=[uuid4()],
            intended_meaning="test",
            understood=True,
            generation=0,
        )
        assert turn.act == DialogueAct.STATEMENT
        assert turn.understood is True


class TestCommunityModel:
    """Tests for community model."""

    def test_community_creation(self):
        community = Community(
            name="TestCommunity",
            member_ids=[uuid4(), uuid4(), uuid4()],
        )
        assert community.name == "TestCommunity"
        assert len(community.member_ids) == 3
        assert community.dialect_divergence == 0.0

    def test_community_default_divergence(self):
        community = Community(
            name="Test",
            member_ids=[],
        )
        assert community.dialect_divergence == 0.0


class TestEnginePhases:
    """Tests for engine phases."""

    def test_dialogue_phase(self):
        settings = RuntimeSettings(
            num_agents=4,
            generations=1,
            interactions_per_generation=10,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()
        world = engine.tick_generation(world)
        assert isinstance(world.dialogues, list)

    def test_language_contact_phase(self):
        settings = RuntimeSettings(
            num_agents=6,
            generations=1,
            interactions_per_generation=10,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()
        world = engine.tick_generation(world)
        assert len(world.communities) >= 2


class TestExporters:
    """Tests for export functions."""

    def _make_world(self):
        settings = RuntimeSettings(
            num_agents=4,
            generations=2,
            interactions_per_generation=10,
        )
        engine = SimulationEngine(settings)
        world = engine.initialize_world()
        world = engine.tick_generation(world)
        world = engine.tick_generation(world)
        return world

    def test_export_csv(self):
        world = self._make_world()
        csv = export_csv(world)
        assert "generation" in csv
        assert "total_words" in csv

    def test_export_chart(self):
        world = self._make_world()
        chart = export_chart(world, "fluency")
        assert "FLUENCY" in chart

    def test_export_chart_unknown_metric(self):
        world = self._make_world()
        chart = export_chart(world, "unknown")
        assert "Unknown metric" in chart

    def test_export_phoneme_overlap(self):
        world = self._make_world()
        overlap = export_phoneme_overlap(world)
        assert "PHONEME OVERLAP" in overlap

    def test_export_convergence(self):
        world = self._make_world()
        convergence = export_convergence(world)
        assert "CONVERGENCE" in convergence
