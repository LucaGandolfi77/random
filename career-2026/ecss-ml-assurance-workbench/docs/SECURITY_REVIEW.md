# Security review (v0.6.0)

Performed on existing code: path traversal rejected (tests), ZIP-Slip/member path checks in package
validation, safe filenames (server-generated), no secrets in frontend, external links protected,
errors structured without stack traces, CORS configurable. Root enforcement script keeps outputs under
`/career-2026`.

Residual: no authentication (trusted network only), full-repo secret scan outside `/career-2026` and
`npm audit` not executed in this session, Markdown rendering is internal-only (no untrusted Markdown),
no CSP header configured on the demo nginx (documented).
