from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import random

from .agents import (
    CharacterLifeAgent,
    ConsistencyReviewerAgent,
    EpitaphPoetAgent,
    FamilyChronicleAgent,
    MemorySummarizerAgent,
    RelationshipCuratorAgent,
    TownHistorianAgent,
)
from .client import OpenRouterClient
from .config import RuntimeSettings, SEASONS
from .memory import MemoryStore
from .models import Character, CemeteryRecord, LifeEvent, MemoryRecord, ReputationProfile, TownEvent, TownState
from .seeds import load_seed_state

GIVEN_NAMES = {
    "woman": ["Anna", "Beatrice", "Clara", "Della", "Evelyn", "Iris", "June", "Lucy", "Mabel", "Nora"],
    "man": ["Arthur", "Bennett", "Elias", "Frank", "Gideon", "Julian", "Martin", "Otis", "Samuel", "Walter"],
}
TOWN_EVENT_CATALOG = {
    "spring": [
        {
            "title": "The Thaw Market reopened credit and appetite",
            "description": "Merchants extended trust on thin margins, and old arguments returned with the river road.",
            "district": "River Reach",
            "institution": "town hall",
            "public_impact": 0.36,
            "economic_shift": "spring credit loosened for one hopeful month",
            "gossip_theme": "dowries",
            "tags": ["festival", "trade"],
        },
        {
            "title": "The council reopened the sluice dispute",
            "description": "At town hall the old quarrel over the mill sluice was argued again, with the Harrows and Vales listening as if the river kept score.",
            "district": "Mill Row",
            "institution": "town hall",
            "family_ids": ["family_harrow", "family_vale"],
            "public_impact": 0.64,
            "economic_shift": "the mill contract wavered under civic pressure",
            "gossip_theme": "water rights",
            "tags": ["politics", "feud"],
        },
    ],
    "summer": [
        {
            "title": "Lantern Regatta made the river look forgiving",
            "description": "For one night the river carried lanterns, flirtation, and the illusion that grudges could drift away without naming themselves.",
            "district": "River Reach",
            "institution": "church",
            "public_impact": 0.31,
            "gossip_theme": "courtships",
            "tags": ["festival", "romance"],
        },
        {
            "title": "A heat spell pushed the clinic past mercy",
            "description": "The heat laid children low, drew old complaints out of the bones, and made the clinic smell of vinegar and impatience.",
            "district": "Hill Ward",
            "institution": "clinic",
            "family_ids": ["family_bell"],
            "public_impact": 0.58,
            "gossip_theme": "frailty",
            "tags": ["disaster", "epidemic", "summer"],
        },
    ],
    "autumn": [
        {
            "title": "Harvest Supper staged every alliance in public",
            "description": "At the long tables, compliments sounded like contracts and silence carried more weight than the bread.",
            "district": "Hill Ward",
            "institution": "church",
            "public_impact": 0.42,
            "gossip_theme": "marriages",
            "tags": ["festival", "class"],
        },
        {
            "title": "A box of old letters surfaced behind the Blue Lantern",
            "description": "Someone found a ribbon-bound packet of letters behind the tavern shelves, and half the town began revising what it claimed to remember.",
            "district": "River Reach",
            "institution": "tavern",
            "family_ids": ["family_quill", "family_bell", "family_vale"],
            "public_impact": 0.67,
            "gossip_theme": "letters",
            "tags": ["scandal", "memory"],
        },
    ],
    "winter": [
        {
            "title": "Bell Night made widows and liars sing together",
            "description": "During Bell Night the cemetery lamps were lit, the names of the dead were read aloud, and living people behaved like witnesses to one another.",
            "district": "Cemetery Lane",
            "institution": "cemetery",
            "public_impact": 0.33,
            "gossip_theme": "ghosts",
            "tags": ["festival", "memory"],
        },
        {
            "title": "An influenza winter thinned the town's bravado",
            "description": "The cough moved house to house, making class pride look flimsy beside shared fever and shared dread.",
            "district": "Hill Ward",
            "institution": "clinic",
            "family_ids": ["family_bell", "family_harrow", "family_quill", "family_vale"],
            "public_impact": 0.74,
            "gossip_theme": "sickness",
            "tags": ["disaster", "epidemic", "winter"],
        },
    ],
}


