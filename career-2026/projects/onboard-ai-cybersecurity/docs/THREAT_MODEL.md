# Threat model (local, defensive)

Assets: model artefacts, manifests, telemetry inputs, evidence packages, update channel (local
fixtures). Actors: attacker (external, no privileges), compromised ground link (fixture), insider
(documented). Entry points: model load, update flow, inference inputs, evidence import.
Trust boundaries: storage root /careers-2026 (path checked), untrusted uploads never executed.
Covered threats: model replacement, model rollback bypass, manifest tampering, weight corruption,
unsafe deserialization (no deserialization of untrusted payloads), telemetry spoofing/replay, sensor
replay, adversarial input (controlled lab only), dataset poisoning (simulated fixture), dependency
compromise (lockfile mismatch fixture), evidence tampering, unauthorized model update.
Each maps to a control and a defensive test (threat-to-requirement/test/evidence traceability in
SECURITY_TEST_REPORT.md).
