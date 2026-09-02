# Case study — Local Assurance Copilot

Problem: answer assurance questions strictly from internal sources. Architecture: deterministic
index over allowlisted docs (path check, checksum, sensitive-file skip), keyword retrieval,
extractive snippet answers with mandatory citations (path/version/checksum), refusal without
evidence, prompt-injection guardrails on both queries and document content (suspicious docs never
answer), audit log. Results: 8/8 tests PASS (citations valid, injection blocked, malicious doc
withheld, missing docs detected). Trade-offs: deterministic extractive answers vs generative
summaries (local model not bundled); precision vs recall; corpus scope. Limits: no external APIs,
no LLM summaries, corpus is the module corpus only. Contribution: GenAI-for-assurance with
guardrails. CV bullets: (1) built a source-grounded retrieval assistant with mandatory citations and
refusal; (2) added prompt-injection defences at query and document level; (3) evaluated refusal
correctness and unsupported-claim avoidance locally.
