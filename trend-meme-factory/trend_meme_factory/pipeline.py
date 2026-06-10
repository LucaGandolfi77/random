from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from typing import Any
import json
import math
import random
import re
import textwrap
import xml.etree.ElementTree as ET

import requests
from PIL import Image, ImageColor, ImageDraw, ImageFont


GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"
SAFE_FEED_HEADERS = {
    "User-Agent": "TrendMemeFactory/0.1 (+https://example.local)"
}
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
    "is", "it", "its", "of", "on", "or", "that", "the", "their", "this", "to", "with"
}
BLOCKED_SOURCE_HINTS = ("reddit.com", "tiktok.com", "x.com", "twitter.com", "instagram.com")
DISALLOWED_CATEGORIES = {
    "politics", "war", "tragedy", "crime", "private individuals", "minors",
    "protected identity groups", "sexual topics", "medical misinformation",
    "financial scams", "conspiracy theories"
}
SAFETY_BLOCKLIST = [
    (re.compile(r"\b(election|president|prime minister|parliament|senate|campaign|ballot|vote)\b", re.I), "politics"),
    (re.compile(r"\b(war|conflict|missile|bombing|terror|hostage|ceasefire|invasion)\b", re.I), "war"),
    (re.compile(r"\b(killed|death|dead|funeral|memorial|mourning|obituary)\b", re.I), "tragedy"),
    (re.compile(r"\b(shooting|murder|crime|arrest|trial|victim|abuse|fraud|scam)\b", re.I), "crime"),
    (re.compile(r"\b(sex|sexual|nude|adult|erotic|porn)\b", re.I), "sexual content"),
    (re.compile(r"\b(race|religion|ethnicity|disability|trans|gay|lesbian|caste|nationality)\b", re.I), "protected identity group"),
    (re.compile(r"\b(child|children|teen|minor|student)\b", re.I), "minors"),
    (re.compile(r"\b(diagnosis|cancer|hospital|medical|treatment|illness)\b", re.I), "medical"),
    (re.compile(r"\b(stock|crypto|investment|forex|loan|bankruptcy)\b", re.I), "financial"),
]
PROMPT_BLOCKLIST = [
    "real person", "celebrity", "politician", "logo", "trademark", "copyrighted character",
    "sexual", "violent", "gore", "hateful"
]
PALETTE_LIBRARY = [
    ("#F7F1E1", "#FFC857", "#1F1300", "#0F8B8D"),
    ("#EAF4FF", "#4D9DE0", "#13293D", "#F46036"),
    ("#FFF3E8", "#F28F3B", "#3B1F2B", "#6D9DC5"),
    ("#EEFCE8", "#7BC950", "#213547", "#FF6B6B"),
    ("#F6ECFF", "#7E57C2", "#1E1B4B", "#06B6D4"),
]


@dataclass(frozen=True)
class ResearchQuery:
    label: str
    category: str
    search_query: str
    safe_title: str
    safe_summary: str


RESEARCH_QUERIES = [
    ResearchQuery(
        label="AI tools",
        category="AI tools",
        search_query="AI tools update when:3d",
        safe_title="AI assistants keep adding more features than anyone asked for",
        safe_summary="Recent coverage points to a fresh wave of AI assistant and workflow updates that promise convenience while quietly adding more moving parts.",
    ),
    ResearchQuery(
        label="Software updates",
        category="software updates",
        search_query="software update rollout when:3d",
        safe_title="Software updates are once again reshuffling everyday routines",
        safe_summary="Multiple recent stories focus on updates, redesigns, and feature rollouts that change how familiar software behaves from one day to the next.",
    ),
    ResearchQuery(
        label="Gaming",
        category="gaming",
        search_query="gaming patch notes when:3d",
        safe_title="Gaming patch culture is still one surprise away from total chaos",
        safe_summary="Recent game coverage highlights patch notes, balance tweaks, and launches that encourage instant overreaction and endless strategy changes.",
    ),
    ResearchQuery(
        label="Streaming",
        category="streaming",
        search_query="streaming release new season when:3d",
        safe_title="Streaming platforms are competing to own everyone’s weekend",
        safe_summary="Fresh release schedules and new streaming announcements continue to feed the universal problem of too many things to watch at once.",
    ),
    ResearchQuery(
        label="Apps",
        category="apps",
        search_query="app update feature redesign when:3d",
        safe_title="Apps keep redesigning buttons people had finally memorized",
        safe_summary="Recent app update coverage points to feature experiments, redesigns, and interface changes that reset everyone’s muscle memory.",
    ),
    ResearchQuery(
        label="Productivity",
        category="productivity",
        search_query="productivity app update AI when:3d",
        safe_title="Productivity software keeps offering one more system to manage the systems",
        safe_summary="Coverage around productivity tools and planning software continues to reward the habit of solving overload by adding more dashboards.",
    ),
    ResearchQuery(
        label="Consumer gadgets",
        category="consumer gadgets",
        search_query="consumer gadgets launch phone battery when:3d",
        safe_title="Consumer gadget hype still turns tiny upgrades into major life events",
        safe_summary="Recent gadget stories focus on launches, accessories, battery concerns, and the ritual of pretending a new cable will solve everything.",
    ),
    ResearchQuery(
        label="Technology",
        category="technology",
        search_query="consumer tech feature rollout when:3d",
        safe_title="Consumer tech keeps promising seamless convenience in increasingly complicated ways",
        safe_summary="Broad tech coverage remains full of updates that sound frictionless on paper and slightly chaotic in daily life.",
    ),
    ResearchQuery(
        label="Entertainment",
        category="entertainment",
        search_query="entertainment trailer release when:3d",
        safe_title="Entertainment hype cycles are accelerating faster than watchlists can recover",
        safe_summary="New trailers, teasers, and release windows continue to create the familiar feeling of instant excitement followed by backlog math.",
    ),
]

FALLBACK_TOPICS = [
    {
        "title": "Software updates keep arriving exactly when people need stability",
        "category": "software updates",
        "summary": "Evergreen fallback topic used when live research is unavailable.",
    },
    {
        "title": "AI assistants remain confidently helpful in very unexpected ways",
        "category": "AI tools",
        "summary": "Evergreen fallback topic used when live research is unavailable.",
    },
    {
        "title": "Calendar overload is still undefeated",
        "category": "workplace culture",
        "summary": "Evergreen fallback topic used when live research is unavailable.",
    },
    {
        "title": "Gaming patch notes are still emotional events",
        "category": "gaming",
        "summary": "Evergreen fallback topic used when live research is unavailable.",
    },
    {
        "title": "Streaming backlog math remains impossible",
        "category": "streaming",
        "summary": "Evergreen fallback topic used when live research is unavailable.",
    },
]

