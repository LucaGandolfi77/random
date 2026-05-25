# Application Layer

Place mission or product logic here.

Rules for this repository:

1. Keep logic in this layer independent of MPLAB X, Harmony, and board-specific register access.
2. Depend only on small interfaces from `firmware/hal/` or on pure logic from `firmware/common/`.
3. Prefer deterministic inputs and outputs so the same code can be reused in host-based unit tests.