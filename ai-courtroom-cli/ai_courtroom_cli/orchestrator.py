from __future__ import annotations

from collections.abc import Callable

from .exporters import render_markdown_report
from .models import CROSS_EXAM_ROLE_ORDER, DEBATE_ROLE_ORDER, AgentMessage, CaseInput, StoredCase, Verdict
from .providers import AgentProvider
from .storage import CourtroomStorage


ProgressCallback = Callable[[str, str], None]


class TrialEngine:
    def __init__(self, storage: CourtroomStorage, provider: AgentProvider) -> None:
        self.storage = storage
        self.provider = provider

    def run_trial(
        self,
        case_input: CaseInput,
        progress: ProgressCallback | None = None,
    ) -> tuple[StoredCase, list[AgentMessage], Verdict, str]:
        case = self.storage.create_case(case_input)

        self._notify(progress, "case_intake", "intake")
        intake = self.storage.add_message(
            AgentMessage(
                case_id=case.id,
                agent_role="case_intake",
                stage="intake",
                content=self.provider.generate_intake(case),
                round_index=0,
            )
        )

        openings: dict[str, str] = {}
        messages = [intake]

        for index, role in enumerate(DEBATE_ROLE_ORDER, start=1):
            self._notify(progress, role, "opening")
            content = self.provider.generate_opening(case, role)
            openings[role] = content
            messages.append(
                self.storage.add_message(
                    AgentMessage(
                        case_id=case.id,
                        agent_role=role,
                        stage="opening",
                        content=content,
                        round_index=index,
                    )
                )
            )

        for index, role in enumerate(CROSS_EXAM_ROLE_ORDER, start=1):
            self._notify(progress, role, "cross_exam")
            messages.append(
                self.storage.add_message(
                    AgentMessage(
                        case_id=case.id,
                        agent_role=role,
                        stage="cross_exam",
                        content=self.provider.generate_cross_exam(case, role, openings),
                        round_index=index,
                    )
                )
            )

        self._notify(progress, "judge", "summary")
        judge_summary = self.storage.add_message(
            AgentMessage(
                case_id=case.id,
                agent_role="judge",
                stage="summary",
                content=self.provider.generate_judge_summary(case, messages),
                round_index=99,
            )
        )
        messages.append(judge_summary)

        self._notify(progress, "judge", "verdict")
        verdict = self.provider.generate_verdict(case, messages)
        verdict = self.storage.save_verdict(verdict)
        report = render_markdown_report(case, messages, verdict)
        self.storage.save_report(case.id, "markdown", report)
        self.storage.update_case_status(case.id, "complete")
        case.status = "complete"
        self.storage.upsert_session(case.id, case.title)
        return case, messages, verdict, report

    def load_case_bundle(
        self,
        case_id: int,
    ) -> tuple[StoredCase | None, list[AgentMessage], Verdict | None, str | None]:
        case = self.storage.get_case(case_id)
        messages = self.storage.get_messages(case_id)
        verdict = self.storage.get_verdict(case_id)
        report = self.storage.get_latest_report(case_id, "markdown")
        if case:
            self.storage.upsert_session(case.id, case.title)
        return case, messages, verdict, report

    def _notify(self, progress: ProgressCallback | None, role: str, stage: str) -> None:
        if progress:
            progress(role, stage)