CAPTION_LIBRARY = {
    "AI tools": [
        {
            "concept_title": "The Helpful Overbuild",
            "humor_mechanism": "expectation vs reality",
            "target_audience": "people experimenting with AI tools at work",
            "caption_top": "ME: just make this quicker",
            "caption_bottom": "THE TOOL: I BUILT A 14-STEP WORKFLOW AND A DASHBOARD",
            "alternative_caption": "Asked for speed, received a full operating model.",
            "visual_scene_description": "A cheerful generic robot at an office desk proudly presenting an absurdly large color-coded workflow map to one stunned office worker, with floating checklists, arrows, and a coffee cup.",
            "image_style": "clean digital illustration",
        },
        {
            "concept_title": "Confident Draft Mode",
            "humor_mechanism": "tech irony",
            "target_audience": "knowledge workers using AI copilots",
            "caption_top": "ME: summarize the meeting",
            "caption_bottom": "THE ASSISTANT: HERE IS A MANIFESTO, TIMELINE, AND MOOD BOARD",
            "alternative_caption": "Every simple task becomes a cinematic universe.",
            "visual_scene_description": "A generic office computer screen exploding into too many tidy project cards while a small cartoon robot beams with confidence and the human user slowly lowers a coffee mug.",
            "image_style": "surreal but family-friendly",
        },
    ],
    "software updates": [
        {
            "concept_title": "Settings Hide and Seek",
            "humor_mechanism": "software update chaos",
            "target_audience": "anyone who uses the same app every day",
            "caption_top": "ONE SMALL UPDATE",
            "caption_bottom": "WHY ARE ALL MY SETTINGS IN WITNESS PROTECTION",
            "alternative_caption": "Muscle memory versus surprise redesign.",
            "visual_scene_description": "A simple cartoon office worker hunting for missing settings across three generic software windows and a maze of update popups on bright monitors.",
            "image_style": "office comic style",
        },
        {
            "concept_title": "Progress Bar Philosophy",
            "humor_mechanism": "relatable absurdity",
            "target_audience": "people stuck waiting on software installs",
            "caption_top": "UPDATE SAYS: 2 MINUTES LEFT",
            "caption_bottom": "MY ENTIRE EVENING: understood, I live here now",
            "alternative_caption": "The most optimistic timer on earth.",
            "visual_scene_description": "A cozy desk scene with a giant progress bar on a generic monitor, a pile of snacks, and a cartoon person aging slightly while staying seated.",
            "image_style": "simple cartoon",
        },
    ],
    "gaming": [
        {
            "concept_title": "Minor Balance Change",
            "humor_mechanism": "exaggeration",
            "target_audience": "players who read patch notes immediately",
            "caption_top": "PATCH NOTES: minor tweaks",
            "caption_bottom": "THE ENTIRE META: evaporates before lunch",
            "alternative_caption": "Nothing major, except reality itself.",
            "visual_scene_description": "A colorful gaming room with a generic controller, patch-note cards floating like confetti, and cartoon players reacting as a strategy board collapses into chaos.",
            "image_style": "colorful internet meme style",
        },
        {
            "concept_title": "Launch Day Confidence",
            "humor_mechanism": "expectation vs reality",
            "target_audience": "online multiplayer players",
            "caption_top": "ME: quick game before dinner",
            "caption_bottom": "THE QUEUE: excellent joke, see you in 48 minutes",
            "alternative_caption": "Launch-day optimism has entered the queue.",
            "visual_scene_description": "A fictional gaming setup with a generic avatar waiting beside a giant queue timer, snack wrappers, and hopeful neon lighting.",
            "image_style": "clean digital illustration",
        },
    ],
    "streaming": [
        {
            "concept_title": "Weekend Watchlist Physics",
            "humor_mechanism": "contrast",
            "target_audience": "people overwhelmed by streaming choices",
            "caption_top": "ME: one episode and sleep",
            "caption_bottom": "THE PLATFORM: here are 19 new reasons to ignore that plan",
            "alternative_caption": "The backlog grows faster than free time.",
            "visual_scene_description": "A comfy couch, a generic television filled with colorful show cards, a remote in midair, and a cartoon viewer realizing the watchlist now has its own gravity.",
            "image_style": "clean digital illustration",
        },
        {
            "concept_title": "Recommendation Avalanche",
            "humor_mechanism": "internet culture pattern",
            "target_audience": "heavy streaming users",
            "caption_top": "I FINISHED ONE SHOW",
            "caption_bottom": "THE RECOMMENDATION ENGINE: congratulations, you now owe me a semester",
            "alternative_caption": "Completion only unlocks more homework.",
            "visual_scene_description": "A fictional streaming dashboard bursting with recommendation tiles around a tiny, overwhelmed viewer on a sofa with popcorn.",
            "image_style": "fake screenshot style without real brands",
        },
    ],
    "apps": [
        {
            "concept_title": "The Moved Button",
            "humor_mechanism": "relatable frustration",
            "target_audience": "mobile app power users",
            "caption_top": "APP UPDATE COMPLETE",
            "caption_bottom": "THE SAVE BUTTON NOW LIVES IN AN ESCAPE ROOM",
            "alternative_caption": "Redesign means finding basic controls again.",
            "visual_scene_description": "A giant generic phone screen showing colorful app panels while a cartoon hand searches through floating menus for one missing button.",
            "image_style": "minimal flat illustration",
        },
        {
            "concept_title": "Notification Democracy",
            "humor_mechanism": "exaggeration",
            "target_audience": "anyone with too many apps",
            "caption_top": "MY PHONE: one quick buzz",
            "caption_bottom": "ALSO MY PHONE: 43 APPS HAVE OPINIONS",
            "alternative_caption": "Every icon wants floor time.",
            "visual_scene_description": "A generic smartphone flooding the room with colorful notification bubbles while a calm cartoon person slowly loses the concept of silence.",
            "image_style": "sticker-like illustration",
        },
    ],
    "productivity": [
        {
            "concept_title": "System for the Systems",
            "humor_mechanism": "workplace irony",
            "target_audience": "project planners and ops teams",
            "caption_top": "I DOWNLOADED A PRODUCTIVITY APP",
            "caption_bottom": "IT ASKED ME TO MANAGE THE APP IN A DIFFERENT PRODUCTIVITY APP",
            "alternative_caption": "Peak organization is recursive.",
            "visual_scene_description": "A neat office desk with nested planners, checklists inside checklists, and a determined cartoon worker surrounded by calendars and tabs.",
            "image_style": "office comic style",
        },
        {
            "concept_title": "Calendar Creep",
            "humor_mechanism": "expectation vs reality",
            "target_audience": "office workers with packed schedules",
            "caption_top": "CALENDAR INVITE: quick sync",
            "caption_bottom": "MY WHOLE AFTERNOON: now a limited series",
            "alternative_caption": "One meeting quietly acquires sequels.",
            "visual_scene_description": "A cartoon calendar stretching across an office wall like a giant unfolding map while a tiny worker clutches a coffee cup and stares upward.",
            "image_style": "simple cartoon",
        },
    ],
    "consumer gadgets": [
        {
            "concept_title": "Battery Percentage Theology",
            "humor_mechanism": "everyday tech anxiety",
            "target_audience": "phone and gadget users",
            "caption_top": "PHONE AT 18%",
            "caption_bottom": "ME: suddenly I respect every outlet in the building",
            "alternative_caption": "Modern courage ends at low battery.",
            "visual_scene_description": "A generic smartphone showing a dramatic low-battery icon while cartoon charging cables, adapters, and portable batteries arrive like a rescue team.",
            "image_style": "clean digital illustration",
        },
        {
            "concept_title": "Accessory Confidence",
            "humor_mechanism": "consumer gadget absurdity",
            "target_audience": "people who love new devices",
            "caption_top": "NEW GADGET DAY",
            "caption_bottom": "SOMEHOW I NOW NEED SIX EXTRA CABLES AND A STAND",
            "alternative_caption": "Minimalism ends at the checkout page.",
            "visual_scene_description": "A happy cartoon buyer opening a generic gadget box while a parade of adapters, cables, and cases marches into frame.",
            "image_style": "colorful internet meme style",
        },
    ],
    "technology": [
        {
            "concept_title": "Seamless Complexity",
            "humor_mechanism": "tech irony",
            "target_audience": "consumer tech users",
            "caption_top": "THE PRODUCT PAGE: seamless experience",
            "caption_bottom": "ME: holding three devices and one very specific cable",
            "alternative_caption": "Nothing says smooth like an adapter search.",
            "visual_scene_description": "A bright tech illustration with a cartoon person juggling generic devices, cables, and setup cards beneath a cheerful futuristic interface.",
            "image_style": "clean digital illustration",
        },
        {
            "concept_title": "Feature Rollout Energy",
            "humor_mechanism": "contrast",
            "target_audience": "people following product launches",
            "caption_top": "THE ANNOUNCEMENT: effortless upgrade",
            "caption_bottom": "THE SETUP: 11 TABS, 3 PASSWORDS, 1 COFFEE REFILL",
            "alternative_caption": "Convenience often begins with logistics.",
            "visual_scene_description": "A generic home-office desk packed with setup cards, floating tabs, and a focused cartoon person mid-configuration with a large coffee mug.",
            "image_style": "office comic style",
        },
    ],
    "entertainment": [
        {
            "concept_title": "Trailer to To-Do List",
            "humor_mechanism": "internet behavior",
            "target_audience": "entertainment and pop-culture fans",
            "caption_top": "ME: nice trailer",
            "caption_bottom": "MY BRAIN: excellent, please start 7 side quests immediately",
            "alternative_caption": "One teaser can reorganize the whole week.",
            "visual_scene_description": "A colorful family-friendly entertainment collage with a generic screen, a popcorn bucket, floating calendar reminders, and an excited cartoon fan.",
            "image_style": "colorful internet meme style",
        },
        {
            "concept_title": "Backlog Expansion Pack",
            "humor_mechanism": "expectation vs reality",
            "target_audience": "people who follow new releases",
            "caption_top": "I OPENED THE NEWS FOR ONE UPDATE",
            "caption_bottom": "NOW MY WATCHLIST HAS DLC",
            "alternative_caption": "Entertainment news rarely stays singular.",
            "visual_scene_description": "A playful cartoon scene where a tiny watchlist notebook expands into a towering stack of tickets, screens, and release cards around one surprised viewer.",
            "image_style": "surreal but family-friendly",
        },
    ],
    "workplace culture": [
        {
            "concept_title": "Meeting Matryoshka",
            "humor_mechanism": "workplace frustration",
            "target_audience": "office workers",
            "caption_top": "THIS MEETING HAS A SIMPLE AGENDA",
            "caption_bottom": "INSIDE IT: THREE SMALLER MEETINGS WEARING TIES",
            "alternative_caption": "Some invites contain sequels.",
            "visual_scene_description": "A whimsical office comic scene with one conference table hiding smaller nested meeting tables inside it, plus laptops and coffee cups.",
            "image_style": "office comic style",
        },
        {
            "concept_title": "Inbox Forecast",
            "humor_mechanism": "relatable absurdity",
            "target_audience": "knowledge workers",
            "caption_top": "I CLEARED MY INBOX",
            "caption_bottom": "THE AFTERNOON: bold strategy, let's see how long that lasts",
            "alternative_caption": "Zero is more of a weather condition than a state.",
            "visual_scene_description": "A bright office illustration showing a generic inbox as a storm cloud of friendly email icons rolling back toward a relieved cartoon worker.",
            "image_style": "clean digital illustration",
        },
    ],
}


