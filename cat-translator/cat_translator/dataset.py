import os
import re
import zipfile
from pathlib import Path

import requests

ZENODO_URL = (
    "https://zenodo.org/api/records/4008297/files/dataset.zip/content"
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

CONTEXT_MAP = {"B": "brushing", "F": "food", "I": "isolation"}
CLASSES = ["brushing", "food", "isolation"]

FILENAME_RE = re.compile(
    r"^(?P<context>[BFI])_(?P<cat_id>[A-Z0-9]+)_(?P<breed>[A-Z]+)_(?P<sex>[A-Z]+)_(?P<owner>[A-Z0-9]+)_(?P<counter>\d+)\.wav$"
)


def download(dest: str | None = None):
    if dest is None:
        dest = str(DATA_DIR)
    os.makedirs(dest, exist_ok=True)
    zip_path = os.path.join(dest, "dataset.zip")

    if not os.path.exists(zip_path):
        print("Downloading CatMeows dataset from Zenodo...")
        r = requests.get(ZENODO_URL, stream=True, timeout=120)
        r.raise_for_status()
        with open(zip_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print("Download complete.")
    else:
        print("dataset.zip already exists.")

    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(dest)
    print(f"Extracted to {dest}")


def parse_filename(filename: str) -> dict | None:
    m = FILENAME_RE.match(filename)
    if m is None:
        return None
    return {
        "context": CONTEXT_MAP[m.group("context")],
        "cat_id": m.group("cat_id"),
        "breed": m.group("breed"),
        "sex": m.group("sex"),
        "owner": m.group("owner"),
            "counter": m.group("counter"),
    }


def _find_data_dir(base_dir: str) -> str:
    if any(f.endswith(".wav") for f in os.listdir(base_dir)):
        return base_dir
    subdir = os.path.join(base_dir, "dataset")
    if os.path.isdir(subdir) and any(f.endswith(".wav") for f in os.listdir(subdir)):
        return subdir
    return base_dir


def load_dataset(data_dir: str | None = None) -> list[tuple[str, str, str]]:
    if data_dir is None:
        data_dir = _find_data_dir(str(DATA_DIR))
    samples = []
    for fname in os.listdir(data_dir):
        if not fname.endswith(".wav"):
            continue
        meta = parse_filename(fname)
        if meta is None:
            continue
        fpath = os.path.join(data_dir, fname)
        samples.append((fpath, meta["context"], meta["cat_id"]))
    return samples


if __name__ == "__main__":
    download()
