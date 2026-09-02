# Case study — Neural Network Formal Verification (property verifier)

Problem: give sound bounds for a small ReLU network instead of only sampled metrics. Architecture:
import the tiny 3->8 ReLU network from the C++ module (parsed header, not duplicated constants), IBP
forward for sound logit bounds with float guard, sampling baseline, counterexample export, property
schema validation, reproducibility hashes. Results: Verified (PROP-ALT-SAFE-001) and Falsified
(PROP-CMD-FORBIDDEN-001) computed live. Trade-offs: sound-but-loose bounds vs complete SMT; speed vs
precision; logit order-equivalence vs direct probability. Limits: host, synthetic, one hidden layer,
no SMT/MILP. Contribution: honest distinction Verified/Falsified/Unknown vs Tested by Sampling. CV
bullets: (1) implemented interval bound propagation with tolerance handling for ReLU nets; (2) built a
validated property schema with counterexample export and reproducibility records; (3) contrasted
sampling vs formal bounds without overclaiming.
