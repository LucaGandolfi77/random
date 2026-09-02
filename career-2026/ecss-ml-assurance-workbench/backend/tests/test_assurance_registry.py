"""Tests for the assurance registry and evidence-package generation.

The four tracked projects do not exist in the repository: tests verify that
the registry represents this honestly (Not Available states, zero registered
tests never shown as passed/failed) and that packages are reproducible.
"""

import io
import zipfile

EXPECTED_IDS = ["PRJ-TAD-001", "PRJ-QNT-001", "PRJ-SEU-001", "PRJ-LLS-001"]


def test_registry_lists_four_stable_projects(client):
    response = client.get("/api/assurance/projects")
    assert response.status_code == 200
    projects = response.json()
    assert [p["id"] for p in projects] == sorted(EXPECTED_IDS)
    for project in projects:
        assert project["assurance_status"] == "Not Available"
        assert project["deployment_status"] == "Decision Pending"
        assert all(state in ("Not Available", "Available") for state in project["artefact_availability"].values())


def test_registry_summary_reports_zero_registered_tests(client):
    response = client.get("/api/assurance/projects/summary")
    assert response.status_code == 200
    rows = {row["id"]: row for row in response.json()}
    assert set(rows) == set(EXPECTED_IDS)
    for row in rows.values():
        assert row["tests_registered"] == 0
        assert row["tests_passed"] == 0
        assert row["tests_failed"] == 0
        assert row["requirements"] == 0
        assert row["evidence"] == 0


def test_project_detail_contains_availability_matrix(client):
    project = client.get("/api/assurance/projects/PRJ-TAD-001").json()
    assert project["id"] == "PRJ-TAD-001"
    assert project["slug"] == "telemetry-anomaly-detector"
    assert project["counts"]["tests_registered"] == 0
    assert "import_procedure" in project
    assert project["artefact_availability"]["MODEL_CARD"] == "Not Available"


def test_evidence_package_generation_and_download(client, env):
    created = client.post("/api/assurance/projects/PRJ-TAD-001/evidence-packages")
    assert created.status_code == 201
    package = created.json()
    assert package["project_id"] == "PRJ-TAD-001"
    assert package["filename"].endswith(".zip")

    download = client.get(f"/api/assurance/evidence-packages/{package['id']}/download")
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/zip"
    archive = zipfile.ZipFile(io.BytesIO(download.content))
    names = set(archive.namelist())
    assert "manifest.json" in names
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
        "09_manifest.json",
    ):
        assert section_file in names

    manifest = zipfile.ZipFile(io.BytesIO(download.content)).read("manifest.json").decode()
    import json

    manifest_data = json.loads(manifest)
    assert manifest_data["project"]["id"] == "PRJ-TAD-001"
    assert manifest_data["package_schema_version"] == "1.0.0"
    assert "ECSS" in manifest_data["disclaimer"] and "not" in manifest_data["disclaimer"].lower()

    tests_json = json.loads(zipfile.ZipFile(io.BytesIO(download.content)).read("04_test_results.json").decode())
    assert tests_json["registered_tests"] == 0
    assert "never represented as passed or failed" in tests_json["note"]
    # package file persisted under the test storage dir
    assert (env.storage_dir / "evidence-packages" / package["filename"]).exists()


def test_packages_reproducible_and_unique(client):
    first = client.post("/api/assurance/projects/PRJ-SEU-001/evidence-packages").json()
    second = client.post("/api/assurance/projects/PRJ-SEU-001/evidence-packages").json()
    assert first["id"] != second["id"]
    # content is deterministic: same artefact availability snapshot in both
    assert first["states_summary"] == second["states_summary"]
    listed = client.get("/api/assurance/projects/PRJ-SEU-001/evidence-packages").json()
    assert {p["id"] for p in listed} == {first["id"], second["id"]}


def test_registry_and_packages_persist_across_restart(client, restarted_client):
    package = client.post("/api/assurance/projects/PRJ-LLS-001/evidence-packages").json()
    projects = restarted_client.get("/api/assurance/projects").json()
    assert [p["id"] for p in projects] == sorted(EXPECTED_IDS)
    listed = restarted_client.get("/api/assurance/projects/PRJ-LLS-001/evidence-packages").json()
    assert any(p["id"] == package["id"] for p in listed)
    download = restarted_client.get(f"/api/assurance/evidence-packages/{package['id']}/download")
    assert download.status_code == 200
