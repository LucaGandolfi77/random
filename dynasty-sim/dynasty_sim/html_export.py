"""HTML report generator for Dynasty Sim.

Produces a self-contained, single-file HTML page with:
- Simulation summary stats
- Interactive family tree (pure CSS/JS, no external deps)
- Year-by-year timeline
- Per-dynasty character cards
- Per-character memory log (expandable)
"""

from __future__ import annotations

import json
import html as _html
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from dynasty_sim.models import Character, WorldState


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------


def _e(text: str) -> str:
    """HTML-escape a string."""
    return _html.escape(str(text))


def _trait_bar(value: float, label: str) -> str:
    pct = int(value * 100)
    color = "#4ade80" if value >= 0.6 else "#facc15" if value >= 0.4 else "#f87171"
    return (
        f'<div class="trait-row">'
        f'<span class="trait-label">{_e(label)}</span>'
        f'<div class="bar-bg"><div class="bar-fill" style="width:{pct}%;background:{color}"></div></div>'
        f'<span class="trait-val">{pct}</span>'
        f"</div>"
    )


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------


def _build_summary(world: "WorldState") -> str:
    living = len(world.living_characters())
    total = len(world.characters)
    return f"""
<section id="summary">
  <h2>Simulation Summary</h2>
  <div class="stat-grid">
    <div class="stat-card"><span class="stat-num">{world.config.start_year}</span><span class="stat-lbl">Start year</span></div>
    <div class="stat-card"><span class="stat-num">{world.current_year - 1}</span><span class="stat-lbl">End year</span></div>
    <div class="stat-card"><span class="stat-num">{world.current_year - world.config.start_year}</span><span class="stat-lbl">Years simulated</span></div>
    <div class="stat-card"><span class="stat-num">{total}</span><span class="stat-lbl">Characters ever</span></div>
    <div class="stat-card"><span class="stat-num">{living}</span><span class="stat-lbl">Living at end</span></div>
    <div class="stat-card"><span class="stat-num">{len(world.dynasties)}</span><span class="stat-lbl">Dynasties</span></div>
    <div class="stat-card"><span class="stat-num">{len(world.events)}</span><span class="stat-lbl">Events logged</span></div>
    <div class="stat-card"><span class="stat-num">{len(world.year_summaries)}</span><span class="stat-lbl">Year summaries</span></div>
  </div>
</section>"""


def _build_timeline(world: "WorldState") -> str:
    rows = ""
    for ys in world.year_summaries:
        births = len(ys.births)
        deaths = len(ys.deaths)
        marriages = len(ys.marriages) // 2
        scandals = sum(1 for e in ys.events if e.event_type.value == "scandal")
        narrative = _e(ys.narrative or "")
        badge_births = f'<span class="badge green">+{births} born</span>' if births else ""
        badge_deaths = f'<span class="badge red">-{deaths} died</span>' if deaths else ""
        badge_marriages = f'<span class="badge blue">♥{marriages}</span>' if marriages else ""
        badge_scandals = f'<span class="badge orange">🔥{scandals}</span>' if scandals else ""
        rows += f"""
  <tr>
    <td class="year-col">{ys.year}</td>
    <td class="pop-col">{ys.population}</td>
    <td>{badge_births}{badge_deaths}{badge_marriages}{badge_scandals}</td>
    <td class="narrative-col">{narrative}</td>
  </tr>"""
    return f"""
<section id="timeline">
  <h2>Year-by-Year Timeline</h2>
  <div class="table-wrap">
  <table>
    <thead><tr><th>Year</th><th>Pop</th><th>Events</th><th>Chronicle</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
  </div>
</section>"""


