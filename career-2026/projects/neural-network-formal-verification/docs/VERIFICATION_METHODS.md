# Verification methods

1. Interval Bound Propagation (IBP): sound outer bounds on logit with outward tolerance guard; complete
   only when bounds separate from the constraint.
2. Dense/grid + random sampling: non-formal baseline (status Tested by Sampling / counterexample
   search). Sampling can Falsify but never Verifies.
SMT/MILP: not available in this workspace — reported as Unknown with interval bounds (no fake result).
