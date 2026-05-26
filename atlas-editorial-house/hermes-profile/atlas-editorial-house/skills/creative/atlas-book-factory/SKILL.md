---
name: atlas-book-factory
description: Use when you want Hermes to autonomously produce a complete book manuscript, from a single brief to finished chapter files, without requiring human input between stages.
version: 1.0.0
author: Atlas Editorial House
license: MIT
metadata:
  hermes:
    tags: [book, autonomous, production, orchestration, director, multi-agent, translation]
    related_skills: [atlas-writers-room, atlas-editorial-house, atlas-canon-memory, atlas-final-review]
---

# Atlas Book Factory

## Overview

This skill activates the Director-led autonomous book production pipeline. Use it when you want a
single brief to become a complete, file-persisted manuscript with no manual steps between the brief
and the finished book.

The Director agent orchestrates the full pipeline: team selection, planning documents, chapter
drafting, quality gates, continuity checks, translation (if required), and final manifest.

This is not a planning skill. By the time this skill completes, there must be real files on disk.

## When to Use

- The user supplies a brief that describes a book and wants the full manuscript written and saved.
- The project requires more than an outline.
- The brief includes bilingual requirements, a specific chapter count, or a word-count minimum.
- The user does not want to intervene between planning and writing.

Do not use this skill for:

- planning-only tasks where the user wants to see the outline first and decide whether to proceed
- single-chapter requests that do not need a full pipeline
- editorial review of an existing manuscript (use `atlas-final-review` instead)
- adversarial publication hearings (use `atlas-trial-mode` instead)

## Pipeline Stages

The Director drives the following stages in order. Each stage produces one or more files before
the next stage begins.

### Stage 0: Brief Parsing

Extract from the user input:

- Title (or generate one if missing)
- Theme and genre
- Chapter count (default 20 if not specified)
- Minimum words per chapter (default 3000 if not specified)
- Language requirements (English only, English plus Italian, or other bilingual pair)
- Style constraints or imprint preference (Atlas Noir, Atlas Civic, Atlas Lab, Atlas Heresy,
  Atlas Sunday Review)
- Output directory slug (derive from title if not specified)

### Stage 1: Team Assembly

Select from the Atlas roster:

- Lead: owns structure, architecture, and first-pass chapter drafts
- Reviewer: checks quality against the brief, flags pacing and logic issues
- Critic: stress-tests assumptions, melodrama, drift, and weak resolutions
- Refiner: improves transitions, interior consistency, and tonal continuity
- Finisher: compresses, normalizes, and approves each chapter for shipment

Write the team, route, handoff sequence, and definition of done to:

    local-output/books/<slug>/00_work_order.md

### Stage 2: Planning Documents

Produce the following before any chapter is drafted:

- `01_outline.md`: chapter-by-chapter outline for all chapters with title, core plot point, and
  thematic thread for each
- `02_voice_guide.md`: narrative POV, sentence rhythm, dialogue policy, emotional register, and
  revision guardrails
- `03_character_bible.md`: major and secondary characters with motivations, contradictions, arcs,
  and relationships
- `04_revision_strategy.md`: structural pass rules, stylistic pass rules, critic checklist, and
  finisher sign-off criteria

All four files must exist before Stage 3 begins.

### Stage 3: Chapter Production

For each chapter from 1 to N:

1. Lead drafts the chapter to at least the minimum word count.
2. Reviewer checks quality: pacing, motive, consistency with outline and character bible.
3. Critic stress-tests: melodrama, unearned resolution, voice drift, structural gaps.
4. Refiner improves: transitions, tonal flow, interior continuity.
5. Finisher approves: removes padding, normalizes terminology, records completion.

Write each completed chapter to:

    local-output/books/<slug>/chapter<NN>.md

where `<NN>` is zero-padded (01, 02, ... 20).

If a chapter file already exists and is non-empty, treat it as complete and skip to the next gap.

Update `03_character_bible.md` if any name, institution, or relationship changes during drafting.

### Stage 4: Translation (if required)

After all English chapters are complete:

1. Translate each chapter into the target language, preserving meaning, tone, structure, and
   emotional force in natural idiomatic target-language prose.
2. Write each translated chapter to:

        local-output/books/<slug>/<lang-code>/chapter<NN>.<lang-code>.md

3. Write translation decisions, especially for political language, family register, and
   emotionally charged passages, to:

        local-output/books/<slug>/98_translation_notes.md

### Stage 5: Manifest

Write the final production record to:

    local-output/books/<slug>/99_manifest.md

The manifest must include:

- Every file created with its path and creation status
- English chapter word counts
- Translation chapter word counts if applicable
- Completion status for each file (complete / incomplete / missing)
- Any unresolved editorial risks

The project is complete when every required file shows `complete` in the manifest.

## Quality Rules

- No chapter ships until the finisher signs off.
- The critic must name at least one specific risk per chapter: melodrama, drift, abstraction,
  unearned resolution, or voice inconsistency.
- Continuity checks run after every chapter, not only at the end.
- The book must feel like one coherent novel, not a sequence of disconnected episodes.

## Resumption Protocol

If the pipeline is interrupted:

1. Read `99_manifest.md` if it exists to identify the last completed file.
2. If `99_manifest.md` does not exist, scan `local-output/books/<slug>/` for existing chapter
   files and resume from the next missing chapter.
3. Do not re-draft chapters that already exist and meet the minimum word count.
4. Announce resumption: state which files exist, which are missing, and where production resumes.

## Autonomy Contract

When this skill is active:

- Do not stop to ask for confirmation between stages.
- Do not return only a plan. Write the files.
- Do not ask what to do next unless a fatal ambiguity prevents the pipeline from continuing.
- Stop only when `99_manifest.md` records the project as complete.