def _build_character_card(char: "Character", world: "WorldState") -> str:
    age = char.age(world.current_year) if char.is_alive else (
        (char.death_year or world.current_year) - char.birth_year
    )
    status_cls = "alive" if char.is_alive else "deceased"
    status_txt = "Alive" if char.is_alive else f"†{char.death_year}"

    # Trait bars
    learned = char.traits.learned.model_dump()
    trait_bars = "".join(_trait_bar(v, k.replace("_", " ").title()) for k, v in learned.items())

    inherited = char.traits.inherited.model_dump(exclude={"raw_genes"})
    inherited_bars = "".join(_trait_bar(v, k.replace("_", " ").title()) for k, v in inherited.items())

    # Memories
    top_mems = sorted(char.memories, key=lambda m: m.importance, reverse=True)[:8]
    mem_html = "".join(
        f'<li class="mem-item val-{"pos" if m.emotional_valence >= 0 else "neg"}">'
        f"[{m.year}] {_e(m.description)}</li>"
        for m in top_mems
    )
    mem_section = f"<ul class='mem-list'>{mem_html}</ul>" if mem_html else "<p><em>No memories recorded.</em></p>"

    cid = f"char-{char.id[:8]}"
    return f"""
<div class="char-card {status_cls}" id="{cid}">
  <div class="char-header">
    <span class="char-name">{_e(char.full_name)}</span>
    <span class="char-meta">{_e(char.sex.value)} · {_e(char.occupation)} · age {age}</span>
    <span class="char-status-badge {status_cls}">{status_txt}</span>
  </div>
  <div class="char-body">
    <div class="traits-col">
      <h4>Learned Traits</h4>{trait_bars}
      <h4>Inherited Traits</h4>{inherited_bars}
    </div>
    <div class="mem-col">
      <h4>Key Memories</h4>{mem_section}
    </div>
  </div>
</div>"""


def _build_dynasties(world: "WorldState") -> str:
    sections = ""
    for dynasty in world.dynasties.values():
        members = [world.characters[m] for m in dynasty.member_ids if m in world.characters]
        living = [m for m in members if m.is_alive]
        founder = world.characters.get(dynasty.founder_id)
        founder_name = _e(founder.full_name) if founder else "Unknown"
        traits_txt = _e(", ".join(dynasty.known_traits)) if dynasty.known_traits else "—"
        events_html = "".join(f"<li>{_e(e)}</li>" for e in dynasty.notable_events[-10:])

        sorted_members = sorted(members, key=lambda c: len(c.child_ids) + len(c.memories), reverse=True)
        cards = "".join(_build_character_card(c, world) for c in sorted_members)

        sections += f"""
<section class="dynasty-section">
  <h2>{_e(dynasty.name)}</h2>
  <div class="dynasty-meta">
    <span>Founded: {dynasty.founded_year}</span>
    <span>Founder: {founder_name}</span>
    <span>Members: {len(members)} ({len(living)} living)</span>
    <span>Known for: {traits_txt}</span>
  </div>
  {"<ul class='notable-events'>" + events_html + "</ul>" if events_html else ""}
  <div class="char-grid">{cards}</div>
</section>"""
    return sections


def _build_family_tree_data(world: "WorldState") -> str:
    """Build a JSON dataset for the interactive tree rendered in JS."""
    nodes = []
    edges = []
    for char in world.characters.values():
        nodes.append({
            "id": char.id,
            "label": char.full_name,
            "year": char.birth_year,
            "alive": char.is_alive,
            "sex": char.sex.value,
            "dynasty": world.characters[char.id].dynasty_id,
        })
        for child_id in char.child_ids:
            edges.append({"from": char.id, "to": child_id})
    return json.dumps({"nodes": nodes, "edges": edges})


# ---------------------------------------------------------------------------
# CSS + JS template
# ---------------------------------------------------------------------------

