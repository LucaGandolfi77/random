# Local Assurance Copilot

Source-grounded query assistant over Workbench docs (index under project root). Guardrails: path
allowlist, injection detection (docs & queries), mandatory citations, refusal when no evidence,
sensitive-file skip, audit log, no arbitrary file/command access, no approval/conformity. Benchmark
covers answerable/unanswerable/injection/missing-source. Tests: 8 PASS. Run: make test.
