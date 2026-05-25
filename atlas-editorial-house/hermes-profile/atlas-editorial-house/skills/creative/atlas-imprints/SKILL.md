---
name: atlas-imprints
description: Use when you want Hermes to choose a specific Atlas editorial imprint before drafting, so the work inherits a house line, tone, risk model, and routing defaults.
version: 1.0.0
author: Atlas Editorial House
license: MIT
metadata:
  hermes:
    tags: [editorial, imprints, tone, routing, publication, house-style]
    related_skills: [atlas-editorial-house, atlas-writers-room, atlas-final-review]
---

# Atlas Imprints

## Overview

This skill chooses the publication line before the draft exists. Use it when the work should feel like it belongs to a specific house imprint rather than to the Atlas bundle in general.

Imprints are not personalities. They are editorial envelopes with distinct missions, acceptable risks, tonal defaults, and routing logic.

Use this skill when the assignment needs publication posture, not just a lead writer.

## Available Imprints

### Atlas Noir

- Mission: investigations, urban dread, hidden systems, moral pressure
- Best leads: `bolano`, `poe`, `dostoevsky`, `bulgakov`
- Best for: investigative fiction, scandal dossiers, procedural darkness, forensic features
- Failure mode: atmosphere outruns evidence

### Atlas Civic

- Mission: public consequence, institutional accountability, social history, communal legibility
- Best leads: `achebe`, `morrison`, `allende`, `dickens`
- Best for: civic essays, public-interest features, historical narratives, social consequence long-form
- Failure mode: rhetoric outruns the public stake or the evidence

### Atlas Lab

- Mission: speculative systems, governance design, hybrid projects, software concepts
- Best leads: `le_guin`, `shelley`, `borges`
- Best for: architecture work, prototypes, speculative fiction, social-technical hybrids
- Failure mode: elegant model, weak execution

### Atlas Heresy

- Mission: revisionist arguments, anti-consensus essays, structural reversals, disciplined provocation
- Best leads: `cervantes`, `bulgakov`, `borges`, `oe`
- Best for: contrarian essays, revisionist criticism, manifesto work with review gates
- Failure mode: provocation without proof

### Atlas Sunday Review

- Mission: reflective long-form, criticism, humane features, elegant public-intellectual prose
- Best leads: `woolf`, `austen`, `morrison`, `hemingway`
- Best for: criticism, essays, review features, reflective longreads
- Failure mode: beauty without a governing claim

## When to Use

- The user wants the work to feel like it belongs to a specific publication line.
- The assignment would benefit from clear tonal defaults before drafting begins.
- The user is choosing among multiple editorial postures.
- The task needs a stronger filter on acceptable risk and acceptable style.

Do not use this skill for:

- trivial tasks with no publication identity
- routine code fixes where imprint posture adds no value
- parody or imitation of house styles

## Workflow

1. Identify the assignment type.
2. Identify the publication posture: investigative, civic, speculative, contrarian, or reflective.
3. Choose one imprint only.
4. State why that imprint fits better than the nearest alternative.
5. Name the lead, reviewer, and finisher that match the imprint.
6. Draft inside that imprint's tonal and risk envelope.

## Output Pattern

1. `Imprint:` chosen house line
2. `Why this imprint:` one or two sentences
3. `Route:` lead, reviewer, finisher
4. `Risk filter:` what the imprint will reject
5. `Draft:` only if the user wants execution now

## Quick Routing Heuristic

- If the work is about hidden institutions, scandal, evidence, and dread, choose `Atlas Noir`.
- If the work is about public consequence, community, history, or governance in lived terms, choose `Atlas Civic`.
- If the work is about systems, prototypes, speculative structures, or socio-technical design, choose `Atlas Lab`.
- If the work is about reversing consensus or making a disciplined heretical case, choose `Atlas Heresy`.
- If the work is about reflective long-form, criticism, or elegant serious prose, choose `Atlas Sunday Review`.

## Verification Checklist

- [ ] Exactly one imprint is selected.
- [ ] The imprint was justified against the task.
- [ ] The lead and reviewer fit the imprint rather than only the subject.
- [ ] The draft stays inside the imprint's risk envelope.
- [ ] No literary imitation appears.