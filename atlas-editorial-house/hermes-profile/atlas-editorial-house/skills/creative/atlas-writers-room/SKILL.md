---
name: atlas-writers-room
description: Use when you want Hermes to coordinate the Atlas Editorial House as a true writers' room with explicit routing, roles, handoffs, escalation, and finish decisions.
version: 1.0.0
author: Atlas Editorial House
license: MIT
metadata:
  hermes:
    tags: [editorial, coordination, orchestration, writing, code, planning, multi-agent]
    related_skills: [atlas-editorial-house]
---

# Atlas Writers' Room

## Overview

This skill is the coordination layer for The Atlas Editorial House. Use it when the user wants more than a stylistic overlay and instead needs a real newsroom workflow: lead assignment, reviewer selection, handoff structure, arbitration rules, and a clear path from brief to shipped output.

The purpose of this skill is not to make Hermes sound like a crowd talking at once. The purpose is to make Hermes think like a disciplined editorial operation.

Use it for books, essays, articles, research packages, technical documentation, software work, and hybrid narrative-plus-code projects when the assignment is large enough or risky enough that coordination matters.

## When to Use

- The user wants a writers' room rather than a single drafting voice.
- The task is long-form, high-stakes, ambiguous, or multi-domain.
- The work needs explicit roles such as lead, reviewer, critic, refiner, fact-checker, and finisher.
- The user wants a planning pass before drafting begins.
- The assignment combines writing and code.
- The brief is strong enough to support phased execution.

Do not use this skill for:

- one-paragraph routine answers
- trivial factual lookups
- situations where direct execution matters more than orchestration
- parody or literary impersonation requests

## Available Writers' Room Roles

Use these roles deliberately and keep them distinct:

1. **Lead**: owns structure and first-pass direction.
2. **Reviewer**: checks quality against the brief.
3. **Critic**: stress-tests assumptions and weak points.
4. **Refiner**: improves tone, transitions, and coherence.
5. **Fact-checker**: checks claims, boundaries, and uncertainty.
6. **Finisher**: compresses, normalizes, and approves shipment readiness.

## Default Agent Assignments

### Books

- Lead: `tolstoy` or `shakespeare`
- Reviewer: `austen`
- Critic: `poe`
- Refiner: `woolf`
- Fact-checker: `borges` or `dante`
- Finisher: `hemingway`

### Articles and Features

- Lead: `dickens`, `austen`, or `woolf`
- Reviewer: `austen`
- Critic: `poe`
- Refiner: `cervantes`
- Fact-checker: `austen` or `borges`
- Finisher: `hemingway`

### Research and Essays

- Lead: `borges`
- Reviewer: `austen`
- Critic: `kafka`
- Refiner: `woolf`
- Fact-checker: `dante`
- Finisher: `hemingway`

### Technical Writing

- Lead: `hemingway`
- Reviewer: `woolf`
- Critic: `kafka`
- Refiner: `austen`
- Fact-checker: `borges`
- Finisher: `hemingway`

### Code and Software Tools

- Lead: `shelley`
- Reviewer: `borges`
- Critic: `kafka` or `poe`
- Refiner: `hemingway`
- Fact-checker: `dante`
- Finisher: `hemingway`

### Hybrid Narrative Plus Code

- Lead: `shelley` or `shakespeare`
- Reviewer: `borges`
- Critic: `kafka`
- Refiner: `woolf`
- Fact-checker: `dante`
- Finisher: `hemingway`

## Operating Modes

### Solo Mode

Use solo mode when the assignment is narrow, low-risk, and naturally aligned to one lead persona.

### Pair Mode

Use pair mode when speed and review both matter.

Recommended pairings:

- `shakespeare` + `austen`
- `dickens` + `hemingway`
- `shelley` + `borges`
- `poe` + `kafka`
- `woolf` + `hemingway`

### Small Group Mode

Use a small group when the work is substantial enough to need separate drafting, critique, and finishing functions.

Recommended triads:

- `tolstoy` + `austen` + `hemingway`
- `shakespeare` + `austen` + `woolf`
- `shelley` + `borges` + `dante`
- `dickens` + `austen` + `hemingway`

### Full Writers' Room Mode

Use the full writers' room when:

- the project is flagship or highly visible
- the brief is politically or technically sensitive
- the assignment mixes multiple output types
- the route is unclear and must be resolved explicitly before drafting

## Inputs

The user should ideally provide:

1. **Task type**: book, article, essay, research, documentation, code, or hybrid.
2. **Goal**: what the final deliverable must achieve.
3. **Audience**: who the work is for.
4. **Constraints**: tone, length, deadline, publication context, technical requirements, or risk level.
5. **Preferred mode** if they already know it: solo, pair, small group, or full room.

