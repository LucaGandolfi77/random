"""Integration tests for evidence package creation, listing, and download.

Covers POST /api/assurance/projects/{project_id}/evidence-packages,
GET /api/assurance/projects/{project_id}/evidence-packages, and
GET /api/assurance/evidence-packages/{package_id}/download.
"""

import io
import json
import zipfile


EXPECTED_IDS = ["PRJ-TAD-001", "PRJ-QNT-001", "PRJ-SEU-001", "PRJ-LLS-001"]


def test_create_evidence_package_returns_201(client):
    resp = client.post("/api/assurance/projects/PRJ-TAD-001/evidence-packages")
    assert resp.status_code == 201
    pkg = resp.json()
    assert pkg["project_id"] == "PRJ-TAD-001"
    assert pkg["id"].startswith("PKG-")
    assert pkg["filename"].endswith(".zip")
    assert pkg["size_bytes"] > 0
    assert pkg["schema_version"] == "1.0.0"
    assert isinstance(pkg["sections"], list)
    assert len(pkg["sections"]) > 0


def test_create_evidence_package_for_nonexistent_project_returns_404(client):
    resp = client.post("/api/assurance/projects/PRJ-FAKE-999/evidence-packages")
    assert resp.status_code == 404


def test_list_evidence_packages(client):
    r1 = client.post("/api/assurance/projects/PRJ-TAD-001/evidence-packages").json()
    r2 = client.post("/api/assurance/projects/PRJ-TAD-001/evidence-packages").json()

    resp = client.get("/api/assurance/projects/PRJ-TAD-001/evidence-packages")
    assert resp.status_code == 200
    packages = resp.json()
    assert isinstance(packages, list)
    ids = {p["id"] for p in packages}
    assert r1["id"] in ids
    assert r2["id"] in ids


def test_list_evidence_packages_for_nonexistent_project_returns_404(client):
    resp = client.get("/api/assurance/projects/PRJ-FAKE-999/evidence-packages")
    assert resp.status_code == 404


def test_download_evidence_package_returns_zip(client, env):
    created = client.post("/api/assurance/projects/PRJ-TAD-001/evidence-packages").json()

    resp = client.get(f"/api/assurance/evidence-packages/{created['id']}/download")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert "attachment" in resp.headers.get("content-disposition", "")

    archive = zipfile.ZipFile(io.BytesIO(resp.content))
    names = set(archive.namelist())
    assert "manifest.json" in names

    manifest_data = json.loads(archive.read("manifest.json"))
    assert manifest_data["project"]["id"] == "PRJ-TAD-001"
    assert manifest_data["package_schema_version"] == "1.0.0"
    assert "ECSS" in manifest_data["disclaimer"]


def test_download_evidence_package_has_all_sections(client):
    created = client.post("/api/assurance/projects/PRJ-TAD-001/evidence-packages").json()
    resp = client.get(f"/api/assurance/evidence-packages/{created['id']}/download")
    archive = zipfile.ZipFile(io.BytesIO(resp.content))
    names = set(archive.namelist())

    for section_file in (
        "00_project_summary.json",
        "01_model_card.json",
        "02_data_quality_report.json",
        "03_operational_design_domain.json",
        "04_test_results.json",
        "05_fmea.json",
        "06_deployment_report.json",
        "07_monitoring_strategy.json",
        "08_evidence_index.json",
    ):
        assert section_file in names, f"Missing {section_file}"


def test_download_nonexistent_package_returns_404(client):
    resp = client.get("/api/assurance/evidence-packages/PKG-FAKE-999/download")
    assert resp.status_code == 404


def test_package_file_persisted_on_disk(client, env):
    created = client.post("/api/assurance/projects/PRJ-TAD-001/evidence-packages").json()
    path = env.storage_dir / "evidence-packages" / created["filename"]
    assert path.exists()
    assert path.stat().st_size == created["size_bytes"]


def test_multiple_packages_unique_ids(client):
    p1 = client.post("/api/assurance/projects/PRJ-SEU-001/evidence-packages").json()
    p2 = client.post("/api/assurance/projects/PRJ-SEU-001/evidence-packages").json()
    assert p1["id"] != p2["id"]
    assert p1["states_summary"] == p2["states_summary"]


def test_all_projects_accept_package_creation(client):
    for project_id in EXPECTED_IDS:
        resp = client.post(f"/api/assurance/projects/{project_id}/evidence-packages")
        assert resp.status_code == 201, f"Failed for {project_id}"
        pkg = resp.json()
        assert pkg["project_id"] == project_id
