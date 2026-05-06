from __future__ import annotations

from html import escape
from pathlib import Path

from .models import Character, Family, TownState
from .persistence import ensure_directory, save_json, save_state
from .pwa import (
    render_explorer_app,
    render_explorer_css,
    render_explorer_html,
    render_explorer_manifest,
    render_icon_svg,
    render_service_worker,
)


def export_bundle(state: TownState, output_dir: Path) -> dict[str, Path]:
    ensure_directory(output_dir)
    paths = {
        "state": output_dir / "town_state.json",
        "anthology": output_dir / "anthology.md",
        "biographies": output_dir / "biographies.md",
        "family_trees": output_dir / "family_trees.md",
        "town_chronicle": output_dir / "town_chronicle.md",
        "cemetery_record": output_dir / "cemetery_record.json",
        "event_log": output_dir / "event_log.json",
        "explorer": output_dir / "index.html",
        "report": output_dir / "report.html",
        "manifest": output_dir / "manifest.webmanifest",
        "service_worker": output_dir / "sw.js",
    }
    save_state(state, paths["state"])
    paths["anthology"].write_text(render_anthology_markdown(state), encoding="utf-8")
    paths["biographies"].write_text(render_biographies_markdown(state), encoding="utf-8")
    paths["family_trees"].write_text(render_family_trees_markdown(state), encoding="utf-8")
    paths["town_chronicle"].write_text(render_town_chronicle_markdown(state), encoding="utf-8")
    save_json(state.cemetery.model_dump() if state.cemetery else {}, paths["cemetery_record"])
    save_json(
        {
            "town_events": [event.model_dump() for event in state.town_events],
            "life_events": [event.model_dump() for event in state.life_events],
        },
        paths["event_log"],
    )
    paths["explorer"].write_text(render_explorer_html(state), encoding="utf-8")
    paths["report"].write_text(render_html_report(state), encoding="utf-8")
    paths["manifest"].write_text(render_explorer_manifest(state), encoding="utf-8")
    paths["service_worker"].write_text(render_service_worker(), encoding="utf-8")
    (output_dir / "app.js").write_text(render_explorer_app(), encoding="utf-8")
    (output_dir / "styles.css").write_text(render_explorer_css(), encoding="utf-8")
    (output_dir / "icon-192.svg").write_text(render_icon_svg(size=192, town_name=state.town_name), encoding="utf-8")
    (output_dir / "icon-512.svg").write_text(render_icon_svg(size=512, town_name=state.town_name), encoding="utf-8")
    return paths


