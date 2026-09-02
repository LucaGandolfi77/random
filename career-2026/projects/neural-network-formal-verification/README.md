# Neural-Network Formal Verification demo

Verifies local bounds of a small ReLU network (reused from real-time-embedded-ai, model v1.2 via its
C++ header) using interval bound propagation plus sampling as a non-formal baseline. Statuses:
Verified / Falsified / Unknown / Tested by Sampling / Unsupported. Statistical sampling is never
claimed as proof. Run: make test / make verify. Synthetic only.
