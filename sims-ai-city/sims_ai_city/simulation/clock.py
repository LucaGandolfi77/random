"""Simulation time engine with seasons, birthdays, and yearly rollovers."""

from __future__ import annotations

from sims_ai_city.config import SimulationConfig
from sims_ai_city.models import AgeStage, Character, LifeEvent, LifeEventType, Season, SimulationDate, WorldState

SEASON_ORDER = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER]


def day_of_year(current_date: SimulationDate, config: SimulationConfig) -> int:
    """Convert a simulation date into a day-of-year index."""

    season_index = SEASON_ORDER.index(current_date.season)
    return season_index * config.days_per_season + current_date.day


def determine_age_stage(age_years: int) -> AgeStage:
    """Determine the age stage for a resident."""

    if age_years < 12:
        return AgeStage.CHILD
    if age_years < 18:
        return AgeStage.TEEN
    if age_years < 56:
        return AgeStage.ADULT
    return AgeStage.ELDER


class SimulationClock:
    """Advance time and apply birthdays to the world."""

    def __init__(self, config: SimulationConfig) -> None:
        self.config = config

    def advance(self, world: WorldState) -> tuple[list[LifeEvent], bool]:
        """Advance the world by one day and return any generated time events."""

        current_date = world.current_date.model_copy(deep=True)
        current_date.day += 1
        rolled_year = False

        if current_date.day > self.config.days_per_season:
            current_date.day = 1
            current_season_index = SEASON_ORDER.index(current_date.season)
            if current_season_index == len(SEASON_ORDER) - 1:
                current_date.season = SEASON_ORDER[0]
                current_date.year += 1
                rolled_year = True
            else:
                current_date.season = SEASON_ORDER[current_season_index + 1]

        world.current_date = current_date
        world.day_index += 1
        birthday_events = self._apply_birthdays(world)
        return birthday_events, rolled_year

    def _apply_birthdays(self, world: WorldState) -> list[LifeEvent]:
        events: list[LifeEvent] = []
        current_day_of_year = day_of_year(world.current_date, self.config)

        for character in world.characters.values():
            if not character.alive or character.birthday_day_of_year != current_day_of_year:
                continue

            previous_stage = character.age_stage
            character.age_years += 1
            character.age_stage = determine_age_stage(character.age_years)
            character.mood = "reflective"

            stage_note = ""
            if character.age_stage != previous_stage:
                stage_note = f" {character.first_name} has entered the {character.age_stage.value} era with theatrical intensity."

            events.append(
                LifeEvent(
                    day_index=world.day_index,
                    season=world.current_date.season,
                    year=world.current_date.year,
                    type=LifeEventType.BIRTHDAY,
                    headline=f"{character.full_name} celebrates a birthday",
                    description=f"{character.full_name} turns {character.age_years} today.{stage_note}",
                    actor_ids=[character.id],
                    tags=["birthday", character.age_stage.value],
                )
            )

        return events
