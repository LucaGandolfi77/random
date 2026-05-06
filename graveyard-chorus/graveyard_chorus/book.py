from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from pathlib import Path
import re

from pydantic import BaseModel, Field

from .client import LLMResult, OpenRouterClient
from .config import RuntimeSettings
from .models import ChronicleEntry, Epitaph, TownState
from .persistence import load_state, save_json

logger = logging.getLogger(__name__)


class BookPoemDraft(BaseModel):
    title: str
    text: str
    source_character_names: list[str] = Field(default_factory=list)
    source_event_titles: list[str] = Field(default_factory=list)


@dataclass(slots=True)
class PoetrySituation:
    kind: str
    title: str
    summary: str
    year: int | None
    mood: str
    character_names: list[str]
    event_titles: list[str]
    contradictions: list[str]


@dataclass(slots=True)
class PoetryBookPoem:
    situation_kind: str
    situation_title: str
    year: int | None
    title: str
    text: str
    actual_model: str | None
    source_character_names: list[str]
    source_event_titles: list[str]


@dataclass(slots=True)
class PoetryBookResult:
    source_state_path: Path
    run_dir: Path
    markdown_path: Path
    metadata_path: Path
    title: str
    poem_count: int
    epitaph_count: int
    used_llm: bool
    composition_models: list[str]
    editorial_model: str | None
    selected_run_from_archive_root: bool = False


def resolve_book_source(source: Path) -> tuple[Path, TownState, Path, bool]:
    if source.is_file():
        return source, load_state(source), source.parent, False

    direct_state_path = source / "town_state.json"
    if direct_state_path.exists():
        return direct_state_path, load_state(direct_state_path), source, False

    candidate_dirs = sorted(
        [path for path in source.iterdir() if path.is_dir() and (path / "town_state.json").exists()],
        key=lambda path: path.name,
        reverse=True,
    )
    if not candidate_dirs:
        raise FileNotFoundError(f"Could not find a run export with town_state.json under {source}")

    selected_run_dir = candidate_dirs[0]
    selected_state_path = selected_run_dir / "town_state.json"
    return selected_state_path, load_state(selected_state_path), selected_run_dir, True


