from __future__ import annotations

import hashlib
import random

from app.agents.finance import FinanceAgent
from app.agents.founder import FounderAgent
from app.agents.market import MarketAgent
from app.agents.narrative import NarrativeReporterAgent
from app.agents.operations import OperationsAgent
from app.agents.strategy import StrategyAgent
from app.schemas import SimulationActionInput, StartupCreateInput
from app.services.memory import MemoryService
from app.services.simulation import SimulationContext, apply_cycle


class ItalianStartupSimulator:
    def __init__(
        self,
        memory: MemoryService,
        founder_agent: FounderAgent,
        market_agent: MarketAgent,
        finance_agent: FinanceAgent,
        operations_agent: OperationsAgent,
        strategy_agent: StrategyAgent,
        narrative_agent: NarrativeReporterAgent,
    ) -> None:
        self.memory = memory
        self.founder_agent = founder_agent
        self.market_agent = market_agent
        self.finance_agent = finance_agent
        self.operations_agent = operations_agent
        self.strategy_agent = strategy_agent
        self.narrative_agent = narrative_agent

    def create_startup(self, payload: StartupCreateInput) -> None:
        self.memory.create_startup(payload)

    def simulate(self, action: SimulationActionInput) -> dict[str, object] | None:
        profile_bundle = self.memory.get_startup_profile()
        state = self.memory.get_state_model()
        if not profile_bundle or state is None:
            return None

        startup = profile_bundle["startup"]
        founder = profile_bundle["founder"]
        context = SimulationContext(
            city=startup["city"],
            region=startup["region"],
            sector=startup["sector"],
            business_model=startup["business_model"],
            founder_ambition=int(founder["ambition"]),
            founder_risk_tolerance=founder["risk_tolerance"],
            founding_team=startup["founding_team"],
        )
        outcome = apply_cycle(state, context, action.decision_type, action.cycle_type, action.note)
        recent_events = [event.model_dump() for event in outcome.events]
        founder_note, conviction, discipline = self.founder_agent.interpret(founder, outcome.state.model_dump(), recent_events)
        self.memory.update_founder_profile(outcome.state.founder_stress, conviction, discipline)
        market_note = self.market_agent.summarize(startup, outcome.state.model_dump())
        finance_note = self.finance_agent.summarize({
            "runway_months": outcome.state.runway_months,
            "monthly_burn": outcome.state.monthly_burn,
            "monthly_revenue": outcome.state.monthly_revenue,
            "cash": outcome.state.cash,
        }, outcome.state.model_dump())
        ops_note = self.operations_agent.summarize(startup, outcome.state.model_dump(), recent_events[0] if recent_events else None)
        strategy_memo = self.strategy_agent.advise(startup, outcome.state.model_dump(), outcome.strategy_options)
        report_text = self.narrative_agent.report(
            startup,
            outcome.state.model_dump(),
            recent_events,
            founder_note,
            ops_note,
            market_note,
            finance_note,
        )
        self.memory.save_simulation_outcome(
            outcome.state,
            recent_events,
            outcome.strategy_options,
            report_text,
            founder_note,
            strategy_memo.model_dump(),
            decision_type=action.decision_type,
            note=action.note,
            cap_table_round=outcome.cap_table_round,
            employee_option_grant=outcome.employee_option_grant,
        )
        return self.dashboard()

    @staticmethod
    def _monte_carlo_stats(sequence: list[str], base_score: float, runs: int, noise_level: float) -> dict[str, float]:
        runs = max(1, min(runs, 200))
        noise_level = max(0.0, min(noise_level, 25.0))
        seed = int(hashlib.sha256("|".join(sequence).encode("utf-8")).hexdigest()[:16], 16)
        rng = random.Random(seed)
        samples = [base_score + rng.gauss(0.0, noise_level) for _ in range(runs)]
        samples.sort()
        return {
            "mean": round(sum(samples) / len(samples), 2),
            "p10": round(samples[max(0, int(len(samples) * 0.1) - 1)], 2),
            "p90": round(samples[min(len(samples) - 1, int(len(samples) * 0.9))], 2),
        }

    def dashboard(self) -> dict[str, object]:
        data = self.memory.dashboard()
        if data.get("market") and data.get("finance") and data.get("team"):
            data["notes"] = {
                "market": self.market_agent.summarize(data["profile"]["startup"], data["state"]),
                "finance": self.finance_agent.summarize(data["finance"], data["state"]),
                "operations": self.operations_agent.summarize(data["profile"]["startup"], data["state"], data["events"][0] if data["events"] else None),
            }
        return data

    def compare_branches(
        self,
        branch_a_decision: str,
        branch_b_decision: str,
        cycle_type: str,
        horizon: int,
        note_a: str = "",
        note_b: str = "",
    ) -> dict[str, object] | None:
        tree = self.compare_branch_tree(
            decisions=[branch_a_decision, branch_b_decision],
            cycle_type=cycle_type,
            depth=horizon,
            notes={branch_a_decision: note_a, branch_b_decision: note_b},
        )
        if tree is None:
            return None
        branches = tree["paths"][:2]
        winner = tree["winner"]
        return {
            "cycle_type": cycle_type,
            "horizon": horizon,
            "branches": [
                {
                    "label": f"Branch {chr(65 + index)}",
                    "decision": branch["sequence"][0] if branch["sequence"] else "",
                    "note": branch["notes"][0] if branch["notes"] else "",
                    "history": branch["history"],
                    "events": branch["events"],
                    "final_state": branch["final_state"],
                    "score": branch["score"],
                }
                for index, branch in enumerate(branches)
            ],
            "winner": {"label": winner["label"], "decision": winner["sequence"][0] if winner["sequence"] else "", "score": winner["score"]},
        }

    def compare_branch_tree(
        self,
        decisions: list[str],
        cycle_type: str,
        depth: int,
        notes: dict[str, str] | None = None,
        beam_width: int = 5,
        monte_carlo_runs: int = 25,
        noise_level: float = 4.0,
    ) -> dict[str, object] | None:
        profile_bundle = self.memory.get_startup_profile()
        state = self.memory.get_state_model()
        if not profile_bundle or state is None:
            return None

        startup = profile_bundle["startup"]
        founder = profile_bundle["founder"]
        context = SimulationContext(
            city=startup["city"],
            region=startup["region"],
            sector=startup["sector"],
            business_model=startup["business_model"],
            founder_ambition=int(founder["ambition"]),
            founder_risk_tolerance=founder["risk_tolerance"],
            founding_team=startup["founding_team"],
        )

        unique_decisions = []
        for decision in decisions:
            if decision and decision not in unique_decisions:
                unique_decisions.append(decision)
        if not unique_decisions:
            return None

        depth = max(1, min(depth, 3))
        notes = notes or {}
        beam_width = max(1, min(beam_width, 12))
        monte_carlo_runs = max(1, min(monte_carlo_runs, 200))
        noise_level = max(0.0, min(noise_level, 25.0))

        active_nodes = [
            {
                "label": "Start",
                "sequence": [],
                "notes": [],
                "history": [],
                "events": [],
                "final_state": state.model_dump(),
                "score": round(state.survival_probability, 2),
                "_state": state,
            }
        ]
        tree_levels: list[list[dict[str, object]]] = []
        total_expanded = 0
        for step in range(1, depth + 1):
            expanded_nodes = []
            for node in active_nodes:
                branch_state = node["_state"].model_copy(deep=True)
                for decision in unique_decisions:
                    note = notes.get(decision, "")
                    outcome = apply_cycle(branch_state, context, decision, cycle_type, note)
                    next_state = outcome.state
                    history = [*node["history"], {
                        "step": step,
                        "decision": decision,
                        "cash": next_state.cash,
                        "runway_months": next_state.runway_months,
                        "traction_score": next_state.traction_score,
                        "survival_probability": next_state.survival_probability,
                        "investor_pipeline_score": next_state.investor_pipeline_score,
                        "grant_backlog_score": next_state.grant_backlog_score,
                        "bureaucracy_backlog": next_state.bureaucracy_backlog,
                        "compliance_debt": next_state.compliance_debt,
                        "founder_equity": next_state.founder_equity,
                        "investor_equity": next_state.investor_equity,
                    }]
                    note_history = [*node["notes"], note]
                    branch_events = [*node["events"], *(event.model_dump() for event in outcome.events)]
                    score = (
                        next_state.survival_probability
                        + next_state.runway_months * 3
                        + next_state.traction_score * 0.2
                        - next_state.bureaucracy_backlog * 1.2
                        - next_state.cumulative_dilution * 0.35
                    )
                    monte_carlo = self._monte_carlo_stats([*node["sequence"], decision], score, monte_carlo_runs, noise_level)
                    expanded_nodes.append(
                        {
                            "label": " → ".join([*node["sequence"], decision]),
                            "sequence": [*node["sequence"], decision],
                            "notes": note_history,
                            "history": history,
                            "events": branch_events[-6:],
                            "final_state": next_state.model_dump(),
                            "score": round(score, 2),
                            "monte_carlo": monte_carlo,
                            "ranking_score": monte_carlo["mean"],
                            "_state": next_state,
                        }
                    )
                    total_expanded += 1
            expanded_nodes.sort(key=lambda item: item["ranking_score"], reverse=True)
            active_nodes = expanded_nodes[:beam_width]
            level_nodes = []
            for path in active_nodes:
                snapshot = path["history"][step - 1]
                level_nodes.append(
                    {
                        "path": path["label"],
                        "decision": snapshot["decision"],
                        "step": snapshot["step"],
                        "survival_probability": snapshot["survival_probability"],
                        "cash": snapshot["cash"],
                        "founder_equity": snapshot["founder_equity"],
                    }
                )
            tree_levels.append(level_nodes)

        paths = [{key: value for key, value in path.items() if key != "_state"} for path in active_nodes]
        winner = paths[0]
        return {
            "cycle_type": cycle_type,
            "depth": depth,
            "beam_width": beam_width,
            "monte_carlo_runs": monte_carlo_runs,
            "noise_level": noise_level,
            "expanded_paths": total_expanded,
            "decision_pool": unique_decisions,
            "paths": paths,
            "tree_levels": tree_levels,
            "winner": winner,
        }

    def export_history(self) -> dict[str, object]:
        return self.memory.get_export_payload()

    def export_csv_pack(self) -> bytes:
        return self.memory.build_csv_pack()

    def import_history(self, payload: dict[str, object]) -> None:
        self.memory.import_payload(payload)
