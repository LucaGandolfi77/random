#!/usr/bin/env python3
"""
OpenRouter Creative Writing Agent
=================================

Agente multi-step per:
1. Analisi
2. Writing
3. Editing
4. Translation
5. Final Markdown Output

Compatibile con OpenRouter API.

Requirements:
    pip install requests

Usage:
    export OPENROUTER_API_KEY=""
    python creative_agent.py

"""

import os
import json
import textwrap
import requests
from dataclasses import dataclass
from pathlib import Path


# ============================================================
# CONFIG
# ============================================================

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

DEFAULT_MODEL = "google/gemma-4-31b-it:free"

FREE_FALLBACK_MODELS = [
    "google/gemma-4-31b-it:free",
    "openrouter/free",
    "openai/gpt-oss-20b:free",
    "google/gemini-2.0-flash-exp:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
]

HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost",
    "X-Title": "Creative Writing Agent"
}


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
# Role Definition

You are an Auto-Hosted Linguistic and Creative Agent specialized in:
- Creative writing
- Literary editing
- Stylistic refinement
- English to Italian translation

You must follow this pipeline:

1. ANALYSIS
2. WRITING
3. EDITING
4. TRANSLATION
5. FINAL OUTPUT

You must:
- Preserve tone and style
- Improve prose quality
- Maintain coherence
- Adapt culturally for Italian readers
- Produce elegant markdown

Never hallucinate real facts.
Never break the workflow.
"""


# ============================================================
# DATA STRUCTURES
# ============================================================

@dataclass
class AgentResult:
    analysis: str
    outline: str
    chapters_english: list
    chapters_italian: list
    final_markdown: str


# ============================================================
# OPENROUTER CLIENT
# ============================================================

class OpenRouterClient:

    def __init__(self, model=DEFAULT_MODEL, temperature=0.7):
        self.model = model
        self.temperature = temperature

    def chat(self, messages, max_tokens=4096):
        """
        Try self.model first, then each FREE_FALLBACK_MODELS in order.
        On any 4xx or 5xx error switch immediately to the next model.
        """
        candidates = [self.model]
        for m in FREE_FALLBACK_MODELS:
            if m not in candidates:
                candidates.append(m)

        last_exc = None
        for model in candidates:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": max_tokens,
            }
            try:
                response = requests.post(
                    BASE_URL,
                    headers=HEADERS,
                    json=payload,
                    timeout=300,
                )
            except requests.RequestException as exc:
                last_exc = exc
                print(f"  [network-error] {model} — {exc}, trying next model")
                continue

            if response.status_code == 200:
                try:
                    content = response.json()["choices"][0]["message"]["content"]
                    if not content:
                        raise ValueError("empty or null content")
                    return content
                except (KeyError, IndexError, ValueError) as exc:
                    print(f"  [bad-response] {model} — {exc}, switching to next model")
                    last_exc = exc
                    continue

            # Any 4xx or 5xx: immediately switch to the next model
            print(f"  [error {response.status_code}] {model} — switching to next model")
            last_exc = Exception(
                f"OpenRouter Error {response.status_code}\n{response.text}"
            )

        raise last_exc or Exception("All models failed without a specific error")


# ============================================================
# CREATIVE AGENT
# ============================================================

class CreativeWritingAgent:

    def __init__(
        self,
        model=DEFAULT_MODEL,
        temperature=0.7
    ):

        self.client = OpenRouterClient(
            model=model,
            temperature=temperature
        )

    # --------------------------------------------------------
    # STEP 0 — INVENT PREMISE (autonomous mode)
    # --------------------------------------------------------

    def invent_premise(self, genre: str = "") -> str:
        """
        Ask the model to invent a book title, genre and one-paragraph premise.
        Returns a compact string that can be passed straight into the pipeline
        as the user_input.
        """
        genre_hint = f"Genre: {genre}" if genre else "Pick any genre you find compelling."

        prompt = f"""
{genre_hint}

Invent a compelling book:
- A vivid, unique title
- A one-paragraph premise (2-4 sentences)
- The protagonist and their central conflict
- The emotional core

Return ONLY a single block of text in this format:

Title: <title>
Premise: <premise>
"""

        return self.client.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])

    # --------------------------------------------------------
    # STEP 1 — ANALYSIS
    # --------------------------------------------------------

    def analyze(self, user_input):

        prompt = f"""
