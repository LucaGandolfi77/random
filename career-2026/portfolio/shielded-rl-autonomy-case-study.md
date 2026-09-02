# Case study — Shielded RL for Safe Autonomy

Problem: keep an RL-style policy safe without claiming that higher reward means higher safety.
Architecture: 1-D lunar-descent simulator with explicit safety constraints (touchdown velocity,
forbidden/escape states, ODD); deterministic runtime shield that validates/blocks/replaces unsafe
actions and logs reasons (no second RL agent); comparison across deterministic controller,
unshielded RL policy, shielded RL, action-constrained RL and fallback. Results: 8/8 tests PASS;
tests confirm the shield never increases crash count and repeats deterministically by seed.
Trade-offs: rule-based shield (verifiable) vs learned constraints; proxy linear policy (documented,
not a real training run) vs trained checkpoint; sim fidelity vs hardware. Limits: synthetic, no
vehicle link, evaluation budget limited. Contribution: verifiable shield + honest policy comparison.
CV bullets: (1) built a deterministic runtime shield that blocks/replaces unsafe RL actions with
reasoned interventions; (2) compared unshielded vs shielded vs constrained policies on safety
metrics; (3) documented that reward maximization does not imply safety.