class PoetryBookBuilder:
    def __init__(self, settings: RuntimeSettings, *, client: OpenRouterClient | None = None) -> None:
        self.settings = settings
        self.client = client

    def build_from_source(
        self,
        source: Path,
        *,
        title: str | None = None,
        output_path: Path | None = None,
        max_poems: int = 6,
        max_epitaphs: int = 8,
    ) -> PoetryBookResult:
        state_path, state, run_dir, selected_from_archive_root = resolve_book_source(source)
        markdown_path = output_path or run_dir / "poetry_book.md"
        metadata_path = markdown_path.with_suffix(".json")

        situations = self._select_situations(state, max_poems=max_poems)
        poems: list[PoetryBookPoem] = []
        composition_models: list[str] = []
        for situation in situations:
            poem = self._compose_poem(state, situation)
            poems.append(poem)
            if poem.actual_model and poem.actual_model not in composition_models:
                composition_models.append(poem.actual_model)

        selected_epitaphs = self._select_epitaphs(state, max_epitaphs=max_epitaphs)
        book_title = title or f"Songs from {state.town_name}"
        raw_markdown = self._render_book_markdown(
            state,
            title=book_title,
            poems=poems,
            epitaphs=selected_epitaphs,
            source_state_path=state_path,
            run_dir=run_dir,
        )
        edited_markdown, editorial_model = self._copyedit_book_markdown(raw_markdown)

        markdown_path.write_text(edited_markdown, encoding="utf-8")
        metadata = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "title": book_title,
            "source_state_path": str(state_path),
            "run_dir": str(run_dir),
            "selected_run_from_archive_root": selected_from_archive_root,
            "used_llm": bool(self.client and self.client.enabled),
            "composition_models": composition_models,
            "editorial_model": editorial_model,
            "poem_count": len(poems),
            "epitaph_count": len(selected_epitaphs),
            "poems": [
                {
                    "situation_kind": poem.situation_kind,
                    "situation_title": poem.situation_title,
                    "year": poem.year,
                    "title": poem.title,
                    "actual_model": poem.actual_model,
                    "source_character_names": poem.source_character_names,
                    "source_event_titles": poem.source_event_titles,
                }
                for poem in poems
            ],
            "epitaph_names": [epitaph.character_name for epitaph in selected_epitaphs],
        }
        save_json(metadata, metadata_path)

        return PoetryBookResult(
            source_state_path=state_path,
            run_dir=run_dir,
            markdown_path=markdown_path,
            metadata_path=metadata_path,
            title=book_title,
            poem_count=len(poems),
            epitaph_count=len(selected_epitaphs),
            used_llm=bool(self.client and self.client.enabled),
            composition_models=composition_models,
            editorial_model=editorial_model,
            selected_run_from_archive_root=selected_from_archive_root,
        )

    def _select_situations(self, state: TownState, *, max_poems: int) -> list[PoetrySituation]:
        max_poems = max(3, max_poems)
        situations: list[PoetrySituation] = [self._build_overture_situation(state)]

        body_slots = max(1, max_poems - 2)
        chronicles = sorted(state.chronicles, key=self._chronicle_score, reverse=True)[:body_slots]
        chronicles = sorted(chronicles, key=lambda item: item.year)
        situations.extend(self._build_chronicle_situation(state, chronicle) for chronicle in chronicles)
        situations.append(self._build_coda_situation(state))
        return situations

    @staticmethod
    def _chronicle_score(chronicle: ChronicleEntry) -> tuple[float, int, int]:
        score = len(chronicle.contradictions) * 3 + len(chronicle.linked_character_ids) + len(chronicle.linked_event_ids)
        return score, chronicle.year, len(chronicle.summary)

    def _build_overture_situation(self, state: TownState) -> PoetrySituation:
        summary_parts = [
            f"{state.town_name} moves between districts {', '.join(state.districts)}.",
            f"Its long feuds include {', '.join(state.long_running_feuds) or 'no public feud recorded'}.",
            f"Its active gossip themes include {', '.join(state.gossip_themes[-5:]) or 'no steady gossip theme'}.",
        ]
        if state.chronicles:
            summary_parts.append(f"The yearly public record begins in {state.chronicles[0].year} and ends in {state.chronicles[-1].year}.")
        return PoetrySituation(
            kind="overture",
            title=f"Overture for {state.town_name}",
            summary=" ".join(summary_parts),
            year=None,
            mood=state.chronicles[-1].mood if state.chronicles else "watchful",
            character_names=[],
            event_titles=[],
            contradictions=state.long_running_feuds[:2],
        )

    def _build_chronicle_situation(self, state: TownState, chronicle: ChronicleEntry) -> PoetrySituation:
        character_names = [
            state.characters[character_id].full_name
            for character_id in chronicle.linked_character_ids
            if character_id in state.characters
        ]
        event_titles = []
        event_lookup = {event.id: event.title for event in [*state.life_events, *state.town_events]}
        for event_id in chronicle.linked_event_ids:
            if event_id in event_lookup:
                event_titles.append(event_lookup[event_id])
        return PoetrySituation(
            kind="chronicle",
            title=self._clean_title_like_text(chronicle.title) or f"Chronicle of {chronicle.year}",
            summary=chronicle.summary,
            year=chronicle.year,
            mood=chronicle.mood,
            character_names=character_names,
            event_titles=event_titles,
            contradictions=chronicle.contradictions,
        )

    def _build_coda_situation(self, state: TownState) -> PoetrySituation:
        deceased_names = [character.full_name for character in state.deceased_characters()[:6]]
        shared_motifs = state.cemetery.shared_motifs[:8] if state.cemetery else []
        summary_parts = [
            f"The cemetery now holds {len(state.cemetery.epitaphs) if state.cemetery else 0} epitaphs.",
            f"The dead most recently include {', '.join(deceased_names) or 'no named dead'}.",
            f"Shared motifs include {', '.join(shared_motifs) or 'no recorded motif'}.",
        ]
        return PoetrySituation(
            kind="coda",
            title=f"Coda under the lamps of {state.town_name}",
            summary=" ".join(summary_parts),
            year=state.current_year,
            mood=state.chronicles[-1].mood if state.chronicles else "haunted",
            character_names=deceased_names,
            event_titles=[epitaph.character_name for epitaph in (state.cemetery.epitaphs[:4] if state.cemetery else [])],
            contradictions=[],
        )

    def _select_epitaphs(self, state: TownState, *, max_epitaphs: int) -> list[Epitaph]:
        if not state.cemetery:
            return []
        ranked = sorted(
            state.cemetery.epitaphs,
            key=lambda epitaph: (
                len(epitaph.hidden_truths),
                len(epitaph.referenced_character_ids),
                len(epitaph.public_contradictions),
                epitaph.year_written,
            ),
            reverse=True,
        )
        return ranked[: max(1, max_epitaphs)]

    def _compose_poem(self, state: TownState, situation: PoetrySituation) -> PoetryBookPoem:
        if self.client and self.client.enabled:
            try:
                draft, result = self.client.complete_json(
                    system_prompt=(
                        "You are the Graveyard Chorus Book Poet Agent. "
                        "Write an original English-only poem grounded in the supplied exported situation. "
                        "Be lyrical, precise, and formally coherent. "
                        "Do not invent names, events, or relationships beyond the supplied facts. "
                        "Do not imitate copyrighted lines."
                    ),
                    user_prompt=self._poem_prompt(state, situation),
                    schema_model=BookPoemDraft,
                    model=state.config.primary_model,
                    temperature=0.75,
                    max_tokens=720,
                )
                title, text = self._normalize_poem_fields(situation, draft.title, draft.text)
                return PoetryBookPoem(
                    situation_kind=situation.kind,
                    situation_title=situation.title,
                    year=situation.year,
                    title=title,
                    text=text,
                    actual_model=result.model_used,
                    source_character_names=draft.source_character_names or situation.character_names,
                    source_event_titles=draft.source_event_titles or situation.event_titles,
                )
            except Exception as exc:
                logger.warning("Poetry book poem generation failed | title=%s | error=%s", situation.title, exc)

        draft = self._deterministic_poem(state, situation)
        return PoetryBookPoem(
            situation_kind=situation.kind,
            situation_title=situation.title,
            year=situation.year,
            title=draft.title,
            text=draft.text,
            actual_model=None,
            source_character_names=draft.source_character_names,
            source_event_titles=draft.source_event_titles,
        )

    def _poem_prompt(self, state: TownState, situation: PoetrySituation) -> str:
        return "\n".join(
            [
                f"Town: {state.town_name}",
                f"Situation kind: {situation.kind}",
                f"Situation title: {situation.title}",
                f"Year: {situation.year if situation.year is not None else 'span of the whole run'}",
                f"Mood: {situation.mood}",
                f"Summary: {situation.summary}",
                f"Named characters: {', '.join(situation.character_names) if situation.character_names else 'No named character is required.'}",
                f"Linked event titles: {', '.join(situation.event_titles) if situation.event_titles else 'No event title needs to be quoted directly.'}",
                f"Contradictions or tensions: {', '.join(situation.contradictions) if situation.contradictions else 'No explicit contradiction is required.'}",
                "Return JSON with these keys only:",
                "- title",
                "- text",
                "- source_character_names",
                "- source_event_titles",
                "Constraints:",
                "- English only.",
                "- 10 to 22 lines.",
                "- Preserve factual grounding.",
                "- Prefer clean free verse or lightly formal lyric structure.",
                "- Let the poem feel like it belongs to the same town as the epitaphs.",
            ]
        )

    def _deterministic_poem(self, state: TownState, situation: PoetrySituation) -> BookPoemDraft:
        contradiction = situation.contradictions[0] if situation.contradictions else "someone still misnamed the burden"
        event_line = situation.event_titles[0] if situation.event_titles else situation.title
        named = ", ".join(situation.character_names[:3]) if situation.character_names else state.town_name
        year_phrase = f"In {situation.year}" if situation.year is not None else "Across the run"
        lines = [
            f"{year_phrase}, {state.town_name} kept its weather close to the mouth.",
            f"{situation.summary}",
            f"{named} moved through it as if witness were another trade.",
            f"The town still says {event_line} when it wants memory to sound orderly.",
            f"But {contradiction.lower()} kept leaking through the public cloth.",
            f"What survived was not peace but a rhythm the dead could overhear.",
        ]
        return BookPoemDraft(
            title=situation.title,
            text="\n".join(lines),
            source_character_names=situation.character_names,
            source_event_titles=situation.event_titles,
        )

    def _normalize_poem_fields(self, situation: PoetrySituation, raw_title: str, raw_text: str) -> tuple[str, str]:
        title_lines = [self._clean_title_like_text(line) for line in raw_title.splitlines() if self._clean_title_like_text(line)]
        fallback_title = self._clean_title_like_text(situation.title) or "Untitled Poem"
        title = title_lines[0] if title_lines else fallback_title
        if sum(character.isalnum() for character in title) < 4 or title in {"...", "..", ".", "…"}:
            title = fallback_title
        title = title.rstrip(" ,;:-")
        if "..." in title or "…" in title:
            title = fallback_title
        if title.casefold().startswith(fallback_title.casefold()) and len(title) > len(fallback_title) + 32:
            title = fallback_title
        if len(title) > 120:
            title = title[:117].rstrip(" ,;:-") + "..."

        overflow_title_text = "\n".join(title_lines[1:]).strip()
        text = raw_text.strip()
        if overflow_title_text and overflow_title_text not in text:
            text = overflow_title_text + ("\n\n" + text if text else "")
        text = self._sanitize_poem_text(situation, title, text)
        if not text:
            text = self._deterministic_poem(state=self._empty_state_for_fallback(situation), situation=situation).text
        return title, text

    def _sanitize_poem_text(self, situation: PoetrySituation, title: str, text: str) -> str:
        if not text:
            return ""

        normalized_title = self._clean_title_like_text(title)
        normalized_situation_title = self._clean_title_like_text(situation.title)
        cleaned_lines: list[str] = []
        previous_blank = False
        for raw_line in text.splitlines():
            stripped = raw_line.strip()
            normalized_line = self._clean_title_like_text(stripped.lstrip("#")) if stripped else ""
            should_drop = (
                stripped.startswith("Source Character Names:")
                or stripped.startswith("Source Event Titles:")
                or stripped.startswith("Constraints:")
                or stripped.startswith("*Note:")
                or stripped.startswith("— Graveyard Chorus Book Poet Agent")
                or stripped == "Poem:"
                or stripped == normalized_title
                or stripped == normalized_situation_title
                or normalized_line in {normalized_title, normalized_situation_title}
            )
            if should_drop:
                continue

            if not stripped:
                if previous_blank:
                    continue
                cleaned_lines.append("")
                previous_blank = True
                continue

            cleaned_lines.append(raw_line.rstrip())
            previous_blank = False

        return "\n".join(cleaned_lines).strip()

    @staticmethod
    def _clean_title_like_text(value: str) -> str:
        cleaned = value.strip().strip("#*")
        cleaned = cleaned.lstrip(":- ")
        return " ".join(cleaned.split())

    @staticmethod
    def _empty_state_for_fallback(situation: PoetrySituation) -> TownState:
        return TownState(town_name="Unknown Town", current_year=situation.year or 0)

    def _copyedit_book_markdown(self, markdown: str) -> tuple[str, str | None]:
        if not self.client or not self.client.enabled:
            return markdown, None

        try:
            first_pass_markdown, first_pass_model = self._run_copyedit_pass(
                markdown,
                system_prompt=(
                    "You are the Graveyard Chorus Line Editor Agent. "
                    "Correct spelling, syntax, punctuation, typography, and obvious formal roughness in the markdown book you receive. "
                    "Preserve names, years, facts, section headings, and the overall lyrical register. "
                    "Return only corrected markdown."
                ),
                instructions=(
                    "Edit the following markdown book.\n"
                    "This is pass 1 of 2: conservative proofreading.\n"
                    "Do not add scenes or facts.\n"
                    "Keep the language English only.\n"
                    "Preserve headings and bullet metadata.\n"
                ),
                temperature=0.1,
            )

            second_pass_markdown, second_pass_model = self._run_copyedit_pass(
                first_pass_markdown,
                system_prompt=(
                    "You are the Graveyard Chorus Verse Finisher Agent. "
                    "Perform a stricter second editorial pass on an already proofread markdown poetry book. "
                    "Reduce leftover stylistic roughness from small free models: tighten awkward phrasing, remove accidental repetition, smooth clumsy lineation, normalize punctuation, and clean markdown consistency. "
                    "Preserve every heading, name, year, event, epitaph truth, and bullet metadata line. "
                    "Do not add scenes, do not delete sections, and do not rewrite factual content. "
                    "Return only corrected markdown."
                ),
                instructions=(
                    "Edit the following markdown book.\n"
                    "This is pass 2 of 2: stricter stylistic polish.\n"
                    "Keep all section headings, bullet labels, names, years, and factual references intact.\n"
                    "Focus on cadence, duplicate phrasing, stray punctuation, broken typography, and rough line breaks that can be improved without changing meaning.\n"
                    "Keep the language English only.\n"
                ),
                temperature=0.05,
            )
            return second_pass_markdown, second_pass_model or first_pass_model
        except Exception as exc:
            logger.warning("Poetry book copyedit failed | error=%s", exc)
            return markdown, None

    def _run_copyedit_pass(
        self,
        markdown: str,
        *,
        system_prompt: str,
        instructions: str,
        temperature: float,
    ) -> tuple[str, str | None]:
        if not self.client:
            return markdown, None

        result = self.client.complete_text(
            system_prompt=system_prompt,
            user_prompt=(
                f"{instructions}"
                "BOOK MARKDOWN:\n"
                f"{markdown}"
            ),
            model=self.settings.primary_model,
            temperature=temperature,
            max_tokens=max(1800, min(5200, len(markdown) // 4 + 900)),
        )
        return self._sanitize_copyedited_markdown(result.text, fallback=markdown), result.model_used

    @staticmethod
    def _sanitize_copyedited_markdown(text: str, *, fallback: str) -> str:
        cleaned = text.strip()
        if not cleaned:
            return fallback

        fence_match = re.fullmatch(r"```(?:markdown)?\s*(.*?)```", cleaned, re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        first_heading_index = cleaned.find("# ")
        if first_heading_index > 0:
            cleaned = cleaned[first_heading_index:].lstrip()

        cleaned_lines: list[str] = []
        previous_blank = False
        lines = cleaned.splitlines()
        for index, raw_line in enumerate(lines):
            stripped = raw_line.strip()
            next_non_empty = ""
            for candidate in lines[index + 1 :]:
                candidate_stripped = candidate.strip()
                if candidate_stripped:
                    next_non_empty = candidate_stripped
                    break

            is_prompt_leak = (
                stripped.startswith("Source Character Names:")
                or stripped.startswith("Source Event Titles:")
                or stripped.startswith("Constraints:")
                or stripped.startswith("*Note:")
                or stripped.startswith("— Graveyard Chorus Book Poet Agent")
                or stripped.startswith("#### ")
                or (
                    stripped.startswith("**")
                    and stripped.endswith("**")
                    and next_non_empty.startswith("- Situation:")
                )
            )
            if is_prompt_leak:
                continue

            if not stripped:
                if previous_blank:
                    continue
                cleaned_lines.append("")
                previous_blank = True
                continue

            cleaned_lines.append(raw_line.rstrip())
            previous_blank = False

        cleaned = "\n".join(cleaned_lines).strip()
        return cleaned or fallback

    def _render_book_markdown(
        self,
        state: TownState,
        *,
        title: str,
        poems: list[PoetryBookPoem],
        epitaphs: list[Epitaph],
        source_state_path: Path,
        run_dir: Path,
    ) -> str:
        lines = [
            f"# {title}",
            "",
            f"A poetry-and-epitaph book assembled from the exported run of {state.town_name}.",
            "",
            f"- Source run: {run_dir.name}",
            f"- Source state: {source_state_path.name}",
            f"- Span: {state.config.start_year} to {state.current_year}",
            f"- Poems composed from exported situations: {len(poems)}",
            f"- Epitaphs included: {len(epitaphs)}",
            "",
            "## Prelude and Situation Poems",
            "",
        ]

        for poem in poems:
            lines.extend(
                [
                    f"### {poem.title}",
                    "",
                    poem.text,
                    "",
                    f"- Situation: {poem.situation_title}",
                    f"- Year: {poem.year if poem.year is not None else 'whole-run atmosphere'}",
                    f"- Model: {poem.actual_model or 'deterministic fallback'}",
                    f"- Grounded characters: {', '.join(poem.source_character_names) if poem.source_character_names else 'None required'}",
                    f"- Grounded events: {', '.join(poem.source_event_titles) if poem.source_event_titles else 'None required'}",
                    "",
                ]
            )

        lines.extend(["## Cemetery Voices", ""])
        if not epitaphs:
            lines.append("No epitaphs were available in the exported state.")
            lines.append("")
        else:
            for epitaph in epitaphs:
                lines.extend(
                    [
                        f"### {epitaph.character_name}",
                        "",
                        epitaph.text,
                        "",
                        f"- Mood: {epitaph.mood}",
                        f"- Hidden truths: {', '.join(epitaph.hidden_truths) if epitaph.hidden_truths else 'None surfaced'}",
                        f"- Public contradictions: {', '.join(epitaph.public_contradictions) if epitaph.public_contradictions else 'None archived'}",
                        f"- Model: {epitaph.actual_model or 'deterministic or prior fallback'}",
                        "",
                    ]
                )

        lines.extend(
            [
                "## Closing Note",
                "",
                "These poems were assembled from exported public chronicles, cemetery voices, and the recorded shape of the town's memory.",
                "They are not generic prompts detached from the simulation; they are grounded in the run's own names, years, scandals, and weather.",
                "",
            ]
        )
        return "\n".join(lines).strip() + "\n"


def extract_book_markdown_from_prompt(user_prompt: str) -> str:
    marker = "BOOK MARKDOWN:\n"
    if marker not in user_prompt:
        return user_prompt
    return user_prompt.split(marker, 1)[1]