@dataclass
class Config:
    max_topics_to_research: int = 20
    max_topics_to_approve: int = 8
    memes_per_topic: int = 2
    max_final_memes: int = 10
    output_root: str = "./outputs"
    image_format: str = "png"
    default_aspect_ratio: str = "square"
    run_date: str | None = None
    enable_web_research: bool = True
    enable_image_generation: bool = True
    enable_text_overlay: bool = True
    strict_safety_mode: bool = True

    def resolved_run_date(self) -> str:
        return self.run_date or date.today().isoformat()


@dataclass
class CandidateTopic:
    topic_id: str
    title: str
    short_summary: str
    why_it_is_trending: str
    source_urls: list[str]
    publication_dates: list[str]
    category: str
    freshness_score: int
    meme_potential_score: int
    safety_risk_score: int
    safety_notes: str


@dataclass
class RejectedTopic:
    topic_id: str
    rejection_reason: str
    safety_rule_triggered: str


@dataclass
class MemeConcept:
    meme_id: str
    topic_id: str
    concept_title: str
    humor_mechanism: str
    target_audience: str
    caption_top: str
    caption_bottom: str
    alternative_caption: str
    visual_scene_description: str
    image_style: str
    risk_assessment: str
    why_it_is_safe: str
    category: str


@dataclass
class ImagePrompt:
    meme_id: str
    final_image_prompt: str
    negative_prompt: str
    aspect_ratio: str
    text_overlay_instructions: str
    filename_slug: str
    output_format: str


@dataclass
class GeneratedAsset:
    meme_id: str
    filename_slug: str
    raw_image_path: str | None
    final_image_path: str | None
    prompt_path: str
    image_generation_status: str
    overlay_status: str
    failure_reason: str | None = None


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned or "item"


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(value, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            continue
    return None


def parse_feed_items(xml_text: str) -> list[dict[str, Any]]:
    root = ET.fromstring(xml_text)
    items: list[dict[str, Any]] = []

    if root.tag.endswith("feed"):
        namespaces = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", namespaces):
            link_el = entry.find("atom:link", namespaces)
            items.append(
                {
                    "title": strip_html(entry.findtext("atom:title", default="", namespaces=namespaces)),
                    "link": (link_el.attrib.get("href") if link_el is not None else "") or "",
                    "published": entry.findtext("atom:published", default="", namespaces=namespaces)
                    or entry.findtext("atom:updated", default="", namespaces=namespaces),
                    "summary": strip_html(entry.findtext("atom:summary", default="", namespaces=namespaces)),
                }
            )
        return items

    for item in root.findall(".//item"):
        items.append(
            {
                "title": strip_html(item.findtext("title", default="")),
                "link": strip_html(item.findtext("link", default="")),
                "published": item.findtext("pubDate", default="") or item.findtext("published", default=""),
                "summary": strip_html(item.findtext("description", default="")),
            }
        )
    return items


def extract_domain(url: str) -> str:
    match = re.match(r"https?://([^/]+)", url)
    return match.group(1).lower() if match else ""


def safe_source(url: str) -> bool:
    domain = extract_domain(url)
    return bool(domain) and all(blocked not in domain for blocked in BLOCKED_SOURCE_HINTS)


def recent_score(publication_dates: list[datetime | None]) -> int:
    dated = [item for item in publication_dates if item is not None]
    if not dated:
        return 5
    avg_hours = sum((datetime.now(timezone.utc) - item).total_seconds() / 3600 for item in dated) / len(dated)
    if avg_hours <= 12:
        return 10
    if avg_hours <= 24:
        return 9
    if avg_hours <= 36:
        return 8
    if avg_hours <= 48:
        return 7
    if avg_hours <= 72:
        return 6
    return 4


def meme_score_for_category(category: str) -> int:
    scores = {
        "AI tools": 9,
        "software updates": 9,
        "gaming": 8,
        "streaming": 8,
        "apps": 8,
        "productivity": 8,
        "workplace culture": 8,
        "consumer gadgets": 7,
        "technology": 7,
        "entertainment": 7,
    }
    return scores.get(category, 6)


def safety_scan(text: str) -> tuple[int, list[str]]:
    triggers: list[str] = []
    for pattern, label in SAFETY_BLOCKLIST:
        if pattern.search(text):
            triggers.append(label)
    risk = 1 + min(8, len(triggers) * 3)
    return risk, triggers


def load_font(size: int) -> ImageFont.ImageFont:
    font_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ]
    for candidate in font_candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


class TrendResearchAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def research(self) -> tuple[list[CandidateTopic], list[str]]:
        warnings: list[str] = []
        if not self.config.enable_web_research:
            warnings.append("Web research disabled; using fallback-only mode.")
            self.logger.append({"step": "research", "status": "skipped", "reason": "web research disabled"})
            return [], warnings

        topics: list[CandidateTopic] = []
        for index, query in enumerate(RESEARCH_QUERIES, start=1):
            if len(topics) >= self.config.max_topics_to_research:
                break
            try:
                response = requests.get(
                    GOOGLE_NEWS_RSS,
                    params={"q": query.search_query, "hl": "en-US", "gl": "US", "ceid": "US:en"},
                    headers=SAFE_FEED_HEADERS,
                    timeout=20,
                )
                response.raise_for_status()
                items = parse_feed_items(response.text)
            except Exception as exc:
                warning = f"Research query '{query.label}' failed: {type(exc).__name__}: {exc}"
                warnings.append(warning)
                self.logger.append({"step": "research", "status": "failed", "query": query.label, "reason": str(exc)})
                continue

            recent_items = []
            cutoff = datetime.now(timezone.utc) - timedelta(hours=72)
            for item in items:
                published = parse_datetime(item.get("published"))
                if published is not None and published < cutoff:
                    continue
                if not safe_source(item.get("link", "")):
                    continue
                recent_items.append({**item, "published_dt": published})

            if len(recent_items) < 2:
                warning = f"Research query '{query.label}' returned fewer than 2 safe recent articles."
                warnings.append(warning)
                self.logger.append({"step": "research", "status": "insufficient", "query": query.label, "articles": len(recent_items)})
                continue

            selected_items = recent_items[:4]
            domains = []
            for item in selected_items:
                domain = extract_domain(item["link"])
                if domain and domain not in domains:
                    domains.append(domain)
            summary_text = " ".join(
                part for part in [query.safe_title, query.safe_summary, " ".join(item["title"] for item in selected_items[:2])] if part
            )
            risk_score, triggers = safety_scan(summary_text)
            topic = CandidateTopic(
                topic_id=f"topic-{index:02d}",
                title=query.safe_title,
                short_summary=query.safe_summary,
                why_it_is_trending=(
                    f"Found {len(selected_items)} recent articles from {len(domains)} independent sources in the last 72 hours about {query.label.lower()}, "
                    f"with repeated coverage of feature changes, launches, or user-facing updates."
                ),
                source_urls=[item["link"] for item in selected_items],
                publication_dates=[
                    (item["published_dt"] or datetime.now(timezone.utc)).date().isoformat() for item in selected_items
                ],
                category=query.category,
                freshness_score=recent_score([item["published_dt"] for item in selected_items]),
                meme_potential_score=meme_score_for_category(query.category),
                safety_risk_score=risk_score,
                safety_notes=(
                    "Automated safety scan found no blocked pattern."
                    if not triggers
                    else f"Blocked pattern hints: {', '.join(sorted(set(triggers)))}"
                ),
            )
            topics.append(topic)
            self.logger.append(
                {
                    "step": "research",
                    "status": "ok",
                    "query": query.label,
                    "topic_id": topic.topic_id,
                    "sources": domains,
                }
            )

        return topics[: self.config.max_topics_to_research], warnings


class SafetyReviewAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def review(self, candidates: list[CandidateTopic]) -> tuple[list[CandidateTopic], list[RejectedTopic]]:
        approved: list[CandidateTopic] = []
        rejected: list[RejectedTopic] = []
        for candidate in candidates:
            combined = " ".join([candidate.title, candidate.short_summary, candidate.why_it_is_trending, candidate.safety_notes])
            blocked_reason = None

            if candidate.category in DISALLOWED_CATEGORIES:
                blocked_reason = ("Disallowed category", candidate.category)
            elif self.config.strict_safety_mode and candidate.safety_risk_score >= 5:
                blocked_reason = ("Safety risk score above threshold", "strict_safety_mode")
            else:
                for pattern, label in SAFETY_BLOCKLIST:
                    if pattern.search(combined):
                        blocked_reason = (f"Matched blocked content pattern: {label}", label)
                        break

            if blocked_reason is not None:
                rejected_item = RejectedTopic(
                    topic_id=candidate.topic_id,
                    rejection_reason=blocked_reason[0],
                    safety_rule_triggered=blocked_reason[1],
                )
                rejected.append(rejected_item)
                self.logger.append({"step": "safety_review", "status": "rejected", "topic_id": candidate.topic_id, "reason": blocked_reason[0]})
                continue

            approved.append(candidate)
            self.logger.append({"step": "safety_review", "status": "approved", "topic_id": candidate.topic_id})

        approved.sort(key=lambda item: (item.meme_potential_score, item.freshness_score), reverse=True)
        return approved[: self.config.max_topics_to_approve], rejected


class MemeStrategyAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def build_concepts(self, approved_topics: list[CandidateTopic]) -> list[MemeConcept]:
        concepts: list[MemeConcept] = []
        concept_index = 1
        for topic in approved_topics:
            templates = CAPTION_LIBRARY.get(topic.category) or CAPTION_LIBRARY.get("technology", [])
            for template in templates[: self.config.memes_per_topic]:
                if len(concepts) >= self.config.max_final_memes:
                    return concepts
                concept = MemeConcept(
                    meme_id=f"meme-{concept_index:02d}",
                    topic_id=topic.topic_id,
                    concept_title=template["concept_title"],
                    humor_mechanism=template["humor_mechanism"],
                    target_audience=template["target_audience"],
                    caption_top=template["caption_top"],
                    caption_bottom=template["caption_bottom"],
                    alternative_caption=template["alternative_caption"],
                    visual_scene_description=template["visual_scene_description"],
                    image_style=template["image_style"],
                    risk_assessment="Low risk. Uses generic fictional subjects and harmless observational humor.",
                    why_it_is_safe="It avoids real people, protected groups, politics, sexual content, and tragedy while keeping the joke broad and situational.",
                    category=topic.category,
                )
                concepts.append(concept)
                concept_index += 1
                self.logger.append({"step": "meme_strategy", "status": "ok", "topic_id": topic.topic_id, "meme_id": concept.meme_id})
        return concepts


class PromptEngineeringAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def build_prompts(self, concepts: list[MemeConcept]) -> list[ImagePrompt]:
        prompts: list[ImagePrompt] = []
        for concept in concepts:
            filename_slug = slugify(f"{concept.meme_id}-{concept.concept_title}")
            prompt = ImagePrompt(
                meme_id=concept.meme_id,
                final_image_prompt=(
                    f"Create a {concept.image_style} meme illustration. {concept.visual_scene_description} "
                    f"Family-friendly, original, high contrast, clear composition, empty space at the top and bottom for short meme text, "
                    f"no real people, no logos, no brand names, no copyrighted characters, no political imagery."
                ),
                negative_prompt=(
                    "real people, celebrity likeness, politician, copyrighted character, trademarked logo, sexual content, hate, violence, gore, tragedy, disaster, photorealism"
                ),
                aspect_ratio=self.config.default_aspect_ratio,
                text_overlay_instructions=(
                    "Use bold uppercase white text with a dark outline. Keep the top caption inside the upper band and the bottom caption inside the lower band."
                ),
                filename_slug=filename_slug,
                output_format=self.config.image_format,
            )
            prompts.append(prompt)
            self.logger.append({"step": "prompt_engineering", "status": "ok", "meme_id": concept.meme_id, "filename": filename_slug})
        return prompts


class ImageGenerationAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def generate(
        self,
        concepts: list[MemeConcept],
        prompts: list[ImagePrompt],
        images_dir: Path,
        prompts_dir: Path,
    ) -> list[GeneratedAsset]:
        assets: list[GeneratedAsset] = []
        concept_by_id = {concept.meme_id: concept for concept in concepts}
        for prompt in prompts:
            concept = concept_by_id[prompt.meme_id]
            prompt_path = prompts_dir / f"{prompt.filename_slug}.json"
            write_json(prompt_path, asdict(prompt))

            if not self.config.enable_image_generation:
                assets.append(
                    GeneratedAsset(
                        meme_id=prompt.meme_id,
                        filename_slug=prompt.filename_slug,
                        raw_image_path=None,
                        final_image_path=None,
                        prompt_path=str(prompt_path),
                        image_generation_status="failed",
                        overlay_status="skipped",
                        failure_reason="Image generation disabled by configuration.",
                    )
                )
                self.logger.append({"step": "image_generation", "status": "skipped", "meme_id": prompt.meme_id})
                continue

            raw_path = images_dir / f"{prompt.filename_slug}.{prompt.output_format}"
            try:
                self._render_raw_image(raw_path, concept, prompt)
                assets.append(
                    GeneratedAsset(
                        meme_id=prompt.meme_id,
                        filename_slug=prompt.filename_slug,
                        raw_image_path=str(raw_path),
                        final_image_path=None,
                        prompt_path=str(prompt_path),
                        image_generation_status="generated",
                        overlay_status="pending",
                    )
                )
                self.logger.append({"step": "image_generation", "status": "generated", "meme_id": prompt.meme_id, "file": str(raw_path)})
            except Exception as exc:
                assets.append(
                    GeneratedAsset(
                        meme_id=prompt.meme_id,
                        filename_slug=prompt.filename_slug,
                        raw_image_path=None,
                        final_image_path=None,
                        prompt_path=str(prompt_path),
                        image_generation_status="failed",
                        overlay_status="skipped",
                        failure_reason=str(exc),
                    )
                )
                self.logger.append({"step": "image_generation", "status": "failed", "meme_id": prompt.meme_id, "reason": str(exc)})
        return assets

    def _render_raw_image(self, output_path: Path, concept: MemeConcept, prompt: ImagePrompt) -> None:
        width, height = (1024, 1024)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        rng = random.Random(prompt.filename_slug)
        background, accent, ink, secondary = PALETTE_LIBRARY[rng.randrange(len(PALETTE_LIBRARY))]
        image = Image.new("RGBA", (width, height), background)
        draw = ImageDraw.Draw(image)

        self._draw_gradient_background(draw, width, height, background, accent, secondary)
        self._draw_scene(draw, concept, width, height, accent, ink, secondary, rng)
        image.save(output_path)

    def _draw_gradient_background(self, draw: ImageDraw.ImageDraw, width: int, height: int, background: str, accent: str, secondary: str) -> None:
        base_rgb = ImageColor.getrgb(background)
        accent_rgb = ImageColor.getrgb(accent)
        for y in range(height):
            ratio = y / max(1, height - 1)
            color = tuple(
                int(base_rgb[index] * (1 - ratio) + accent_rgb[index] * ratio * 0.35)
                for index in range(3)
            )
            draw.line((0, y, width, y), fill=color)
        draw.ellipse((70, 100, 350, 380), fill=self._with_alpha(accent, 48))
        draw.ellipse((720, 120, 980, 390), fill=self._with_alpha(secondary, 52))
        draw.ellipse((760, 700, 1030, 980), fill=self._with_alpha(accent, 36))
        draw.rectangle((0, 0, width, 132), fill=self._with_alpha("#FFFFFF", 90))
        draw.rectangle((0, height - 132, width, height), fill=self._with_alpha("#FFFFFF", 90))

    def _draw_scene(
        self,
        draw: ImageDraw.ImageDraw,
        concept: MemeConcept,
        width: int,
        height: int,
        accent: str,
        ink: str,
        secondary: str,
        rng: random.Random,
    ) -> None:
        description = concept.visual_scene_description.lower()
        if any(token in description for token in ("robot", "assistant", "workflow")):
            self._draw_ai_scene(draw, width, height, accent, ink, secondary)
        elif any(token in description for token in ("gaming", "controller", "queue", "patch")):
            self._draw_gaming_scene(draw, width, height, accent, ink, secondary)
        elif any(token in description for token in ("streaming", "sofa", "couch", "watchlist", "television")):
            self._draw_streaming_scene(draw, width, height, accent, ink, secondary)
        elif any(token in description for token in ("phone", "battery", "app panels", "notification")):
            self._draw_phone_scene(draw, width, height, accent, ink, secondary)
        else:
            self._draw_office_scene(draw, width, height, accent, ink, secondary, rng)

        if "coffee" in description:
            self._draw_coffee(draw, (760, 720), secondary, ink)
        if "calendar" in description:
            self._draw_calendar(draw, (120, 700), accent, ink)

    def _draw_ai_scene(self, draw: ImageDraw.ImageDraw, width: int, height: int, accent: str, ink: str, secondary: str) -> None:
        self._draw_desk(draw, width, height, ink)
        self._draw_monitor(draw, (220, 300, 520, 560), accent, ink)
        self._draw_monitor(draw, (540, 260, 820, 520), secondary, ink)
        self._draw_robot(draw, (150, 410), accent, ink)
        for idx, offset in enumerate((0, 70, 140, 210)):
            x = 580 + offset
            draw.rounded_rectangle((x, 560, x + 90, 640), radius=18, fill=self._with_alpha(accent if idx % 2 == 0 else secondary, 210), outline=ink, width=4)
            draw.line((x + 18, 585, x + 72, 585), fill=ink, width=4)
            draw.line((x + 18, 610, x + 56, 610), fill=ink, width=4)

    def _draw_gaming_scene(self, draw: ImageDraw.ImageDraw, width: int, height: int, accent: str, ink: str, secondary: str) -> None:
        self._draw_monitor(draw, (190, 220, 834, 560), accent, ink)
        for idx in range(4):
            x = 250 + idx * 130
            draw.rounded_rectangle((x, 280, x + 100, 340), radius=14, fill=self._with_alpha(secondary, 180), outline=ink, width=4)
            draw.line((x + 16, 302, x + 84, 302), fill=ink, width=4)
            draw.line((x + 16, 322, x + 62, 322), fill=ink, width=4)
        self._draw_controller(draw, (370, 640), accent, ink)
        self._draw_character(draw, (180, 700), secondary, ink, surprised=True)
        self._draw_character(draw, (780, 700), accent, ink, surprised=True)

    def _draw_streaming_scene(self, draw: ImageDraw.ImageDraw, width: int, height: int, accent: str, ink: str, secondary: str) -> None:
        draw.rounded_rectangle((190, 600, 834, 830), radius=34, fill=self._with_alpha(accent, 200), outline=ink, width=6)
        draw.rounded_rectangle((220, 240, 804, 520), radius=24, fill=self._with_alpha(secondary, 200), outline=ink, width=6)
        for row in range(2):
            for col in range(4):
                x = 260 + col * 125
                y = 280 + row * 90
                draw.rounded_rectangle((x, y, x + 95, y + 58), radius=12, fill=self._with_alpha("#FFFFFF", 170), outline=ink, width=3)
        self._draw_character(draw, (510, 720), "#FFFFFF", ink, surprised=True)
        draw.ellipse((670, 760, 760, 840), fill=self._with_alpha("#FFD166", 240), outline=ink, width=4)
        for idx in range(8):
            px = 690 + (idx % 4) * 18
            py = 780 + (idx // 4) * 18
            draw.ellipse((px, py, px + 10, py + 10), fill=ink)

    def _draw_phone_scene(self, draw: ImageDraw.ImageDraw, width: int, height: int, accent: str, ink: str, secondary: str) -> None:
        draw.rounded_rectangle((340, 190, 690, 810), radius=46, fill=self._with_alpha("#FFFFFF", 220), outline=ink, width=7)
        draw.rounded_rectangle((390, 250, 640, 720), radius=24, fill=self._with_alpha(accent, 80), outline=ink, width=4)
        for idx in range(6):
            y = 290 + idx * 65
            draw.rounded_rectangle((420, y, 610, y + 40), radius=10, fill=self._with_alpha(secondary, 170), outline=ink, width=2)
        draw.rounded_rectangle((430, 640, 600, 690), radius=14, fill=self._with_alpha("#FF6B6B", 210), outline=ink, width=3)
        draw.rectangle((610, 645, 628, 685), fill=self._with_alpha("#FF6B6B", 210), outline=ink, width=3)
        for idx in range(5):
            x = 110 + idx * 150
            draw.rounded_rectangle((x, 700 - (idx % 2) * 40, x + 110, 770 - (idx % 2) * 40), radius=22, fill=self._with_alpha(secondary, 170), outline=ink, width=4)

    def _draw_office_scene(self, draw: ImageDraw.ImageDraw, width: int, height: int, accent: str, ink: str, secondary: str, rng: random.Random) -> None:
        self._draw_desk(draw, width, height, ink)
        self._draw_monitor(draw, (210, 250, 470, 500), accent, ink)
        self._draw_monitor(draw, (500, 220, 800, 480), secondary, ink)
        self._draw_character(draw, (150, 690), accent, ink, surprised=False)
        for idx in range(5):
            x = 610 + idx * 55
            y = 560 + (idx % 2) * 32
            draw.rounded_rectangle((x, y, x + 40, y + 56), radius=8, fill=self._with_alpha(accent if idx % 2 == 0 else secondary, 180), outline=ink, width=3)
        for idx in range(3):
            x = 250 + idx * 130
            y = 570 + idx * 20
            draw.rounded_rectangle((x, y, x + 90, y + 65), radius=12, fill=self._with_alpha("#FFFFFF", 150), outline=ink, width=3)
            draw.line((x + 16, y + 22, x + 76, y + 22), fill=ink, width=4)
            draw.line((x + 16, y + 42, x + 62, y + 42), fill=ink, width=4)
        if rng.random() > 0.45:
            self._draw_coffee(draw, (820, 690), secondary, ink)

    def _draw_desk(self, draw: ImageDraw.ImageDraw, width: int, height: int, ink: str) -> None:
        draw.rounded_rectangle((120, 640, 920, 860), radius=26, fill=self._with_alpha("#FFFFFF", 150), outline=ink, width=6)
        draw.rectangle((170, 845, 230, 980), fill=self._with_alpha("#D4A373", 220), outline=ink, width=4)
        draw.rectangle((810, 845, 870, 980), fill=self._with_alpha("#D4A373", 220), outline=ink, width=4)

    def _draw_monitor(self, draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, ink: str) -> None:
        left, top, right, bottom = box
        draw.rounded_rectangle(box, radius=26, fill=self._with_alpha("#FFFFFF", 220), outline=ink, width=6)
        draw.rounded_rectangle((left + 18, top + 18, right - 18, bottom - 18), radius=18, fill=self._with_alpha(fill, 140), outline=ink, width=4)
        draw.rectangle(((left + right) / 2 - 18, bottom, (left + right) / 2 + 18, bottom + 42), fill=self._with_alpha("#8D99AE", 220), outline=ink, width=3)
        draw.rounded_rectangle((left + 36, top + 42, right - 60, top + 78), radius=10, fill=self._with_alpha("#FFFFFF", 170), outline=ink, width=3)
        draw.line((left + 54, top + 60, right - 96, top + 60), fill=ink, width=4)

    def _draw_robot(self, draw: ImageDraw.ImageDraw, origin: tuple[int, int], fill: str, ink: str) -> None:
        x, y = origin
        draw.rounded_rectangle((x, y - 120, x + 140, y + 20), radius=24, fill=self._with_alpha(fill, 220), outline=ink, width=5)
        draw.ellipse((x + 26, y - 82, x + 56, y - 52), fill="white", outline=ink, width=3)
        draw.ellipse((x + 84, y - 82, x + 114, y - 52), fill="white", outline=ink, width=3)
        draw.ellipse((x + 37, y - 71, x + 47, y - 61), fill=ink)
        draw.ellipse((x + 95, y - 71, x + 105, y - 61), fill=ink)
        draw.line((x + 46, y - 20, x + 94, y - 20), fill=ink, width=4)
        draw.line((x + 70, y - 120, x + 70, y - 150), fill=ink, width=4)
        draw.ellipse((x + 58, y - 160, x + 82, y - 136), fill=self._with_alpha("#FFD166", 220), outline=ink, width=3)
        draw.line((x + 30, y + 20, x, y + 90), fill=ink, width=6)
        draw.line((x + 110, y + 20, x + 140, y + 90), fill=ink, width=6)
        draw.line((x + 44, y + 20, x + 30, y + 110), fill=ink, width=6)
        draw.line((x + 96, y + 20, x + 110, y + 110), fill=ink, width=6)

    def _draw_character(self, draw: ImageDraw.ImageDraw, origin: tuple[int, int], fill: str, ink: str, surprised: bool) -> None:
        x, y = origin
        draw.ellipse((x - 46, y - 172, x + 46, y - 80), fill=self._with_alpha("#FDE2C5", 255), outline=ink, width=4)
        draw.rounded_rectangle((x - 64, y - 86, x + 64, y + 66), radius=28, fill=self._with_alpha(fill, 220), outline=ink, width=5)
        draw.line((x - 24, y + 66, x - 36, y + 160), fill=ink, width=6)
        draw.line((x + 24, y + 66, x + 36, y + 160), fill=ink, width=6)
        draw.line((x - 64, y - 16, x - 124, y + 30), fill=ink, width=6)
        draw.line((x + 64, y - 16, x + 124, y + 16), fill=ink, width=6)
        draw.ellipse((x - 20, y - 140, x - 8, y - 128), fill=ink)
        draw.ellipse((x + 8, y - 140, x + 20, y - 128), fill=ink)
        if surprised:
            draw.ellipse((x - 10, y - 114, x + 10, y - 94), outline=ink, width=4)
        else:
            draw.line((x - 16, y - 102, x + 16, y - 98), fill=ink, width=4)

    def _draw_controller(self, draw: ImageDraw.ImageDraw, origin: tuple[int, int], fill: str, ink: str) -> None:
        x, y = origin
        draw.rounded_rectangle((x - 160, y - 50, x + 160, y + 80), radius=50, fill=self._with_alpha(fill, 220), outline=ink, width=6)
        draw.ellipse((x - 92, y - 8, x - 44, y + 40), fill=self._with_alpha("#FFFFFF", 220), outline=ink, width=3)
        draw.ellipse((x + 44, y - 8, x + 92, y + 40), fill=self._with_alpha("#FFFFFF", 220), outline=ink, width=3)
        draw.line((x - 120, y + 16, x - 56, y + 16), fill=ink, width=5)
        draw.line((x - 88, y - 16, x - 88, y + 48), fill=ink, width=5)
        for cx, cy in ((x + 88, y + 0), (x + 120, y + 26), (x + 56, y + 26), (x + 88, y + 52)):
            draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=ink)

    def _draw_calendar(self, draw: ImageDraw.ImageDraw, origin: tuple[int, int], fill: str, ink: str) -> None:
        x, y = origin
        draw.rounded_rectangle((x, y, x + 170, y + 150), radius=18, fill=self._with_alpha("#FFFFFF", 220), outline=ink, width=5)
        draw.rectangle((x, y, x + 170, y + 36), fill=self._with_alpha(fill, 220), outline=ink, width=4)
        for row in range(3):
            for col in range(4):
                left = x + 16 + col * 36
                top = y + 50 + row * 28
                draw.rectangle((left, top, left + 22, top + 16), outline=ink, width=2)

    def _draw_coffee(self, draw: ImageDraw.ImageDraw, origin: tuple[int, int], fill: str, ink: str) -> None:
        x, y = origin
        draw.rounded_rectangle((x, y, x + 88, y + 98), radius=16, fill=self._with_alpha("#FFFFFF", 220), outline=ink, width=4)
        draw.arc((x + 62, y + 20, x + 104, y + 72), start=270, end=90, fill=ink, width=4)
        draw.ellipse((x + 10, y + 14, x + 78, y + 36), fill=self._with_alpha(fill, 220), outline=ink, width=3)
        draw.arc((x + 18, y - 20, x + 42, y + 8), start=0, end=180, fill=ink, width=3)
        draw.arc((x + 44, y - 28, x + 70, y + 0), start=0, end=180, fill=ink, width=3)

    def _with_alpha(self, color: str, alpha: int) -> tuple[int, int, int, int]:
        red, green, blue = ImageColor.getrgb(color)
        return (red, green, blue, alpha)


class CaptionAndTextOverlayAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def apply(self, assets: list[GeneratedAsset], concepts: list[MemeConcept], final_dir: Path) -> list[GeneratedAsset]:
        concept_by_id = {concept.meme_id: concept for concept in concepts}
        final_dir.mkdir(parents=True, exist_ok=True)

        for asset in assets:
            if asset.image_generation_status != "generated" or not asset.raw_image_path:
                continue
            if not self.config.enable_text_overlay:
                asset.overlay_status = "skipped"
                self.logger.append({"step": "overlay", "status": "skipped", "meme_id": asset.meme_id})
                continue

            concept = concept_by_id[asset.meme_id]
            target_path = final_dir / f"{asset.filename_slug}_final.{self.config.image_format}"
            self._render_overlay(Path(asset.raw_image_path), target_path, concept)
            asset.final_image_path = str(target_path)
            asset.overlay_status = "generated"
            self.logger.append({"step": "overlay", "status": "generated", "meme_id": asset.meme_id, "file": str(target_path)})
        return assets

    def _render_overlay(self, source_path: Path, output_path: Path, concept: MemeConcept) -> None:
        image = Image.open(source_path).convert("RGBA")
        overlay = Image.new("RGBA", image.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)
        width, height = image.size
        draw.rectangle((0, 0, width, 154), fill=(20, 20, 20, 125))
        draw.rectangle((0, height - 154, width, height), fill=(20, 20, 20, 125))

        self._draw_caption(draw, concept.caption_top, 48, width, 24)
        self._draw_caption(draw, concept.caption_bottom, 46, width, height - 132)

        combined = Image.alpha_composite(image, overlay)
        combined.save(output_path)

    def _draw_caption(self, draw: ImageDraw.ImageDraw, text: str, base_size: int, width: int, top: int) -> None:
        max_width = width - 80
        max_height = 110
        chosen_font: ImageFont.ImageFont | None = None
        chosen_text = text.upper()
        chosen_spacing = 8
        chosen_stroke = 4

        for size in range(base_size, 23, -2):
            font = load_font(size)
            wrap_width = max(10, min(28, int(max_width / max(12, size * 0.58))))
            wrapped = textwrap.fill(text.upper(), width=wrap_width)
            spacing = max(4, size // 6)
            stroke = max(2, size // 12)
            bbox = draw.multiline_textbbox((0, 0), wrapped, font=font, spacing=spacing, stroke_width=stroke)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            if text_width <= max_width and text_height <= max_height:
                chosen_font = font
                chosen_text = wrapped
                chosen_spacing = spacing
                chosen_stroke = stroke
                break

        if chosen_font is None:
            chosen_font = load_font(24)
            chosen_text = textwrap.fill(text.upper(), width=28)
            chosen_spacing = 4
            chosen_stroke = 2

        bbox = draw.multiline_textbbox(
            (0, 0),
            chosen_text,
            font=chosen_font,
            spacing=chosen_spacing,
            stroke_width=chosen_stroke,
        )
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (width - text_width) / 2
        y = top + max(0, (110 - text_height) / 2)
        draw.multiline_text(
            (x, y),
            chosen_text,
            font=chosen_font,
            fill="white",
            align="center",
            spacing=chosen_spacing,
            stroke_width=chosen_stroke,
            stroke_fill="black",
        )


class MetadataAndAuditAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def save(
        self,
        metadata_dir: Path,
        approved_topics: list[CandidateTopic],
        rejected_topics: list[RejectedTopic],
        meme_concepts: list[MemeConcept],
        image_prompts: list[ImagePrompt],
        assets: list[GeneratedAsset],
        warnings: list[str],
    ) -> None:
        metadata_dir.mkdir(parents=True, exist_ok=True)
        write_json(metadata_dir / "approved_topics.json", [asdict(item) for item in approved_topics])
        write_json(metadata_dir / "rejected_topics.json", [asdict(item) for item in rejected_topics])
        write_json(metadata_dir / "meme_concepts.json", [asdict(item) for item in meme_concepts])
        write_json(metadata_dir / "image_prompts.json", [asdict(item) for item in image_prompts])
        write_json(metadata_dir / "generation_log.json", self.logger)
        write_json(
            metadata_dir / "run_summary.json",
            {
                "run_date": self.config.resolved_run_date(),
                "config": asdict(self.config),
                "counts": {
                    "topics_approved": len(approved_topics),
                    "topics_rejected": len(rejected_topics),
                    "meme_concepts": len(meme_concepts),
                    "images_generated": sum(1 for asset in assets if asset.image_generation_status == "generated"),
                    "final_memes_ready": sum(1 for asset in assets if asset.final_image_path),
                },
                "warnings": warnings,
                "assets": [asdict(asset) for asset in assets],
                "model_notes": {
                    "research_mode": "Google News RSS search plus deterministic scoring" if self.config.enable_web_research else "fallback topics only",
                    "image_mode": "local procedural illustration via Pillow" if self.config.enable_image_generation else "prompts only",
                    "overlay_mode": "caption overlay via Pillow" if self.config.enable_text_overlay else "disabled",
                },
            },
        )


class FinalReviewAgent:
    def __init__(self, config: Config, logger: list[dict[str, Any]]):
        self.config = config
        self.logger = logger

    def review(self, metadata_dir: Path, assets: list[GeneratedAsset], concepts: list[MemeConcept], prompts: list[ImagePrompt]) -> list[dict[str, Any]]:
        concept_by_id = {concept.meme_id: concept for concept in concepts}
        prompt_by_id = {prompt.meme_id: prompt for prompt in prompts}
        reviews: list[dict[str, Any]] = []

        for asset in assets:
            concept = concept_by_id.get(asset.meme_id)
            prompt = prompt_by_id.get(asset.meme_id)
            approved = True
            reason = "Approved. Technical checks passed and prompt/caption content stayed within safety rules."
            fix = None

            if not asset.final_image_path or not Path(asset.final_image_path).exists():
                approved = False
                reason = "Final meme image missing."
                fix = "Re-run overlay generation for this asset."
            elif concept is None or prompt is None:
                approved = False
                reason = "Concept or prompt metadata missing."
                fix = "Regenerate metadata for this meme."
            else:
                combined_text = " ".join([
                    concept.caption_top,
                    concept.caption_bottom,
                    concept.alternative_caption,
                    concept.visual_scene_description,
                ]).lower()
                for blocked in PROMPT_BLOCKLIST:
                    if blocked in combined_text:
                        approved = False
                        reason = f"Blocked term detected during final review: {blocked}."
                        fix = "Revise prompt or caption and regenerate the asset."
                        break
                if approved:
                    with Image.open(asset.final_image_path) as image:
                        if image.width < 512 or image.height < 512:
                            approved = False
                            reason = "Rendered image resolution is too small."
                            fix = "Render the meme again at 1024x1024 or larger."

            item = {
                "meme_id": asset.meme_id,
                "filename": Path(asset.final_image_path).name if asset.final_image_path else None,
                "approved": approved,
                "reason": reason,
                "required_fix_if_rejected": fix,
            }
            reviews.append(item)
            self.logger.append({"step": "final_review", "status": "approved" if approved else "rejected", "meme_id": asset.meme_id, "reason": reason})

        write_json(metadata_dir / "final_review.json", reviews)
        return reviews


class TrendMemeFactory:
    def __init__(self, config: Config | None = None):
        self.config = config or Config()
        self.logger: list[dict[str, Any]] = []

    def run(self) -> dict[str, Any]:
        run_date = self.config.resolved_run_date()
        output_root = Path(self.config.output_root)
        run_dir = output_root / run_date
        images_dir = run_dir / "images"
        final_dir = run_dir / "final"
        prompts_dir = run_dir / "prompts"
        metadata_dir = run_dir / "metadata"

        research_agent = TrendResearchAgent(self.config, self.logger)
        safety_agent = SafetyReviewAgent(self.config, self.logger)
        strategy_agent = MemeStrategyAgent(self.config, self.logger)
        prompt_agent = PromptEngineeringAgent(self.config, self.logger)
        image_agent = ImageGenerationAgent(self.config, self.logger)
        overlay_agent = CaptionAndTextOverlayAgent(self.config, self.logger)
        metadata_agent = MetadataAndAuditAgent(self.config, self.logger)
        final_review_agent = FinalReviewAgent(self.config, self.logger)

        researched_topics, warnings = research_agent.research()
        approved_topics, rejected_topics = safety_agent.review(researched_topics)

        if not approved_topics:
            warnings.append("Safety review approved no live topics; using safe evergreen fallback topics.")
            approved_topics = self._fallback_topics()
            rejected_topics = rejected_topics[:]

        approved_topics = approved_topics[: max(1, min(self.config.max_topics_to_approve, math.ceil(self.config.max_final_memes / max(1, self.config.memes_per_topic))))]
        meme_concepts = strategy_agent.build_concepts(approved_topics)
        image_prompts = prompt_agent.build_prompts(meme_concepts)
        assets = image_agent.generate(meme_concepts, image_prompts, images_dir, prompts_dir)
        assets = overlay_agent.apply(assets, meme_concepts, final_dir)
        metadata_agent.save(metadata_dir, approved_topics, rejected_topics, meme_concepts, image_prompts, assets, warnings)
        review = final_review_agent.review(metadata_dir, assets, meme_concepts, image_prompts)

        result = {
            "run_date": run_date,
            "output_folder": str(run_dir.resolve()),
            "counts": {
                "topics_researched": len(researched_topics),
                "topics_approved": len(approved_topics),
                "topics_rejected": len(rejected_topics),
                "meme_concepts": len(meme_concepts),
                "images_generated": sum(1 for asset in assets if asset.image_generation_status == "generated"),
                "final_memes_approved": sum(1 for item in review if item["approved"]),
            },
            "warnings": warnings,
        }
        return result

    def _fallback_topics(self) -> list[CandidateTopic]:
        fallback: list[CandidateTopic] = []
        for index, item in enumerate(FALLBACK_TOPICS, start=1):
            fallback.append(
                CandidateTopic(
                    topic_id=f"fallback-{index:02d}",
                    title=item["title"],
                    short_summary=item["summary"],
                    why_it_is_trending="Fallback topic selected because live research was unavailable or rejected.",
                    source_urls=[],
                    publication_dates=[self.config.resolved_run_date()],
                    category=item["category"],
                    freshness_score=5,
                    meme_potential_score=meme_score_for_category(item["category"]),
                    safety_risk_score=1,
                    safety_notes="Fallback topic pre-approved for safe humor.",
                )
            )
        return fallback[: self.config.max_topics_to_approve]