class SimulationEngine:
    def __init__(
        self,
        state: TownState,
        *,
        settings: RuntimeSettings,
        client: OpenRouterClient | None = None,
    ) -> None:
        self.state = state
        self.settings = settings
        self.rng = random.Random(state.config.random_seed)
        self.memory_store = MemoryStore()
        self.client = client or self._build_client(settings)
        self.life_agent = CharacterLifeAgent(name="Character Life Agent", memory_store=self.memory_store, client=self.client)
        self.relationship_agent = RelationshipCuratorAgent(name="Relationship Curator Agent", memory_store=self.memory_store, client=self.client)
        self.family_agent = FamilyChronicleAgent(name="Family Chronicle Agent", memory_store=self.memory_store, client=self.client)
        self.summarizer = MemorySummarizerAgent(name="Memory Summarizer Agent", memory_store=self.memory_store, client=self.client)
        self.historian = TownHistorianAgent(name="Town Historian Agent", memory_store=self.memory_store, client=self.client)
        self.poet = EpitaphPoetAgent(name="Epitaph Poet Agent", memory_store=self.memory_store, client=self.client)
        self.reviewer = ConsistencyReviewerAgent(name="Consistency Reviewer Agent", memory_store=self.memory_store, client=self.client)

        if self.state.cemetery is None:
            self.state.cemetery = CemeteryRecord(town_name=self.state.town_name, generated_at_year=self.state.current_year)
        self._refresh_kinship_links()

    @classmethod
    def from_seed(
        cls,
        *,
        settings: RuntimeSettings,
        seed_path: Path | None = None,
        years: int | None = None,
        random_seed: int | None = None,
        llm_enabled: bool | None = None,
        offline_mode: bool | None = None,
        client: OpenRouterClient | None = None,
    ) -> "SimulationEngine":
        state = load_seed_state(
            seed_path,
            settings=settings,
            years=years,
            random_seed=random_seed,
            llm_enabled=llm_enabled,
            offline_mode=offline_mode,
        )
        return cls(state, settings=settings, client=client)

    def run(self, years: int | None = None) -> TownState:
        total_years = years or self.state.config.years_to_simulate
        for _ in range(total_years):
            self.simulate_year()
        self.state.cemetery.generated_at_year = self.state.current_year
        return self.state

    def simulate_year(self) -> None:
        year = self.state.current_year
        life_start = len(self.state.life_events)
        town_start = len(self.state.town_events)
        for season in SEASONS:
            town_event = self._generate_town_event(season)
            self.state.town_events.append(town_event)
            self.memory_store.imprint_town_event(self.state, town_event)
            self._apply_town_event_effects(town_event)

            for character in sorted(self.state.alive_characters(), key=lambda item: (item.age, item.given_name), reverse=True):
                if not character.alive:
                    continue
                decision = self.life_agent.decide(self.state, character, season, self.rng)
                event = self.relationship_agent.apply_decision(self.state, decision, season)
                self.family_agent.absorb_life_event(self.state, event)

            self._resolve_marriages()
            if season in {"spring", "summer"}:
                self._resolve_births(season)
            self._resolve_deaths(season)

        self._age_characters()
        self.relationship_agent.decay_relationships(self.state)
        self.summarizer.summarize(self.state)
        chronicle = self.historian.compose_year_entry(
            self.state,
            year=year,
            year_events=[event for event in self.state.life_events[life_start:] if event.year == year],
            year_town_events=[event for event in self.state.town_events[town_start:] if event.year == year],
        )
        self.state.chronicles.append(chronicle)
        self.state.current_year += 1

    def _generate_town_event(self, season: str) -> TownEvent:
        season_events = TOWN_EVENT_CATALOG[season]
        season_index = list(SEASONS).index(season)
        if season == "winter" and self.state.current_year % 5 == 0:
            template = season_events[1]
        elif season == "summer" and self.state.current_year % 6 == 0:
            template = season_events[1]
        elif season == "autumn" and self.state.current_year % 4 == 0:
            template = season_events[1]
        elif season == "spring" and self.state.current_year % 3 == 0:
            template = season_events[1]
        else:
            template = season_events[0]
        return TownEvent(year=self.state.current_year, season=season, **template)

    def _apply_town_event_effects(self, event: TownEvent) -> None:
        if event.economic_shift and event.economic_shift not in self.state.economic_conditions:
            self.state.economic_conditions.append(event.economic_shift)
        self.state.economic_conditions = self.state.economic_conditions[-8:]
        if event.gossip_theme and event.gossip_theme not in self.state.gossip_themes:
            self.state.gossip_themes.append(event.gossip_theme)
        self.state.gossip_themes = self.state.gossip_themes[-8:]
        if "politics" in event.tags:
            self.state.political_shifts.append(f"{event.year}: {event.title}")
            self.state.political_shifts = self.state.political_shifts[-8:]
        if "scandal" in event.tags:
            self.state.local_scandals.append(event.title)
            self.state.local_scandals = self.state.local_scandals[-8:]

    def _resolve_marriages(self) -> None:
        seen: set[tuple[str, str]] = set()
        for character in self.state.alive_characters():
            for lover_id in character.lovers:
                if lover_id not in self.state.characters:
                    continue
                partner = self.state.characters[lover_id]
                pair = tuple(sorted((character.id, partner.id)))
                if pair in seen or not partner.alive:
                    continue
                seen.add(pair)
                relation = character.relationships.get(partner.id)
                reverse = partner.relationships.get(character.id)
                if character.spouses or partner.spouses or relation is None or reverse is None:
                    continue
                if relation.intimacy + reverse.intimacy >= 0.82 and relation.trust + reverse.trust >= 0.22 and self.rng.random() < 0.42:
                    event = self.family_agent.register_marriage(self.state, character, partner)
                    self.family_agent.absorb_life_event(self.state, event)

    def _resolve_births(self, season: str) -> None:
        for left, right in self._spouse_pairs():
            if any(person.age < 20 or person.age > 43 for person in (left, right)):
                continue
            existing_children = len(set(left.children).intersection(right.children))
            chance = max(0.02, self.state.config.birth_base_chance - existing_children * 0.03)
            if self.rng.random() > chance:
                continue
            child = self._create_child(left, right)
            self.state.characters[child.id] = child
            household = self.state.households[child.household_id]
            household.member_ids.append(child.id)
            self.family_agent.register_birth(self.state, child, [left.id, right.id])
            birth_event = LifeEvent(
                year=self.state.current_year,
                season=season,
                event_type="birth",
                title=f"{child.full_name} arrived carrying several families at once",
                description=f"{child.full_name} was born, and every old loyalty in {self.state.town_name} adjusted itself around the cradle.",
                participant_ids=[child.id, left.id, right.id],
                district=household.district,
                public=True,
                impact=0.72,
                tags=["birth", "family", child.surname.lower()],
            )
            self.state.life_events.append(birth_event)
            self.memory_store.imprint_life_event(self.state, birth_event)
            self.family_agent.absorb_life_event(self.state, birth_event)
            self._refresh_kinship_links()

    def _resolve_deaths(self, season: str) -> None:
        seasonal_events = [event for event in self.state.town_events if event.year == self.state.current_year and event.season == season]
        disaster_pressure = sum(0.03 for event in seasonal_events if "disaster" in event.tags or "epidemic" in event.tags)
        for character in list(self.state.alive_characters()):
            age_pressure = max(0, character.age - 58) * 0.0032
            health_pressure = max(0.0, 1.0 - character.health) * 0.03
            winter_pressure = 0.028 if season == "winter" and character.age >= 67 else 0.0
            risk = self.state.config.death_base_chance / 4.0 + age_pressure + health_pressure + disaster_pressure + winter_pressure
            if character.age >= 82:
                risk += 0.06
            if self.rng.random() >= risk:
                continue
            cause = self._cause_of_death(character, seasonal_events)
            self.family_agent.record_death(self.state, character, season=season, cause=cause)
            epitaph = self.poet.generate(self.state, character)
            epitaph = self.reviewer.review(self.state, character, epitaph)
            self._register_epitaph(epitaph)

    def _cause_of_death(self, character: Character, seasonal_events: list[TownEvent]) -> str:
        if any("epidemic" in event.tags for event in seasonal_events):
            return "the fever took more breath than the household could spare"
        if any("disaster" in event.tags for event in seasonal_events):
            return "the season demanded more strength than the body still owned"
        if character.age >= 80:
            return "age finally collected the debt it had been extending for years"
        return "work, worry, and weather finally agreed against the body"

    def _register_epitaph(self, epitaph) -> None:
        self.state.cemetery.epitaphs.append(epitaph)
        self.state.cemetery.cross_references[epitaph.character_name] = [
            self.state.characters[character_id].full_name
            for character_id in epitaph.referenced_character_ids
            if character_id in self.state.characters
        ]
        for hidden_truth in epitaph.hidden_truths:
            motif = hidden_truth.split(" ")[0].lower().strip(",.")
            if motif and motif not in self.state.cemetery.shared_motifs:
                self.state.cemetery.shared_motifs.append(motif)
        self.state.cemetery.shared_motifs = self.state.cemetery.shared_motifs[:16]

    def _create_child(self, left: Character, right: Character) -> Character:
        mother = left if left.gender == "woman" else right if right.gender == "woman" else left
        father = right if mother.id == left.id else left
        gender = "woman" if self.rng.random() < 0.5 else "man"
        given_name = self._pick_name(gender, mother.surname)
        surname = mother.surname
        family_id = mother.family_id
        household_id = mother.household_id
        class_status = self._blend_class(left.class_status, right.class_status)
        voice_seed = f"Raised between {left.given_name}'s restraint and {right.given_name}'s appetite for feeling."
        child = Character(
            full_name=f"{given_name} {surname}",
            given_name=given_name,
            surname=surname,
            age=0,
            birth_year=self.state.current_year,
            gender=gender,
            family_id=family_id,
            lineage_branch=mother.lineage_branch,
            household_id=household_id,
            class_status=class_status,
            occupation="child",
            life_stage="child",
            family_origin=self.state.families[family_id].origin,
            desires=["belonging", "warmth"],
            fears=["hunger", "abandonment"],
            virtues=[left.virtues[0] if left.virtues else "curiosity", right.virtues[0] if right.virtues else "patience"],
            flaws=[left.flaws[0] if left.flaws else "naivete", right.flaws[0] if right.flaws else "stubbornness"],
            private_voice=voice_seed,
            public_voice="Too young to choose a public performance.",
            poetic_voice="A future voice still taking shape in the family weather.",
            biography=f"Born in {self.state.current_year} to {left.full_name} and {right.full_name}.",
            health=0.94,
            reputation=ReputationProfile(public_summary="A new child entered the town's arithmetic."),
        )
        child.parents = [mother.id, father.id]
        return child

    def _spouse_pairs(self) -> list[tuple[Character, Character]]:
        seen: set[tuple[str, str]] = set()
        pairs: list[tuple[Character, Character]] = []
        for character in self.state.alive_characters():
            for spouse_id in character.spouses:
                if spouse_id not in self.state.characters:
                    continue
                pair = tuple(sorted((character.id, spouse_id)))
                if pair in seen:
                    continue
                seen.add(pair)
                pairs.append((character, self.state.characters[spouse_id]))
        return pairs

    def _age_characters(self) -> None:
        for character in self.state.alive_characters():
            character.age += 1
            character.life_stage = self._life_stage_for_age(character.age)
            if character.age >= 52:
                character.health = max(0.24, character.health - self.rng.uniform(0.01, 0.05))
            elif character.age >= 20:
                character.health = max(0.35, min(1.0, character.health - self.rng.uniform(0.0, 0.02) + 0.01))
            if character.life_stage == "adult" and character.occupation == "child":
                character.occupation = self.rng.choice(["shop assistant", "farm hand", "clerk", "seam apprentice"])
                character.public_voice = "Trying on adulthood like a coat inherited a season too soon."

    def _refresh_kinship_links(self) -> None:
        by_parent: defaultdict[str, list[str]] = defaultdict(list)
        preserved: dict[str, dict[str, list[str]]] = {}
        for character in self.state.characters.values():
            preserved[character.id] = {
                "siblings": list(character.siblings),
                "grandparents": list(character.grandparents),
                "cousins": list(character.cousins),
            }
            character.siblings = []
            character.grandparents = []
            character.cousins = []
            for parent_id in character.parents:
                by_parent[parent_id].append(character.id)

        for parent_id, child_ids in by_parent.items():
            parent = self.state.characters.get(parent_id)
            if parent is None:
                continue
            for child_id in child_ids:
                child = self.state.characters[child_id]
                for grandparent_id in parent.parents:
                    if grandparent_id not in child.grandparents:
                        child.grandparents.append(grandparent_id)
                for sibling_id in child_ids:
                    if sibling_id != child_id and sibling_id not in child.siblings:
                        child.siblings.append(sibling_id)
                self._ensure_family_relation(child, parent, "parent")
                self._ensure_family_relation(parent, child, "child")

        for character in self.state.characters.values():
            cousin_ids = set()
            for parent_id in character.parents:
                parent = self.state.characters.get(parent_id)
                if parent is None:
                    continue
                for sibling_id in parent.siblings:
                    sibling = self.state.characters.get(sibling_id)
                    if sibling is None:
                        continue
                    cousin_ids.update(sibling.children)
            character.siblings = sorted(set(character.siblings).union(preserved[character.id]["siblings"]).difference({character.id}))
            character.grandparents = sorted(set(character.grandparents).union(preserved[character.id]["grandparents"]).difference({character.id}))
            character.cousins = sorted(cousin_ids.union(preserved[character.id]["cousins"]).difference({character.id}))
            for sibling_id in character.siblings:
                sibling = self.state.characters.get(sibling_id)
                self._ensure_family_relation(character, sibling, "sibling")
            for cousin_id in character.cousins:
                cousin = self.state.characters.get(cousin_id)
                self._ensure_family_relation(character, cousin, "cousin")
            for spouse_id in character.spouses:
                spouse = self.state.characters.get(spouse_id)
                self._ensure_family_relation(character, spouse, "spouse")

    def _ensure_family_relation(self, source: Character | None, target: Character | None, kind: str) -> None:
        if source is None or target is None:
            return
        relation = source.relationships.get(target.id)
        if relation is None:
            source.relationships[target.id] = relation = self.relationship_agent._link(source, target)
        relation.kind = kind
        relation.family_tie = True
        relation.public_label = kind
        relation.trust = max(relation.trust, 0.22)
        relation.affinity = max(relation.affinity, 0.18)

    def _pick_name(self, gender: str, surname: str) -> str:
        names = GIVEN_NAMES[gender]
        used = {character.given_name for character in self.state.characters.values() if character.surname == surname}
        available = [name for name in names if name not in used]
        return self.rng.choice(available or names)

    @staticmethod
    def _life_stage_for_age(age: int) -> str:
        if age < 13:
            return "child"
        if age < 18:
            return "adolescent"
        if age < 60:
            return "adult"
        return "elder"

    @staticmethod
    def _blend_class(left: str, right: str) -> str:
        order = ["working", "middling", "merchant", "gentry"]
        index = round((order.index(left) + order.index(right)) / 2)
        return order[index]

    @staticmethod
    def _build_client(settings: RuntimeSettings) -> OpenRouterClient | None:
        if not settings.openrouter_api_key or settings.offline_mode:
            return None
        return OpenRouterClient(settings)