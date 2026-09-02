"""Dataset upload/preview service."""

import json
from datetime import UTC, datetime

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.dataset import Dataset
from app.models.project import Project
from app.repositories.base import get_active_dataset_for_project
from app.schemas.api import ColumnInfo, DatasetPreview
from app.schemas.enums import AuditEventType, DatasetStatus, ProjectStatus
from app.services import datasets as ds
from app.services.audit import record_event
from app.services.storage import FileStorage, UploadTooLargeError


class DatasetService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.storage = FileStorage(settings)

    def upload(self, project: Project, file: UploadFile) -> Dataset:
        """Validate, store and register a CSV upload; replaces previous dataset."""
        raw_name = file.filename or ""
        ds.validate_upload(raw_name, file.content_type, self.settings)
        try:
            stored = self.storage.store(file.file, raw_name, "csv")
        except UploadTooLargeError as exc:
            raise ds.DatasetValidationError("FILE_TOO_LARGE", str(exc)) from exc

        # Parse + validate content; remove the stored file if it fails.
        old_dataset = get_active_dataset_for_project(self.db, project.id)
        try:
            parsed = ds.describe_upload(stored)
        except ds.DatasetValidationError as exc:
            self.storage.delete(stored.stored_filename)
            raise exc

        if old_dataset is not None:
            old_dataset.status = DatasetStatus.DELETED.value
            old_dataset.deleted_at = datetime.now(UTC)
            self.storage.delete(old_dataset.stored_filename)

        dataset = Dataset(
            id=stored.dataset_id,
            project_id=project.id,
            original_filename=stored.original_filename,
            stored_filename=stored.stored_filename,
            content_type=file.content_type or "",
            sha256=stored.sha256,
            size_bytes=stored.size_bytes,
            row_count=parsed["row_count"],
            column_count=parsed["column_count"],
            columns_json=json.dumps(parsed["columns_raw"]),
            status=DatasetStatus.AVAILABLE.value,
        )
        self.db.add(dataset)
        self.db.flush()
        project.status = ProjectStatus.DATA_UPLOADED.value
        project.version += 1
        record_event(
            self.db,
            AuditEventType.DATASET_UPLOADED,
            project_id=project.id,
            dataset_id=dataset.id,
            details={
                "filename": stored.original_filename,
                "sha256": stored.sha256,
                "size_bytes": stored.size_bytes,
                "row_count": dataset.row_count,
                "column_count": dataset.column_count,
                "replaced": old_dataset is not None,
            },
        )
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def delete(self, dataset: Dataset) -> None:
        from app.repositories.base import get_project

        project = get_project(self.db, dataset.project_id)
        self.storage.delete(dataset.stored_filename)
        dataset.status = DatasetStatus.DELETED.value
        dataset.deleted_at = datetime.now(UTC)
        if project is not None:
            project.status = ProjectStatus.DRAFT.value
            project.version += 1
            record_event(
                self.db,
                AuditEventType.DATASET_DELETED,
                project_id=project.id,
                dataset_id=dataset.id,
                details={"filename": dataset.original_filename},
            )
        self.db.commit()

    def preview(self, dataset: Dataset, limit: int = 100) -> DatasetPreview:
        from app.services.datasets import build_preview

        df = ds.stored_to_df(self.settings.datasets_dir / dataset.stored_filename)
        infos = [ColumnInfo(**c) for c in json.loads(dataset.columns_json)]
        rows, truncated, dtypes_summary = build_preview(df, infos, limit)
        return DatasetPreview(
            dataset_id=dataset.id,
            columns=infos,
            rows=rows,
            truncated=truncated,
            limit=limit,
            dtypes_summary=dtypes_summary,
        )
