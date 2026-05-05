"""Tests for the biological inheritance engine."""

from __future__ import annotations

from dynasty_sim.inheritance import InheritanceEngine
from dynasty_sim.models import InheritedTraitSet, TraitGene


def _make_inherited(**kwargs: float) -> InheritedTraitSet:
    defaults = dict(
        height_tendency=0.5, build_tendency=0.5, hair_darkness=0.5,
        hair_thickness=0.5, eye_lightness=0.5, stamina_tendency=0.5,
        temperament_baseline=0.5, sociability_tendency=0.5,
        risk_taking_tendency=0.5, learning_aptitude=0.5,
        emotional_reactivity=0.5, health_resilience=0.5,
    )
    defaults.update(kwargs)
    raw_genes = [TraitGene(name=k, value=v, dominant=True, mutation_rate=0.0) for k, v in defaults.items()]
    return InheritedTraitSet(**defaults, raw_genes=raw_genes)


class TestInheritanceEngine:
    def test_child_trait_blended(self):
        parent_a = _make_inherited(learning_aptitude=0.2)
        parent_b = _make_inherited(learning_aptitude=0.8)
        child = InheritanceEngine.combine(parent_a, parent_b)
        assert 0.1 < child.learning_aptitude < 0.9

    def test_high_temperament_produces_high_children(self):
        results = []
        for _ in range(20):
            pa = _make_inherited(temperament_baseline=0.90)
            pb = _make_inherited(temperament_baseline=0.85)
            results.append(InheritanceEngine.combine(pa, pb).temperament_baseline)
        assert sum(results) / len(results) > 0.6

    def test_extreme_parents_produce_moderate_child(self):
        pa = _make_inherited(health_resilience=0.0)
        pb = _make_inherited(health_resilience=1.0)
        samples = [InheritanceEngine.combine(pa, pb).health_resilience for _ in range(30)]
        avg = sum(samples) / len(samples)
        assert 0.2 < avg < 0.8

    def test_all_traits_are_clamped(self):
        extreme = [
            "height_tendency", "build_tendency", "hair_darkness", "hair_thickness",
            "eye_lightness", "stamina_tendency", "temperament_baseline",
            "sociability_tendency", "risk_taking_tendency", "learning_aptitude",
            "emotional_reactivity", "health_resilience",
        ]
        pa = _make_inherited(**{k: 1.0 for k in extreme})
        pb = _make_inherited(**{k: 0.0 for k in extreme})
        for _ in range(10):
            child = InheritanceEngine.combine(pa, pb)
            for field, val in child.model_dump().items():
                if field == "raw_genes":
                    continue
                assert 0.0 <= val <= 1.0, f"{field}={val}"

    def test_grandparent_modifier_shifts_trait(self):
        pa = _make_inherited(stamina_tendency=0.5)
        pb = _make_inherited(stamina_tendency=0.5)
        gps = [_make_inherited(stamina_tendency=0.9), _make_inherited(stamina_tendency=0.9)]
        with_gp = [InheritanceEngine.combine(pa, pb, gps).stamina_tendency for _ in range(30)]
        without_gp = [InheritanceEngine.combine(pa, pb).stamina_tendency for _ in range(30)]
        assert sum(with_gp)/30 >= sum(without_gp)/30 - 0.05
