from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .models import Character, Family, LifeEvent, MemoryRecord, TownEvent, TownState

SEASON_ORDER = {"spring": 0, "summer": 1, "autumn": 2, "winter": 3}


@dataclass(frozen=True, slots=True)
class MemoryHit:
    memory: MemoryRecord
    score: float
    source: str


class MemoryStore:
    def remember_character(self, character: Character, memory: MemoryRecord, *, limit: int) -> None:
        character.memories.append(memory)
        character.memories = self._trim(character.memories, limit)

    def remember_family(self, family: Family, memory: MemoryRecord, *, limit: int) -> None:
        family.collective_memory.append(memory)
        family.collective_memory = self._trim(family.collective_memory, limit)

    def remember_town(self, state: TownState, memory: MemoryRecord, *, limit: int) -> None:
        state.collective_memory.append(memory)
        state.collective_memory = self._trim(state.collective_memory, limit * 3)

    def imprint_life_event(self, state: TownState, event: LifeEvent) -> None:
        for participant_id in event.participant_ids:
            character = state.characters.get(participant_id)
            if character is None:
                continue
            memory = MemoryRecord(
                origin="self",
                year=event.year,
                season=event.season,
                category=event.event_type,
                summary=event.description,
                emotional_weight=max(0.35, event.impact),
                participants=event.participant_ids,
                public=event.public,
                source_event_id=event.id,
                tags=event.tags,
            )
            self.remember_character(character, memory, limit=state.config.memory_limit)

            family = state.families.get(character.family_id)
            if family is not None:
                family_memory = memory.model_copy(
                    update={
                        "origin": "family",
                        "summary": f"The {family.name} family remembers: {event.title}.",
                    }
                )
                self.remember_family(family, family_memory, limit=state.config.memory_limit)

        if event.public:
            town_memory = MemoryRecord(
                origin="town",
                year=event.year,
                season=event.season,
                category=event.event_type,
                summary=f"The town remembers {event.title.lower()}.",
                emotional_weight=max(0.25, event.impact),
                participants=event.participant_ids,
                public=True,
                source_event_id=event.id,
                tags=event.tags,
            )
            self.remember_town(state, town_memory, limit=state.config.memory_limit)

    def imprint_town_event(self, state: TownState, event: TownEvent) -> None:
        town_memory = MemoryRecord(
            origin="town",
            year=event.year,
            season=event.season,
            category="town_event",
            summary=event.description,
            emotional_weight=max(0.2, event.public_impact),
            public=True,
            tags=event.tags,
        )
        self.remember_town(state, town_memory, limit=state.config.memory_limit)

        for family_id in event.family_ids:
            family = state.families.get(family_id)
            if family is None:
                continue
            family_memory = town_memory.model_copy(
                update={
                    "origin": "family",
                    "summary": f"The {family.name} family was marked by {event.title.lower()}.",
                }
            )
            self.remember_family(family, family_memory, limit=state.config.memory_limit)

    def retrieve(
        self,
        state: TownState,
        character: Character,
        *,
        tags: Iterable[str] | None = None,
        participant_ids: Iterable[str] | None = None,
        limit: int = 6,
    ) -> list[MemoryRecord]:
        tag_set = {item.lower() for item in tags or []}
        participant_set = set(participant_ids or [])
        hits: list[MemoryHit] = []

        for memory in character.memories:
            hits.append(MemoryHit(memory=memory, score=self._score(memory, state.current_year, tag_set, participant_set), source="self"))

        family = state.families.get(character.family_id)
        if family is not None:
            for memory in family.collective_memory:
                hits.append(
                    MemoryHit(
                        memory=memory,
                        score=self._score(memory, state.current_year, tag_set, participant_set) * 0.88,
                        source="family",
                    )
                )

        for memory in state.collective_memory:
            hits.append(
                MemoryHit(
                    memory=memory,
                    score=self._score(memory, state.current_year, tag_set, participant_set) * 0.74,
                    source="town",
                )
            )

        hits.sort(key=lambda hit: (hit.score, hit.memory.emotional_weight, hit.memory.year, SEASON_ORDER[hit.memory.season]), reverse=True)
        unique: list[MemoryRecord] = []
        seen: set[str] = set()
        for hit in hits:
            if hit.memory.id in seen:
                continue
            unique.append(hit.memory)
            seen.add(hit.memory.id)
            if len(unique) >= limit:
                break
        return unique

    def summarize_character(self, character: Character, *, current_year: int, memory_limit: int) -> MemoryRecord | None:
        if len(character.memories) <= memory_limit:
            return None

        character.memories.sort(key=lambda memory: (memory.year, SEASON_ORDER[memory.season]))
        archived = character.memories[:-memory_limit + 1]
        retained = character.memories[-memory_limit + 1 :]
        summary_bits = "; ".join(memory.summary for memory in archived[:4])
        summary_tags = sorted({tag for memory in archived for tag in memory.tags})[:6]
        summary_memory = MemoryRecord(
            origin="self",
            year=archived[-1].year,
            season=archived[-1].season,
            category="summary",
            summary=f"Years folded together into one ache: {summary_bits}",
            emotional_weight=max(memory.emotional_weight for memory in archived),
            participants=sorted({participant for memory in archived for participant in memory.participants}),
            public=False,
            tags=summary_tags,
            reflection=f"By {current_year}, {character.given_name} remembered these years as one long chapter.",
        )
        character.memories = [summary_memory, *retained]
        return summary_memory

    def _score(
        self,
        memory: MemoryRecord,
        current_year: int,
        tags: set[str],
        participant_ids: set[str],
    ) -> float:
        age = max(0, current_year - memory.year)
        recency = max(0.0, 6.0 - age) * 0.24 + memory.recency_weight
        emotional = memory.emotional_weight * 1.4
        tag_overlap = len(tags.intersection({tag.lower() for tag in memory.tags})) * 0.9
        participant_overlap = len(participant_ids.intersection(memory.participants)) * 0.7
        contradiction_bonus = 0.45 if memory.contradictory_to_public_story else 0.0
        return recency + emotional + tag_overlap + participant_overlap + contradiction_bonus

    @staticmethod
    def _trim(memories: list[MemoryRecord], limit: int) -> list[MemoryRecord]:
        memories.sort(key=lambda memory: (memory.year, SEASON_ORDER[memory.season], memory.emotional_weight), reverse=True)
        return memories[:limit]