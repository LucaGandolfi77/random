---
name: atlas-canon-memory
description: Use when you want Hermes to maintain a canon ledger of stable facts and a cemetery of cut material for recurring projects, series, or versioned systems.
version: 1.0.0
author: Atlas Editorial House
license: MIT
metadata:
  hermes:
    tags: [editorial, canon, continuity, archive, memory, versioning]
    related_skills: [atlas-editorial-house, atlas-writers-room, atlas-final-review]
---

# Atlas Canon Memory

## Overview

This skill gives Atlas a memory discipline for recurring work. It separates what is canon from what was cut, deferred, or rejected.

Use `local-output/canon/` for stable facts that future drafts must inherit.
Use `local-output/cemetery/` for discarded material that should remain searchable without becoming canonical.

## When to Use

- A project has recurring institutions, timelines, places, factions, or named entities.
- A book, series, product, or documentation set will be revised across multiple sessions.
- A major cut removed material that may still be useful later.
- The room is starting to contradict itself across drafts.

## Roles

1. `continuity_archivist`: owns the canon ledger and contradiction detection.
2. `copy_chief`: normalizes names, labels, and entry format.
3. `woolf` or `le_guin`: review continuity where humane flow or social-world logic matters.
4. `hemingway`: compresses the final ledger or cemetery note to what remains actionable.

## Workflow

1. Name the project or artifact under review.
2. Separate stable facts from provisional material.
3. Record stable facts in `local-output/canon/`.
4. Record removed but potentially reusable material in `local-output/cemetery/`.
5. Flag contradictions, drift, and silent retcons explicitly.
6. End with a short summary of what future work must now treat as binding.

## Output Pattern

1. `Project:` the world, system, or artifact under review
2. `Canon ledger:` stable facts, institutions, entities, dates, or decisions
3. `Contradictions found:` where the record drifted
4. `Cemetery entries:` what was cut and why it is preserved
5. `Binding guidance:` what future drafts must now honor

## Canon Rules

- Canon is binding until deliberately revised.
- Cemetery material is searchable but not authoritative.
- If a fact moves from cemetery into canon, record that as an explicit promotion.
- Never let a deleted fragment quietly remain implied in canon.

## Verification Checklist

- [ ] Canon and cemetery are kept separate.
- [ ] Stable facts are explicit rather than implied.
- [ ] Contradictions are named, not smoothed over.
- [ ] Cut material has a reason for preservation.
- [ ] Future drafts are told what is now binding.