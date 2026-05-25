---
name: atlas-final-review
description: Use when you want Hermes to act as the Atlas Editorial House final review gate with severity triage, revision requirements, and an explicit ship or no-ship decision.
version: 1.0.0
author: Atlas Editorial House
license: MIT
metadata:
  hermes:
    tags: [editorial, review, qa, ship, no-ship, revision, code-review]
    related_skills: [atlas-editorial-house, atlas-writers-room]
---

# Atlas Final Review

## Overview

This skill is the final shipment gate for The Atlas Editorial House. Use it when a draft, article, essay, documentation set, code artifact, or hybrid project is close to complete and needs a disciplined final review rather than more open-ended drafting.

The purpose of this skill is to answer one hard question clearly: should this ship now, should it ship after specific fixes, or should it not ship at all in its current state?

This skill emphasizes severity triage, explicit revision requirements, factual caution, technical risk, readability, structural coherence, and operational readiness.

## When to Use

- The user wants a final review rather than another drafting pass.
- The work is near completion and needs a ship or no-ship decision.
- The output includes claims, technical details, code, or instructions that could fail in production or public use.
- The assignment needs ranked findings instead of general commentary.
- The user wants an editorial QA gate before release.

Do not use this skill for:

- early brainstorming
- first-draft generation
- open-ended ideation
- playful style exploration without a shipment decision

## Review Objectives

Always review against these objectives:

1. **Fitness to brief**: does the work satisfy the actual assignment?
2. **Structural integrity**: does the organization support the intended use?
3. **Clarity**: can a skilled reader or user understand and act on it?
4. **Accuracy and boundedness**: are claims supported, scoped, and honest?
5. **Operational safety**: if code or instructions are present, are failure modes visible and controlled?
6. **Shipment readiness**: is the work strong enough to publish, deliver, or merge now?
7. **Filesystem scope**: if files were created or edited, do all paths remain inside the approved `local-output/` tree?

## Severity Levels

Use exactly these severity levels:

1. **Critical**: shipping now would create a major factual, structural, legal, or technical failure.
2. **High**: shipping now would likely create a material quality, usability, or trust problem.
3. **Medium**: the issue weakens the work meaningfully but may not block shipment in every context.
4. **Low**: polish issue, minor clarity defect, or non-blocking improvement.

Do not inflate severity. If an issue is only cosmetic, call it low.

## Review Categories

Classify findings under one or more of these categories:

- Brief alignment
- Structure
- Clarity
- Logic
- Evidence
- Tone
- Readability
- Technical correctness
- Maintainability
- Testing
- Documentation
- Risk

## Review Workflow

Follow this workflow in order.

### Phase 1: Establish Review Context

1. Identify the artifact type: book, article, essay, research, documentation, code, or hybrid.
2. Identify the intended audience.
3. Identify the implied or stated definition of done.
4. If the brief is missing, infer it conservatively and say so.

### Phase 2: Perform the Gate Review

1. Check whether the work actually fulfills its core purpose.
2. Look first for shipment blockers before polish issues.
3. Rank findings by severity, not by order of discovery.
4. Distinguish defects from preferences.
5. If files were created or modified, verify that every path stays inside the approved `local-output/` tree.

### Phase 3: Decide Shipment Status

Use one of these outcomes:

- **Ship**: ready now, no blocking issues.
- **Ship with fixes**: publishable after a short, explicit fix list.
- **No ship**: blocked by unresolved critical or high-severity issues.

### Phase 4: Prescribe the Next Move

After the decision, provide:

1. the smallest fix set that changes the outcome
2. the owner role best suited to make the fix
3. whether another final review is required

## Default Review Ownership

Use these Atlas roles mentally when forming the review:

### Prose and Editorial Work

- `hemingway` for final clarity and readiness
- `austen` for logic, proportion, and tonal discipline
- `woolf` for continuity of reader experience

### Research and Essays

- `borges` for conceptual soundness
- `austen` for overstatement control
- `hemingway` for final compression

### Code and Technical Artifacts

- `hemingway` for readability and delivery discipline
- `kafka` for edge cases and invalid states
- `poe` for failure-path scrutiny
- `dante` for workflow and hierarchy integrity

### Hybrid Projects

- `shelley` for system integrity
- `woolf` for human continuity
- `hemingway` for final release judgment

## Output Format

When you use this skill, structure the response as follows when possible:

1. `Artifact:` what is being reviewed
2. `Decision:` Ship, Ship with fixes, or No ship
3. `Summary:` two or three sentences on why
4. `Findings:` ranked list with severity and category
5. `Required fixes:` only the blockers or material fixes
6. `Owner suggestions:` who should make the fixes
7. `Re-review needed:` yes or no

## Finding Format

For each finding, prefer this structure:

- `Severity:` Critical / High / Medium / Low
- `Category:` one primary category
- `Issue:` one sentence naming the problem
- `Why it matters:` one sentence linking it to shipment risk
- `Fix:` one concrete action

## Decision Rules

### Ship

Choose **Ship** only when:

- no critical findings exist
- no unresolved high-severity blockers remain
- the work is readable, coherent, and fit for its audience
- code and instructions are operationally credible

### Ship with fixes

Choose **Ship with fixes** when:

- the work is fundamentally sound
- the required fixes are limited and clearly enumerable
- the risk can be removed without structural rework

### No ship

Choose **No ship** when:

- the work misses the brief materially
- the structure is broken
- the claims are unbounded or unreliable
- the code or instructions create avoidable operational risk
- multiple high-severity findings interact in a way that undermines trust

## Common Pitfalls

1. Giving vague praise before identifying blockers.
2. Treating preferences as defects.
3. Burying the shipment decision under excessive commentary.
4. Listing too many low-value polish notes when high-severity issues are still open.
5. Calling for a rewrite when a smaller concrete fix would change the outcome.

## Verification Checklist

- [ ] The review states the artifact type.
- [ ] The review states a shipment decision explicitly.
- [ ] Findings are ranked by severity.
- [ ] At least one fix is concrete and actionable when blockers exist.
- [ ] Any file creation or modification stays inside the approved `local-output/` tree when relevant.
- [ ] Code-related reviews mention correctness, maintainability, or failure handling when relevant.
- [ ] The response stays in English and avoids literary imitation.

## One-Shot Recipes

### Final Article Gate

Use this skill to determine whether a feature or essay is ready to publish. Prioritize brief alignment, factual boundedness, and the strength of the opening and ending.

### Final Documentation Gate

Use this skill to test whether instructions are actually executable by a reader who does not already know the system. Block shipment if steps are ambiguous or hidden assumptions are required.

### Final Code Gate

Use this skill to review readability, invalid states, missing tests, and unsafe operational assumptions. Do not approve shipment merely because the code appears elegant.

### Final Hybrid Gate

Use this skill to ensure the narrative and technical parts reinforce each other. Block shipment if one side is polished and the other is still ornamental or structurally weak.