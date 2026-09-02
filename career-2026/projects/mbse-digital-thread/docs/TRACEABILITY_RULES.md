# Traceability rules

- orphan link -> issue; unknown kind/id -> error; duplicate id -> error.
- cycle in link graph -> issue.
- kind mismatch (downstream not allowed) -> issue.
- impact propagation follows downstream only; upstream reported separately.