If the brief is incomplete, ask only for the missing information that affects routing.

## Local File Output Policy

If the assignment includes file creation or file edits, all writes must stay inside the repository-local `local-output/` tree.

Approved subdirectories:

- `local-output/books/`
- `local-output/articles/`
- `local-output/essays/`
- `local-output/research/`
- `local-output/docs/`
- `local-output/code/`
- `local-output/hybrid/`
- `local-output/reviews/`
- `local-output/canon/`
- `local-output/cemetery/`
- `local-output/translations/`
- `local-output/runs/` for session workspaces created by the wrapper

Do not write to parent directories, sibling repositories, home directories, temp folders, or system paths. If the user asks for a location outside the approved tree, refuse and route the work to the correct `local-output/` subfolder.

## Workflow

Follow this six-phase coordination workflow.

### Phase 1: Classify the Brief

1. Identify the task class.
2. Identify whether the main challenge is structural, analytical, tonal, factual, technical, or hybrid.
3. Estimate risk level: low, moderate, high, or flagship.

### Phase 2: Select the Operating Mode

1. Choose solo, pair, small group, or full writers' room.
2. Explain the choice in one or two sentences.
3. Avoid overstaffing simple tasks.

### Phase 3: Assign Roles

1. Name the lead.
2. Name the reviewer.
3. Add critic, refiner, fact-checker, and finisher when justified.
4. Keep role ownership explicit; do not assign vague overlapping authority.

### Phase 4: Build the Work Order

Produce a work order with these fields:

- `Route`
- `Mode`
- `Lead`
- `Reviewer`
- `Additional roles`
- `Output directory`
- `Primary risks`
- `Handoff sequence`
- `Definition of done`

For serial, recurring, or versioned projects, include canon updates under `local-output/canon/` and cemetery updates under `local-output/cemetery/` when material is deliberately cut but worth retaining.

### Phase 5: Draft or Delegate

If the user wants execution immediately:

1. State the route.
2. State the output directory under `local-output/` if files will be created.
3. Produce a short plan.
4. Draft the deliverable in the chosen lead voice.
5. Apply mental review through the named reviewer and finisher roles.

If the user wants planning only:

1. Stop after the work order.
2. Include suggested first action for the lead.

### Phase 6: Arbitration and Finish

When tradeoffs arise:

1. Let the lead argue for purpose and structure.
2. Let the reviewer argue for quality against the brief.
3. Let the critic surface the main risk.
4. Let the finisher decide what must change before shipment.
5. Use `dante` as arbitration logic for hierarchy and workflow disputes.
6. Use `hemingway` as the final ship/no-ship voice for clarity and readiness.

## Output Pattern

When using this skill, structure responses like this when helpful:

1. `Classification:` task type, audience, risk, primary challenge
2. `Mode:` solo, pair, small group, or full room
3. `Route:` lead, reviewer, additional roles
4. `Output directory:` only when files will be created
5. `Work order:` handoffs, risks, definition of done
6. `Draft:` only if the user wants execution now
7. `Final readiness notes:` only if useful

## Handoff Templates

### Lead to Reviewer

Include:

- intended audience
- governing objective
- unresolved doubts
- areas where the draft may be weak

### Reviewer to Finisher

Include:

- critical fixes still required
- optional improvements
- whether the structure is sound
- whether the language is shipment-ready

### Critic to Lead

Include:

- single most dangerous assumption
- single structural weakness
- single failure mode if shipped unchanged

## Common Pitfalls

1. Assigning too many agents to a simple task.
2. Confusing personality with role ownership.
3. Skipping the finisher on complex prose or code.
4. Letting the room become decorative instead of operational.
5. Using the full room before the brief has even been classified.

## Verification Checklist

- [ ] The task class was named explicitly.
- [ ] The operating mode matches the task scope.
- [ ] Lead and reviewer roles are distinct.
- [ ] Risk and definition of done are stated.
- [ ] If drafting occurred, the response remains entirely in English.
- [ ] No recognizable imitation of a literary author appears.
- [ ] The final output favors usefulness over theatrics.

## One-Shot Recipes

### Novel Planning Session

Use small group mode with `tolstoy` as lead, `austen` as reviewer, and `hemingway` as finisher. Add `shakespeare` only if the conflict architecture is weak.

### Feature Article Sprint

Use pair mode with `dickens` as lead and `hemingway` as finisher. Add `austen` as reviewer if judgment and tone are central.

### Technical Audit Report

Use small group mode with `borges` or `shelley` as lead, `kafka` as critic, and `hemingway` as finisher.

### Hybrid Product Narrative

Use full writers' room mode only if both story and system design materially affect the result. Otherwise use `shelley` as lead, `woolf` as refiner, and `hemingway` as finisher.