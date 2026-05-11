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
    export OPENROUTER_API_KEY="sk-..."
    python creative_agent.py

"""

import os
import json
import textwrap
import requests
from dataclasses import dataclass


# ============================================================
# CONFIG
# ============================================================

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

DEFAULT_MODEL = "google/gemma-4-31b-it:free"

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
    english_draft: str
    edited_english: str
    italian_translation: str
    final_markdown: str


# ============================================================
# OPENROUTER CLIENT
# ============================================================

class OpenRouterClient:

    def __init__(self, model=DEFAULT_MODEL, temperature=0.7):
        self.model = model
        self.temperature = temperature

    def chat(self, messages, max_tokens=4096):

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": max_tokens
        }

        response = requests.post(
            BASE_URL,
            headers=HEADERS,
            json=payload,
            timeout=300
        )

        if response.status_code != 200:
            raise Exception(
                f"OpenRouter Error {response.status_code}\n"
                f"{response.text}"
            )

        data = response.json()

        return data["choices"][0]["message"]["content"]


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
    # STEP 2 — WRITING
    # --------------------------------------------------------

    def write_english(self, user_input, analysis):

        prompt = f"""
Using the following analysis:

{analysis}

Write the FULL English version.

Requirements:
- coherent
- emotionally rich
- stylistically refined
- natural prose
- literary quality

User Request:
{user_input}
"""

        return self.client.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])

    # --------------------------------------------------------
    # STEP 3 — EDITING
    # --------------------------------------------------------

    def edit_english(self, english_text):

        prompt = f"""
Perform a DEEP literary edit of the following text.

You must:
- improve prose
- improve rhythm
- fix grammar
- improve emotional consistency
- improve imagery
- remove awkward phrases
- maintain original tone

Text:
{english_text}

Return ONLY the edited version.
"""

        return self.client.chat([
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])

    # --------------------------------------------------------
    # STEP 4 — TRANSLATION
    # --------------------------------------------------------

    def translate_to_italian(self, edited_english):

        prompt = f"""
Translate the following text into fluent, modern, idiomatic Italian.

Requirements:
- natural Italian
- preserve emotional tone
- preserve literary style
- avoid literal translation
- culturally adapt where necessary

Text:
{edited_english}

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
        english_draft,
        edited_english,
        italian_translation
    ):

        title = "Generated Literary Work"

        synopsis = (
            "A creative literary piece generated through a multi-step "
            "pipeline including analysis, writing, editing, and translation."
        )

        markdown = f"""
# {title}

## Synopsis

{synopsis}

---

# Analysis

{analysis}

---

# English Draft

{english_draft}

---

# Edited English Version

{edited_english}

---

# Italian Version

{italian_translation}
"""

        return textwrap.dedent(markdown)

    # --------------------------------------------------------
    # FULL PIPELINE
    # --------------------------------------------------------

    def run(self, user_input):

        print("\\n[1/5] ANALYZING...")
        analysis = self.analyze(user_input)

        print("[2/5] WRITING ENGLISH...")
        english_draft = self.write_english(
            user_input,
            analysis
        )

        print("[3/5] EDITING...")
        edited_english = self.edit_english(
            english_draft
        )

        print("[4/5] TRANSLATING...")
        italian_translation = self.translate_to_italian(
            edited_english
        )

        print("[5/5] BUILDING FINAL OUTPUT...")
        final_markdown = self.build_markdown(
            user_input,
            analysis,
            english_draft,
            edited_english,
            italian_translation
        )

        return AgentResult(
            analysis=analysis,
            english_draft=english_draft,
            edited_english=edited_english,
            italian_translation=italian_translation,
            final_markdown=final_markdown
        )


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

    user_prompt = input(
        "\nEnter your creative prompt:\n> "
    )

    model = input(
        f"\nModel [{DEFAULT_MODEL}]: "
    ).strip()

    if not model:
        model = DEFAULT_MODEL

    agent = CreativeWritingAgent(
        model=model,
        temperature=0.8
    )

    result = agent.run(user_prompt)

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


if __name__ == "__main__":
    main()