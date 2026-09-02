# Soundness and limitations

IBP is sound for ReLU/affine under exact arithmetic; we add an outward guard for float rounding and
verify the logit (order-equivalent to the logistic output). Limitations: single hidden layer here;
bounds may be loose for deeper nets; sampling is not proof; no SMT/MILP engine present; results are
host-only and synthetic.