def render_anthology_markdown(state: TownState) -> str:
    lines = [
        f"# {state.config.anthology_title}",
        "",
        f"A linked cemetery anthology for {state.town_name}, exported in year {state.current_year}.",
        "",
        "## Town Portrait",
        "",
        f"- Districts: {', '.join(state.districts)}",
        f"- Institutions: {', '.join(state.institutions)}",
        f"- Festivals: {', '.join(state.festivals)}",
        f"- Long-running feuds: {', '.join(state.long_running_feuds)}",
        f"- Current gossip themes: {', '.join(state.gossip_themes[-5:])}",
        "",
        "## Linked Epitaphs",
        "",
    ]
    if not state.cemetery or not state.cemetery.epitaphs:
        lines.append("No epitaphs have been generated yet.")
    else:
        for epitaph in state.cemetery.epitaphs:
            lines.extend(
                [
                    f"### {epitaph.character_name}",
                    "",
                    epitaph.text,
                    "",
                    f"- Mood: {epitaph.mood}",
                    f"- Hidden truths: {', '.join(epitaph.hidden_truths) if epitaph.hidden_truths else 'None surfaced'}",
                    f"- Cross references: {', '.join(_character_name(state, character_id) for character_id in epitaph.referenced_character_ids) if epitaph.referenced_character_ids else 'None'}",
                    "",
                ]
            )

    lines.extend(["## Cross-Referenced Life Stories", ""])
    for character in sorted(state.characters.values(), key=lambda item: (not item.alive, item.surname, item.given_name)):
        lines.extend(
            [
                f"### {character.full_name}",
                "",
                build_biography(character, state),
                "",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def render_biographies_markdown(state: TownState) -> str:
    lines = [f"# {state.town_name} Character Biographies", ""]
    for character in sorted(state.characters.values(), key=lambda item: (item.surname, item.given_name)):
        lines.extend(
            [
                f"## {character.full_name}",
                "",
                build_biography(character, state),
                "",
                f"- Family: {state.families[character.family_id].name}",
                f"- Household: {state.households[character.household_id].name}",
                f"- Life stage: {character.life_stage}",
                f"- Occupation: {character.occupation}",
                f"- Desires: {', '.join(character.desires)}",
                f"- Fears: {', '.join(character.fears)}",
                f"- Virtues: {', '.join(character.virtues)}",
                f"- Flaws: {', '.join(character.flaws)}",
                f"- Public reputation: {character.reputation.public_summary or 'No fixed public summary.'}",
                f"- Private pressure: {character.primary_secret().summary if character.primary_secret() else 'No dominant secret.'}",
                "",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def render_family_trees_markdown(state: TownState) -> str:
    lines = [f"# {state.town_name} Family Trees", ""]
    for family in sorted(state.families.values(), key=lambda item: item.name):
        lines.extend([f"## {family.name}", "", build_family_tree(family, state), ""])
    return "\n".join(lines).strip() + "\n"


def render_town_chronicle_markdown(state: TownState) -> str:
    lines = [f"# Chronicle of {state.town_name}", ""]
    for chronicle in state.chronicles:
        lines.extend(
            [
                f"## {chronicle.title}",
                "",
                chronicle.summary,
                "",
                f"- Mood: {chronicle.mood}",
                f"- Public actors: {', '.join(_character_name(state, character_id) for character_id in chronicle.linked_character_ids) if chronicle.linked_character_ids else 'Not named'}",
                "",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def render_html_report(state: TownState) -> str:
    epitaph_blocks = []
    for epitaph in state.cemetery.epitaphs if state.cemetery else []:
        epitaph_blocks.append(
            """
            <article class="epitaph-card">
              <h3>{name}</h3>
              <p class="mood">{mood}</p>
              <pre>{text}</pre>
              <p class="refs">Cross references: {refs}</p>
            </article>
            """.format(
                name=escape(epitaph.character_name),
                mood=escape(epitaph.mood.title()),
                text=escape(epitaph.text),
                refs=escape(
                    ", ".join(_character_name(state, character_id) for character_id in epitaph.referenced_character_ids)
                    or "None"
                ),
            )
        )

    chronicle_items = "".join(
        f"<li><strong>{escape(item.title)}</strong><span>{escape(item.summary)}</span></li>" for item in state.chronicles
    )
    family_cards = "".join(
        """
        <article class="family-card">
          <h3>{name}</h3>
          <p>{origin}</p>
          <p><strong>Members:</strong> {members}</p>
          <p><strong>Pressure:</strong> {pressure}</p>
        </article>
        """.format(
            name=escape(family.name),
            origin=escape(family.origin),
            members=escape(", ".join(_character_name(state, member_id) for member_id in family.member_ids if member_id in state.characters)),
            pressure=escape(family.inherited_secrets[0] if family.inherited_secrets else "No inherited pressure recorded."),
        )
        for family in state.families.values()
    )
    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(state.config.anthology_title)}</title>
    <style>
      :root {{
        --paper: #f5eee2;
        --ink: #2a231d;
        --red: #7e2b2b;
        --green: #40513b;
        --shadow: rgba(42, 35, 29, 0.18);
      }}
      body {{
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(126, 43, 43, 0.13), transparent 28%),
          linear-gradient(180deg, #efe4d5 0%, var(--paper) 55%, #eadfce 100%);
      }}
      main {{ max-width: 1120px; margin: 0 auto; padding: 32px 20px 64px; }}
      header {{ margin-bottom: 28px; }}
      h1, h2, h3 {{ font-weight: 600; letter-spacing: 0.02em; }}
      .hero {{
        padding: 28px;
        border: 1px solid rgba(42, 35, 29, 0.14);
        background: rgba(255, 250, 243, 0.78);
        box-shadow: 0 20px 45px var(--shadow);
      }}
      .grid {{ display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }}
      .epitaph-card, .family-card {{
        padding: 18px;
        background: rgba(255, 252, 247, 0.82);
        border-left: 4px solid var(--red);
        box-shadow: 0 12px 30px var(--shadow);
      }}
      .epitaph-card pre {{ white-space: pre-wrap; font-family: inherit; line-height: 1.65; }}
      .mood {{ text-transform: uppercase; letter-spacing: 0.18em; color: var(--red); font-size: 0.72rem; }}
      ul.timeline {{ list-style: none; padding: 0; display: grid; gap: 12px; }}
      ul.timeline li {{ padding: 14px 16px; background: rgba(255, 252, 247, 0.68); border-left: 4px solid var(--green); }}
      ul.timeline span {{ display: block; margin-top: 6px; line-height: 1.5; }}
      @media (max-width: 720px) {{
        main {{ padding: 20px 14px 48px; }}
        .hero {{ padding: 20px; }}
      }}
    </style>
  </head>
  <body>
    <main>
      <header class="hero">
        <p>{escape(state.town_name)} anthology export, year {state.current_year}</p>
        <h1>{escape(state.config.anthology_title)}</h1>
        <p>{escape(', '.join(state.long_running_feuds))}</p>
                <p><a href="./index.html">Open the PWA explorer</a></p>
      </header>
      <section>
        <h2>Families Under Pressure</h2>
        <div class="grid">{family_cards}</div>
      </section>
      <section>
        <h2>Cemetery Chorus</h2>
        <div class="grid">{''.join(epitaph_blocks) or '<p>No epitaphs have been recorded yet.</p>'}</div>
      </section>
      <section>
        <h2>Town Chronicle</h2>
        <ul class="timeline">{chronicle_items}</ul>
      </section>
    </main>
  </body>
</html>
"""


def build_biography(character: Character, state: TownState) -> str:
    family = state.families[character.family_id]
    household = state.households[character.household_id]
    notable_events = [event.title for event in state.life_events if character.id in event.participant_ids][-3:]
    kin = []
    if character.parents:
        kin.append("parents: " + ", ".join(_character_name(state, item) for item in character.parents))
    if character.spouses:
        kin.append("spouses: " + ", ".join(_character_name(state, item) for item in character.spouses))
    if character.children:
        kin.append("children: " + ", ".join(_character_name(state, item) for item in character.children))
    kin_text = "; ".join(kin) if kin else "Kinship ties remain implied more than documented."
    event_text = ", ".join(notable_events) if notable_events else "No single public event defines this life yet."
    return (
        f"{character.full_name} belongs to the {family.name} family and lives through the atmosphere of {household.name}. "
        f"At {character.age}, {character.given_name} works as {_with_indefinite_article(character.occupation)} with desires shaped by {', '.join(character.desires)} and fears sharpened by {', '.join(character.fears)}. "
        f"The household remembers {kin_text}. "
        f"Recent turning points: {event_text}."
    )


def build_family_tree(family: Family, state: TownState) -> str:
    members = [state.characters[member_id] for member_id in family.member_ids if member_id in state.characters]
    members.sort(key=lambda item: (-item.age, item.given_name))
    lines = [
        f"Origin: {family.origin}",
        f"Branch: {family.branch}",
        f"Motto: {family.motto}",
        f"Inherited tensions: {', '.join(family.inherited_secrets) if family.inherited_secrets else 'None recorded'}",
        "",
    ]
    for member in members:
        parent_names = ", ".join(_character_name(state, parent_id) for parent_id in member.parents) or "unknown"
        spouse_names = ", ".join(_character_name(state, spouse_id) for spouse_id in member.spouses) or "none"
        child_names = ", ".join(_character_name(state, child_id) for child_id in member.children) or "none"
        lines.append(f"- {member.full_name} [{member.life_stage}, {member.occupation}] | parents: {parent_names} | spouses: {spouse_names} | children: {child_names}")
    return "\n".join(lines)


def _character_name(state: TownState, character_id: str) -> str:
    return state.characters[character_id].full_name if character_id in state.characters else character_id


def _with_indefinite_article(noun_phrase: str) -> str:
    article = "an" if noun_phrase[:1].lower() in {"a", "e", "i", "o", "u"} else "a"
    return f"{article} {noun_phrase}"