Analyze the following user request.

Determine:
- literary style
- tone
- narrative structure
- emotional direction
- target audience
- suggested length

User Request:
{user_input}

Return a detailed analysis.
"""

        return self.client.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])

    # --------------------------------------------------------
    # STEP 2 — OUTLINE
    # --------------------------------------------------------

    def create_outline(self, user_input, analysis):

        prompt = f"""
Using the following analysis:

{analysis}

Create a detailed outline for a 20-chapter book.

For each chapter provide:
- Chapter number
- Chapter title
- A 2-3 sentence summary of what happens

User Request:
{user_input}

Return ONLY the outline, one entry per chapter.
"""

        return self.client.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])

    # --------------------------------------------------------
    # STEP 3 — WRITE CHAPTER
    # --------------------------------------------------------

    def write_chapter(self, chapter_num, chapter_outline, user_input):

        prompt = f"""
Write Chapter {chapter_num} of the book.

Full story outline (use as blueprint):
{chapter_outline}

User Request / Overall premise:
{user_input}

Requirements:
- Full prose, 2000-2500 words
- Emotionally rich and stylistically refined
- Narratively coherent with the overall story
- Include inner monologue and vivid descriptions
- Edit for prose quality as you write

Return ONLY the chapter text, starting with the chapter title as a Markdown ## heading.
"""

        return self.client.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])

    # --------------------------------------------------------
    # STEP 4 — TRANSLATE CHAPTER
    # --------------------------------------------------------

    def translate_chapter(self, chapter_text, chapter_num):

        prompt = f"""
Translate Chapter {chapter_num} into fluent, modern, idiomatic Italian.

Requirements:
- Natural Italian
- Preserve emotional tone and literary style
- Avoid literal translation
- Culturally adapt where necessary

Text:
{chapter_text}

Return ONLY the Italian version.
"""

        return self.client.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])

    # --------------------------------------------------------
    # STEP 5 — FINAL MARKDOWN
    # --------------------------------------------------------

    def build_markdown(
        self,
        user_input,
        analysis,
        outline,
        chapters_english,
        chapters_italian,
    ):

        title = "Generated Literary Work"

        chapters_en_text = "\n\n---\n\n".join(chapters_english)
        chapters_it_text = "\n\n---\n\n".join(chapters_italian)

        markdown = f"""
# {title}

## Analysis

{analysis}

---

## Outline

{outline}

---

# English Version (20 Chapters)

{chapters_en_text}

---

# Italian Version (20 Capitoli)

