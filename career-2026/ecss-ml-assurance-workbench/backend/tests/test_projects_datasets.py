"""Project + dataset upload tests (API level)."""

import hashlib

from tests.factories import PROJECT_PAYLOAD, clean_csv_bytes, create_project, degraded_csv_bytes, upload


def test_create_project(client):
    project = create_project(client)
    assert project["name"] == PROJECT_PAYLOAD["name"]
    assert project["status"] == "Draft"
    assert project["version"] == 1
    assert project["has_dataset"] is False
    assert len(project["id"]) == 36

    audit = client.get(f"/api/projects/{project['id']}/audit").json()
    assert any(event["event_type"] == "PROJECT_CREATED" for event in audit)


def test_list_and_get_project(client):
    project = create_project(client)
    listed = client.get("/api/projects").json()
    assert len(listed) == 1
    detail = client.get(f"/api/projects/{project['id']}").json()
    assert detail["id"] == project["id"]
    assert client.get("/api/projects/does-not-exist").status_code == 404
    assert client.get("/api/projects").json()


def test_update_project_increments_version(client):
    project = create_project(client)
    updated = client.patch(f"/api/projects/{project['id']}", json={"description": "new desc"}).json()
    assert updated["description"] == "new desc"
    assert updated["version"] == 2
    audit = client.get(f"/api/projects/{project['id']}/audit").json()
    assert any(event["event_type"] == "PROJECT_UPDATED" for event in audit)


def test_upload_valid_csv_and_preview(client, env):
    project = create_project(client)
    dataset = upload(client, project["id"], degraded_csv_bytes())
    assert dataset["row_count"] == 131  # 120 + 11 duplicated rows
    assert dataset["column_count"] == 6
    assert len(dataset["sha256"]) == 64
    assert dataset["original_filename"] == "telemetry.csv"

    # preview
    preview = client.get(f"/api/projects/{project['id']}/dataset/preview?limit=100").json()
    assert preview["dataset_id"] == dataset["id"]
    assert len(preview["rows"]) == 100
    assert preview["truncated"] is True

    # file physically stored under server-generated name
    stored = env.storage_dir / "datasets" / f"{dataset['id']}.csv"
    assert stored.exists()
    content_hash = hashlib.sha256(stored.read_bytes()).hexdigest()
    assert content_hash == dataset["sha256"]


def test_upload_rejects_invalid_extension_and_mime(client):
    project = create_project(client)
    response = client.post(
        f"/api/projects/{project['id']}/datasets",
        files={"file": ("data.exe", b"anything", "application/x-msdownload")},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_EXTENSION"

    response = client.post(
        f"/api/projects/{project['id']}/datasets",
        files={"file": ("data.csv", clean_csv_bytes(), "application/pdf")},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_CONTENT_TYPE"


def test_upload_sanitizes_filename_and_never_overwrites(client, env):
    project = create_project(client)
    evil = "../../../../etc/secret.csv"
    dataset = upload(client, project["id"], degraded_csv_bytes(), filename=evil)
    assert dataset["original_filename"] == "secret.csv"  # path stripped for display
    first_id = dataset["id"]
    first_stored = env.storage_dir / "datasets" / f"{first_id}.csv"
    assert first_stored.exists()

    # re-upload with the same name: new server id, old file removed, no collision
    dataset2 = upload(client, project["id"], clean_csv_bytes(), filename=evil)
    assert dataset2["id"] != first_id
    assert not first_stored.exists()
    assert (env.storage_dir / "datasets" / f"{dataset2['id']}.csv").exists()


def test_upload_rejects_empty_and_corrupt_csv(client):
    project = create_project(client)
    header_only = b"a,b,c\n"
    response = client.post(
        f"/api/projects/{project['id']}/datasets", files={"file": ("empty.csv", header_only, "text/csv")}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "EMPTY_DATASET"

    corrupt = b"\xff\xfe\x00binary\x00\x01\x02garbage\x00"
    response = client.post(
        f"/api/projects/{project['id']}/datasets", files={"file": ("corrupt.csv", corrupt, "text/csv")}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_CSV"


def test_upload_too_large_rejected(client):
    project = create_project(client)
    big = ("x" * (6 * 1024 * 1024)).encode()
    response = client.post(f"/api/projects/{project['id']}/datasets", files={"file": ("big.csv", big, "text/csv")})
    assert response.status_code == 400
    assert response.json()["code"] == "FILE_TOO_LARGE"


def test_delete_dataset(client, env):
    project = create_project(client)
    dataset = upload(client, project["id"], degraded_csv_bytes())
    stored_path = env.storage_dir / "datasets" / f"{dataset['id']}.csv"
    assert stored_path.exists()
    response = client.delete(f"/api/projects/{project['id']}/dataset")
    assert response.status_code == 204
    assert not (env.storage_dir / "datasets" / f"{dataset['id']}.csv").exists()
    assert client.get(f"/api/projects/{project['id']}/dataset").status_code == 404
    project_after = client.get(f"/api/projects/{project['id']}").json()
    assert project_after["status"] == "Draft"
    audit = client.get(f"/api/projects/{project['id']}/audit").json()
    assert any(event["event_type"] == "DATASET_DELETED" for event in audit)


def test_data_persists_across_restart(client, restarted_client):
    project = create_project(client)
    dataset = upload(client, project["id"], degraded_csv_bytes())
    run = client.post(f"/api/projects/{project['id']}/analysis").json()
    assert run["status"] == "completed"

    # fresh client over the same DB + storage directory
    projects = restarted_client.get("/api/projects").json()
    assert len(projects) == 1
    assert projects[0]["id"] == project["id"]
    assert projects[0]["has_dataset"] is True
    dataset2 = restarted_client.get(f"/api/projects/{project['id']}/dataset").json()
    assert dataset2["sha256"] == dataset["sha256"]
    score = restarted_client.get(f"/api/analysis/{run['id']}/score").json()
    assert score["overall_score"] is not None
