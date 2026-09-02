"""Secure dataset file storage.

Original file names are never used for storage paths: every file is persisted
under a server-generated UUID with a fixed extension. Uploads are streamed to
a temporary file while enforcing the configured size limit and computing the
SHA-256 digest in a single pass.
"""

import hashlib
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from app.core.config import Settings

# Display name sanitization: keep letters, digits, separators, dots and spaces.
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._\- ]+")
_MAX_DISPLAY_NAME_LEN = 120
_CHUNK_SIZE = 1024 * 1024


class UploadTooLargeError(Exception):
    pass


@dataclass
class StoredFile:
    dataset_id: str
    stored_filename: str
    original_filename: str
    sha256: str
    size_bytes: int
    path: Path


class FileStorage:
    """Filesystem storage bounded by configuration; safe names only."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        settings.ensure_directories()

    @staticmethod
    def sanitize_display_name(raw_name: str) -> str:
        """Sanitize the original name for display only (never for paths)."""
        name = Path(raw_name).name  # strip any directory component
        name = _SAFE_NAME_RE.sub("_", name)
        name = name.strip(" .")
        return name[:_MAX_DISPLAY_NAME_LEN] or "upload"

    def store(self, stream, raw_name: str, expected_ext: str) -> StoredFile:
        """Stream an upload to the datasets dir enforcing size + hash."""
        dataset_id = str(uuid4())
        stored_filename = f"{dataset_id}.csv"
        final_path = self.settings.datasets_dir / stored_filename
        digest = hashlib.sha256()
        size = 0
        max_bytes = self.settings.max_upload_size_mb * 1024 * 1024

        fd, tmp_name = tempfile.mkstemp(prefix="workbench_upload_", suffix=".csv")
        try:
            with Path(tmp_name).open("wb") as tmp:
                while True:
                    chunk = stream.read(_CHUNK_SIZE)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > max_bytes:
                        raise UploadTooLargeError(f"file exceeds the {self.settings.max_upload_size_mb} MB limit")
                    digest.update(chunk)
                    tmp.write(chunk)
            shutil.move(tmp_name, final_path)
        finally:
            Path(tmp_name).unlink(missing_ok=True)

        return StoredFile(
            dataset_id=dataset_id,
            stored_filename=stored_filename,
            original_filename=self.sanitize_display_name(raw_name),
            sha256=digest.hexdigest(),
            size_bytes=size,
            path=final_path,
        )

    def path_for(self, stored_filename: str) -> Path:
        # stored_filename is always server generated (uuid.csv); defensive check.
        if not re.fullmatch(r"[0-9a-f-]{36}\.csv", stored_filename):
            raise ValueError("invalid stored filename")
        return self.settings.datasets_dir / stored_filename

    def delete(self, stored_filename: str) -> None:
        try:
            self.path_for(stored_filename).unlink(missing_ok=True)
        except ValueError:
            return