_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.5; }
nav { position: sticky; top: 0; z-index: 100; background: #1e293b; padding: .5rem 1.5rem;
      display: flex; gap: 1.5rem; align-items: center; border-bottom: 1px solid #334155; }
nav a { color: #94a3b8; text-decoration: none; font-size: .875rem; }
nav a:hover { color: #f8fafc; }
nav .brand { color: #f8fafc; font-weight: 700; font-size: 1rem; margin-right: auto; }
main { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
h2 { font-size: 1.5rem; font-weight: 700; color: #f1f5f9; margin: 2rem 0 1rem; border-bottom: 1px solid #334155; padding-bottom: .5rem; }
h4 { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin: 1rem 0 .5rem; }

/* Stats */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px,1fr)); gap: .75rem; }
.stat-card { background: #1e293b; border: 1px solid #334155; border-radius: .5rem;
             padding: 1rem; text-align: center; }
.stat-num { display: block; font-size: 2rem; font-weight: 700; color: #38bdf8; }
.stat-lbl { font-size: .75rem; color: #94a3b8; }

/* Timeline table */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: .875rem; }
th { background: #1e293b; color: #94a3b8; text-align: left; padding: .5rem .75rem;
     position: sticky; top: 48px; }
td { padding: .4rem .75rem; border-bottom: 1px solid #1e293b; vertical-align: top; }
tr:hover td { background: #1e293b55; }
.year-col { font-weight: 600; color: #38bdf8; white-space: nowrap; }
.pop-col  { color: #94a3b8; }
.narrative-col { color: #cbd5e1; font-style: italic; }
.badge { display: inline-block; border-radius: .25rem; padding: .1rem .35rem;
         font-size: .75rem; margin-right: .25rem; font-weight: 600; }
.badge.green  { background: #14532d; color: #86efac; }
.badge.red    { background: #450a0a; color: #fca5a5; }
.badge.blue   { background: #1e3a5f; color: #93c5fd; }
.badge.orange { background: #431407; color: #fdba74; }

/* Dynasty sections */
.dynasty-meta { display: flex; flex-wrap: wrap; gap: 1rem; font-size: .875rem;
                color: #94a3b8; margin-bottom: 1rem; }
.dynasty-meta span::before { content: "• "; }
.notable-events { margin: .5rem 0 1rem 1.2rem; font-size: .875rem; color: #94a3b8; }

/* Character grid */
.char-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(520px,1fr)); gap: 1rem; }
.char-card { background: #1e293b; border: 1px solid #334155; border-radius: .5rem; overflow: hidden; }
.char-card.deceased { opacity: .65; }
.char-header { display: flex; align-items: baseline; gap: .75rem; padding: .75rem 1rem;
               background: #162032; flex-wrap: wrap; }
.char-name  { font-weight: 700; font-size: 1rem; color: #f8fafc; }
.char-meta  { font-size: .8rem; color: #94a3b8; }
.char-status-badge { margin-left: auto; font-size: .7rem; font-weight: 600;
                     padding: .1rem .5rem; border-radius: 1rem; }
.char-status-badge.alive    { background: #14532d; color: #86efac; }
.char-status-badge.deceased { background: #450a0a; color: #fca5a5; }
.char-body { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: .75rem 1rem; }
.traits-col, .mem-col { min-width: 0; }

/* Trait bars */
.trait-row { display: flex; align-items: center; gap: .4rem; margin-bottom: .2rem; font-size: .75rem; }
.trait-label { width: 110px; flex-shrink: 0; color: #cbd5e1; }
.bar-bg  { flex: 1; background: #0f172a; border-radius: 4px; height: 6px; }
.bar-fill{ height: 6px; border-radius: 4px; transition: width .3s; }
.trait-val { width: 26px; text-align: right; color: #64748b; }

/* Memories */
.mem-list { list-style: none; font-size: .8rem; max-height: 220px; overflow-y: auto;
            scrollbar-width: thin; }
.mem-item { padding: .2rem 0; border-bottom: 1px solid #1e293b55; }
.mem-item.val-pos { border-left: 2px solid #22c55e; padding-left: .4rem; }
.mem-item.val-neg { border-left: 2px solid #ef4444; padding-left: .4rem; }

/* Family tree canvas */
#tree-canvas-wrap { background: #1e293b; border: 1px solid #334155; border-radius: .5rem;
                    padding: 1rem; overflow: auto; min-height: 300px; }
#tree-canvas { display: block; }
"""

_JS = """
(function() {
  const raw = JSON.parse(document.getElementById('tree-data').textContent);
  const canvas = document.getElementById('tree-canvas');
  const wrap   = document.getElementById('tree-canvas-wrap');
  if (!raw.nodes.length) { wrap.textContent = 'No family tree data.'; return; }

  // Layout: group by birth_year as X, spread vertically
  const years = [...new Set(raw.nodes.map(n => n.year))].sort((a,b)=>a-b);
  const yearIdx = Object.fromEntries(years.map((y,i)=>[y,i]));
  const nodeCols = {};
  years.forEach(y => nodeCols[y] = 0);
  const PX = 160, PY = 60, PAD = 30;
  const pos = {};
  raw.nodes.forEach(n => {
    const col = yearIdx[n.year];
    const row = nodeCols[n.year]++;
    pos[n.id] = { x: PAD + col * PX, y: PAD + row * PY };
  });

  const maxX = Math.max(...Object.values(pos).map(p=>p.x)) + PX;
  const maxY = Math.max(...Object.values(pos).map(p=>p.y)) + PY;
  canvas.width  = maxX;
  canvas.height = maxY;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, maxX, maxY);

  // Draw edges
  ctx.lineWidth = 1;
  raw.edges.forEach(e => {
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) return;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(a.x + 50, a.y + 12);
    ctx.bezierCurveTo(a.x + 50, (a.y + b.y)/2, b.x + 50, (a.y + b.y)/2, b.x + 50, b.y + 12);
    ctx.stroke();
  });

  // Draw nodes
  raw.nodes.forEach(n => {
    const p = pos[n.id];
    ctx.fillStyle = n.alive
      ? (n.sex === 'male' ? '#1e40af' : '#701a75')
      : '#374151';
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, 100, 24, 4);
    ctx.fill();
    ctx.fillStyle = n.alive ? '#f8fafc' : '#9ca3af';
    ctx.font = '10px system-ui';
    ctx.fillText(n.label.length > 16 ? n.label.slice(0,15)+'…' : n.label, p.x+4, p.y+16);
  });
})();
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def export_html(world: "WorldState", path: str | Path = "report.html") -> Path:
    """Generate a self-contained HTML report and write it to *path*.

    Args:
        world: Completed (or in-progress) WorldState.
        path:  Output file path.

    Returns:
        Resolved Path that was written.
    """
    dest = Path(path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    summary_html    = _build_summary(world)
    timeline_html   = _build_timeline(world)
    dynasties_html  = _build_dynasties(world)
    tree_data_json  = _build_family_tree_data(world)

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Dynasty Sim Report — {world.config.start_year}–{world.current_year - 1}</title>
  <style>{_CSS}</style>
</head>
<body>
<nav>
  <span class="brand">⚔ Dynasty Sim</span>
  <a href="#summary">Summary</a>
  <a href="#timeline">Timeline</a>
  <a href="#family-tree">Family Tree</a>
  <a href="#dynasties">Dynasties</a>
</nav>
<main>
  {summary_html}
  {timeline_html}

  <section id="family-tree">
    <h2>Family Tree</h2>
    <div id="tree-canvas-wrap">
      <canvas id="tree-canvas"></canvas>
    </div>
    <script type="application/json" id="tree-data">{tree_data_json}</script>
  </section>

  <section id="dynasties">
    <h2>Dynasty Chronicles</h2>
    {dynasties_html}
  </section>
</main>
<script>{_JS}</script>
</body>
</html>"""

    dest.write_text(page, encoding="utf-8")
    return dest
