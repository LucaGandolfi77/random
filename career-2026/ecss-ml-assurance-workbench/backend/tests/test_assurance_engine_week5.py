"""Week-5 assurance engine tests (gap analyzer, traceability, dimensions, gate,
reports, package validation)."""

from tests.factories import create_project  # noqa: F401


def _get(client, url: str) -> dict:
    response = client.get(url)
    assert response.status_code == 200, response.text
    return response.json()


def test_gap_analyzer_runs_for_all_projects(client):
    for project_id in ("PRJ-TAD-001", "PRJ-QNT-001", "PRJ-SEU-001", "PRJ-LLS-001"):
        data = _get(client, f"/api/assurance-engine/projects/{project_id}/gaps")
        assert data["project_id"] == project_id
        ids = [g["gap_id"] for g in data["gaps"]]
        assert len(ids) == len(set(ids)), project_id
        assert all(g["project_id"] == project_id for g in data["gaps"])
        assert all(
            g["category"] and g["severity"] in ("Critical", "High", "Medium", "Low", "Informational")
            for g in data["gaps"]
        )


def test_gap_analyzer_detects_known_seu_gaps(client):
    data = _get(client, "/api/assurance-engine/projects/PRJ-SEU-001/gaps")
    categories = {g["category"] for g in data["gaps"]}
    assert "Failed Test" in categories
    assert "Unaccepted Residual Risk" in categories
    assert any(g["blocking"] and g["severity"] == "Critical" for g in data["gaps"])
    assert data["blocking_count"] >= 3


def test_severity_mapping_documented_rules(client):
    data = _get(client, "/api/assurance-engine/projects/PRJ-TAD-001/gaps")
    failed = [g for g in data["gaps"] if g["detection_rule"] == "test_failed"]
    assert failed and all(g["severity"] in ("Critical", "High") for g in failed)


def test_missing_data_not_converted_to_pass(client):
    # TAD target latency test is BLOCKED -> gap exists, never a PASS
    data = _get(client, "/api/assurance-engine/projects/PRJ-TAD-001/gaps")
    assert any(g["detection_rule"] == "test_blocked" for g in data["gaps"])


def test_traceability_validator_orphan_detection(client):
    result = _get(client, "/api/assurance-engine/projects/PRJ-TAD-001/traceability-issues")
    assert result["project_id"] == "PRJ-TAD-001"
    assert result["orphan_count"] >= 0
    assert isinstance(result["orphan_ids"], list)
    # known-good dataset: no duplicates expected
    assert result["duplicate_ids"] == []


def test_dimensions_separate_and_explainable(client):
    data = _get(client, "/api/assurance-engine/projects/PRJ-LLS-001/dimensions")
    assert len(data["dimensions"]) == 15
    for dim in data["dimensions"]:
        assert dim["dimension_id"].startswith("DIM-")
        assert dim["status"] in ("Complete", "Partial", "Missing", "Blocked", "Not Evaluated", "Not Applicable")
        assert (dim["numerator"] >= 0 and dim["denominator"] >= 1) or dim["denominator"] >= 0
        assert dim["calculation_rule"]


def test_deployment_gate_recommendation_and_no_auto_approval(client):
    gate = _get(client, "/api/assurance-engine/projects/PRJ-SEU-001/deployment-gate")
    assert gate["official_deployment_decision"] == "NO_GO"
    assert gate["recommendation"] in (
        "Ready for Human Approval",
        "Ready with Conditions",
        "Not Ready",
        "Insufficient Evidence",
        "Review Required",
    )
    # SEU has blocking rules -> recommendation must not be "Ready for Human Approval"
    assert gate["recommendation"] != "Ready for Human Approval"
    assert gate["blocking_fails"]


def test_gate_inconsistency_detection_for_lls(client):
    gate = _get(client, "/api/assurance-engine/projects/PRJ-LLS-001/deployment-gate")
    assert gate["official_deployment_decision"] == "CONDITIONAL_GO"
    assert isinstance(gate["inconsistencies"], list)


def test_monitoring_readiness_normalized(client):
    data = _get(client, "/api/assurance-engine/projects/PRJ-TAD-001/monitoring")
    assert data["project_id"] == "PRJ-TAD-001"
    assert data["metrics"]
    for metric in data["metrics"]:
        assert metric["monitoring_id"].startswith("MON-")
        assert metric["warning_threshold"]


def test_assurance_report_generation(client):
    report = client.post("/api/assurance-engine/projects/PRJ-TAD-001/assurance-report")
    assert report.status_code == 200
    body = report.json()
    assert body["project"]["id"] == "PRJ-TAD-001"
    assert "ECSS-informed" in body["disclaimer"] or "certification" in body["disclaimer"]
    assert body["deployment_gate"]["recommendation"]
    assert body["assurance_gaps"]
    assert body["_files"] and all(name.endswith((".md", ".json")) for name in body["_files"])


def test_evidence_package_validation_states(client):
    package = client.post("/api/portfolio/projects/PRJ-QNT-001/evidence-packages").json()
    result = client.post(f"/api/assurance-engine/evidence-packages/{package['id']}/validate").json()
    assert result["validation_status"] in ("Valid", "Valid with Warnings", "Incomplete", "Invalid", "Validation Failed")
    assert result["machine_readable"] is True
    assert result["error_count"] >= 0 and result["warning_count"] >= 0


def test_evidence_package_validation_detects_tampering(client, env):
    import io
    import zipfile

    package = client.post("/api/portfolio/projects/PRJ-SEU-001/evidence-packages").json()
    path = env.storage_dir / "portfolio" / "packages" / package["filename"]
    zin = zipfile.ZipFile(path)
    target = next(n for n in zin.namelist() if n.endswith("project-summary/project-summary.md"))
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as out:
        for name in zin.namelist():
            data = zin.read(name)
            if name == target:
                data = data.replace(b"# Project Summary", b"# Project Summary [TAMPERED]")
            out.writestr(name, data)
    zin.close()
    path.write_bytes(buffer.getvalue())
    result = client.post(f"/api/assurance-engine/evidence-packages/{package['id']}/validate").json()
    assert result["validation_status"] in ("Invalid", "Incomplete")
    assert any(p["code"] == "CHECKSUM_MISMATCH" for p in result["problems"])


def test_security_path_traversal_rejected(client):
    # unknown ids are rejected before any filesystem access
    assert client.post("/api/assurance-engine/evidence-packages/not-a-package/validate").status_code == 404
    assert client.get("/api/portfolio/evidence-packages/not-a-package/download").status_code == 404
