# ADR-0001 — Normalized assurance data model

Portfolio projects use dedicated `portfolio_*` tables (week 3) instead of reusing week-1 analysis
tables: no destructive migration, documents stored as JSON payloads with scalar anchor fields, stable
IDs (`PRJ-*`, `REQ-*`, `TEST-*`, …). Accepted.