{chapters_it_text}
"""

        return textwrap.dedent(markdown)

    # --------------------------------------------------------
    # FULL PIPELINE — autonomous (no user input required)
    # --------------------------------------------------------

    def auto_run(self, genre: str = "") -> AgentResult:
        """
        Fully autonomous run: invent a premise, then execute the
        complete pipeline without any user interaction.
        """
        from datetime import datetime
        out_dir = Path("output") / datetime.now().strftime("%Y-%m-%d_%H%M%S")
        out_dir.mkdir(parents=True, exist_ok=True)

        premise_file = out_dir / "premise.md"
        print("\n[0/5] INVENTING BOOK PREMISE...")
        invented = self.invent_premise(genre)
        premise_file.write_text(invented, encoding="utf-8")
        print(f"\n--- Invented Premise ---\n{invented}\n")
        print(f"  saved → {premise_file}")
        return self.run(invented, out_dir=out_dir)

    # --------------------------------------------------------
    # FULL PIPELINE — interactive
    # --------------------------------------------------------

    def run(self, user_input, out_dir: Path = None):

        if out_dir is None:
            from datetime import datetime
            out_dir = Path("output") / datetime.now().strftime("%Y-%m-%d_%H%M%S")
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"  [output dir] {out_dir}")

        # ---- prompt (user input) ----
        prompt_file = out_dir / "prompt.md"
        if prompt_file.exists():
            print("\n[input] PROMPT — loading from disk...")
            user_input = prompt_file.read_text(encoding="utf-8")
        else:
            prompt_file.write_text(user_input, encoding="utf-8")
            print(f"  saved → {prompt_file}")

        # ---- analysis ----
        analysis_file = out_dir / "analysis.md"
        if analysis_file.exists():
            print("\n[1/5] ANALYSIS — loading from disk...")
            analysis = analysis_file.read_text(encoding="utf-8")
        else:
            print("\n[1/5] ANALYZING...")
            analysis = self.analyze(user_input)
            analysis_file.write_text(analysis, encoding="utf-8")
            print(f"  saved → {analysis_file}")

        # ---- outline ----
        outline_file = out_dir / "outline.md"
        if outline_file.exists():
            print("[2/5] OUTLINE — loading from disk...")
            outline = outline_file.read_text(encoding="utf-8")
        else:
            print("[2/5] CREATING OUTLINE (20 chapters)...")
            outline = self.create_outline(user_input, analysis)
            outline_file.write_text(outline, encoding="utf-8")
            print(f"  saved → {outline_file}")

        # ---- write chapters ----
        chapters_english = []
        print("[3/5] WRITING CHAPTERS...")
        for i in range(1, 21):
            chapter_file = out_dir / f"chapter_{i:02d}_en.md"
            if chapter_file.exists():
                print(f"  chapter {i}/20 — loading from disk...")
                chapter = chapter_file.read_text(encoding="utf-8")
            else:
                print(f"  writing chapter {i}/20...")
                chapter = self.write_chapter(i, outline, user_input)
                chapter_file.write_text(chapter, encoding="utf-8")
                print(f"    saved → {chapter_file}")
            chapters_english.append(chapter)

        # ---- translate chapters — only starts after ALL English chapters are written ----
        chapters_italian = []
        print(f"[4/5] TRANSLATING CHAPTERS (all {len(chapters_english)} English chapters ready)...")
        for i, chapter in enumerate(chapters_english, 1):
            italian_file = out_dir / f"chapter_{i:02d}_it.md"
            if italian_file.exists():
                print(f"  chapter {i}/20 — loading Italian from disk...")
                italian = italian_file.read_text(encoding="utf-8")
            else:
                print(f"  translating chapter {i}/20...")
                italian = self.translate_chapter(chapter, i)
                italian_file.write_text(italian, encoding="utf-8")
                print(f"    saved → {italian_file}")
            chapters_italian.append(italian)

        # ---- final markdown ----
        print("[5/5] BUILDING FINAL OUTPUT...")
        final_markdown = self.build_markdown(
            user_input,
            analysis,
            outline,
            chapters_english,
            chapters_italian,
        )
        book_file = out_dir / "book.md"
        book_file.write_text(final_markdown, encoding="utf-8")
        print(f"  saved → {book_file}")

        return AgentResult(
            analysis=analysis,
            outline=outline,
            chapters_english=chapters_english,
            chapters_italian=chapters_italian,
            final_markdown=final_markdown,
        )

    # keep a friendly alias
    auto = auto_run


# ============================================================
# MAIN
# ============================================================

def main():

    if not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY not set.")
        return

    print("=" * 60)
    print("OPENROUTER CREATIVE WRITING AGENT")
    print("=" * 60)

    mode = input(
        "\nMode — [1] Interactive  [2] Autonomous (auto-invent): "
    ).strip()

    model = input(
        f"\nModel [{DEFAULT_MODEL}]: "
    ).strip() or DEFAULT_MODEL

    agent = CreativeWritingAgent(
        model=model,
        temperature=0.8
    )

    if mode == "2":
        genre = input(
            "\nOptional genre hint (leave blank for free choice): "
        ).strip()
        result = agent.auto_run(genre=genre)
    else:
        user_prompt = input(
            "\nEnter your creative prompt:\n> "
        )
        import time
        from datetime import datetime
        out_dir = Path("output") / datetime.now().strftime("%Y-%m-%d_%H%M%S")
        result = agent.run(user_prompt, out_dir=out_dir)

    print("\n" + "=" * 60)
    print("FINAL OUTPUT")
    print("=" * 60)

    print(result.final_markdown)

    # Optional save
    save = input("\nSave output to file? (y/n): ")

    if save.lower() == "y":

        filename = "creative_output.md"

        with open(filename, "w", encoding="utf-8") as f:
            f.write(result.final_markdown)

        print(f"Saved to {filename}")
    else:
        print("\n(All chapters already saved in the output/ folder)")


if __name__ == "__main__":
    main()