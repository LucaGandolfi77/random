# EVALUATION_PLAN

Shielded RL demo (1-D lunar descent). Environment state=(alt,vel,fuel); actions acceleration
(clipped); reward on touchdown; safety constraints on touchdown velocity; forbidden/escaped states;
ODD: alt in [0,2000], steps<=500. Runtime shield deterministic (no second RL agent): blocks
unsafe/out-of-range actions, replaces and records reason. Policies compared: deterministic,
rl_unshielded, rl_shielded, rl_constrained, fallback. Training record: standalone linear proxy
policy (documented, not a trained checkpoint). See rl/shielded_rl.py.
