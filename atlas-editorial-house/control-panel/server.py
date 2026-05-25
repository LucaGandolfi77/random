#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import secrets
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

try:
    import yaml
except ImportError as exc:  # pragma: no cover - surfaced at runtime
    raise SystemExit(f"PyYAML is required for control-panel/server.py: {exc}")


ROOT = Path(__file__).resolve().parent.parent
CONTROL_ROOT = Path(__file__).resolve().parent
LAUNCHER_PATH = ROOT / "hermes-profile" / "launch-example.sh"
WRAPPER_PATH = ROOT / "hermes-profile" / "run-local-hermes.sh"
CONFIG_PATH = ROOT / "hermes-profile" / "atlas-editorial-house" / "config.yaml"
JOBS_ROOT = ROOT / "local-output" / "reviews" / "control-panel"
DEFAULT_PROFILE = "atlas-editorial-house"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_TAIL_LINES = 80
SESSION_PREFIX = "atlas-ui"


SCENARIOS: list[dict[str, str]] = [
    {"id": "novel", "label": "Literary Novel"},
    {"id": "family-saga", "label": "Political Family Saga"},
    {"id": "psychological-novel", "label": "Psychological Novel"},
    {"id": "article", "label": "Feature Article"},
    {"id": "institutional-satire", "label": "Institutional Satire"},
    {"id": "investigative-nonfiction", "label": "Investigative Literary Nonfiction"},
    {"id": "trial-review", "label": "Publication Trial"},
    {"id": "canon-audit", "label": "Canon Audit"},
    {"id": "testimony-dossier", "label": "Polyphonic Testimony Dossier"},
    {"id": "migration-novel", "label": "Migration Memory Novel"},
    {"id": "essay", "label": "Philosophical Essay"},
    {"id": "docs", "label": "Technical Documentation"},
    {"id": "code", "label": "Software Tool"},
    {"id": "hybrid", "label": "Hybrid Narrative Plus Code"},
]


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def sanitize_name(value: str) -> str:
    filtered = [ch if ch.isalnum() or ch in "._-" else "-" for ch in value]
    sanitized = "".join(filtered).strip("-")
    return sanitized or "atlas-session"


def read_text_tail(path: Path, max_lines: int = DEFAULT_TAIL_LINES) -> str:
    if not path.exists():
        return ""

    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    return "\n".join(lines[-max_lines:])


def load_personalities() -> list[dict[str, str]]:
    config = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    personalities = []

    for slug, payload in config["agent"]["personalities"].items():
        personalities.append(
            {
                "slug": slug,
                "description": payload.get("description", ""),
                "tone": payload.get("tone", ""),
                "style": payload.get("style", ""),
            }
        )

    return personalities


@dataclass
class AppConfig:
    host: str
    port: int
    profile: str
    api_token: str | None
    jobs_root: Path


class JobStore:
    def __init__(self, jobs_root: Path) -> None:
        self.jobs_root = jobs_root
        self.jobs_root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._processes: dict[str, subprocess.Popen[str]] = {}

    def job_dir(self, job_id: str) -> Path:
        return self.jobs_root / job_id

    def metadata_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "metadata.json"

    def stdout_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "stdout.log"

    def stderr_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "stderr.log"

    def prompt_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "prompt.txt"

    def create_job(
        self,
        *,
        scenario: str | None,
        profile: str,
        translate_it: bool,
        prompt: str,
        source: str,
        personality: str | None,
        command: list[str],
        process: subprocess.Popen[str],
    ) -> dict[str, Any]:
        job_id = f"job-{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}-{secrets.token_hex(4)}"
        job_dir = self.job_dir(job_id)
        job_dir.mkdir(parents=True, exist_ok=False)

        metadata = {
            "job_id": job_id,
            "status": "running",
            "scenario": scenario,
            "profile": profile,
            "translate_it": translate_it,
            "source": source,
            "personality": personality,
            "created_at": now_iso(),
            "started_at": now_iso(),
            "finished_at": None,
            "exit_code": None,
            "command": command,
            "stdout_path": str(self.stdout_path(job_id).relative_to(ROOT)),
            "stderr_path": str(self.stderr_path(job_id).relative_to(ROOT)),
            "prompt_path": str(self.prompt_path(job_id).relative_to(ROOT)),
        }

        self.prompt_path(job_id).write_text(prompt, encoding="utf-8")
        self.metadata_path(job_id).write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        with self._lock:
            self._processes[job_id] = process

        watcher = threading.Thread(target=self._watch_process, args=(job_id,), daemon=True)
        watcher.start()

        return self.read_job(job_id)

    def _watch_process(self, job_id: str) -> None:
        with self._lock:
            process = self._processes.get(job_id)

        if process is None:
            return

        exit_code = process.wait()

        with self._lock:
            self._processes.pop(job_id, None)

        metadata = self.read_job(job_id)
        metadata["status"] = "succeeded" if exit_code == 0 else "failed"
        metadata["exit_code"] = exit_code
        metadata["finished_at"] = now_iso()
        self.metadata_path(job_id).write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    def read_job(self, job_id: str) -> dict[str, Any]:
        metadata = json.loads(self.metadata_path(job_id).read_text(encoding="utf-8"))
        status = metadata.get("status")

        with self._lock:
            process = self._processes.get(job_id)

        if process is not None:
            poll_result = process.poll()
            if poll_result is None:
                status = "running"
            else:
                status = "succeeded" if poll_result == 0 else "failed"
                metadata["exit_code"] = poll_result
                metadata["finished_at"] = metadata.get("finished_at") or now_iso()

        metadata["status"] = status
        metadata["stdout_tail"] = read_text_tail(self.stdout_path(job_id))
        metadata["stderr_tail"] = read_text_tail(self.stderr_path(job_id))
        metadata["prompt"] = self.prompt_path(job_id).read_text(encoding="utf-8", errors="replace")
        return metadata

    def list_jobs(self) -> list[dict[str, Any]]:
        jobs = []
        for metadata_path in sorted(self.jobs_root.glob("job-*/metadata.json"), reverse=True):
            job_id = metadata_path.parent.name
            jobs.append(self.read_job(job_id))
        return jobs


def build_preview(profile: str, scenario: str, translate_it: bool) -> dict[str, Any]:
    prompt_cmd = [str(LAUNCHER_PATH), scenario, "--profile", profile, "--prompt-only"]
    command_cmd = [str(LAUNCHER_PATH), scenario, "--profile", profile, "--command-only"]

    if translate_it:
        prompt_cmd.append("--translate-it")
        command_cmd.append("--translate-it")

    prompt = subprocess.run(prompt_cmd, check=True, capture_output=True, text=True).stdout.strip()
    command = subprocess.run(command_cmd, check=True, capture_output=True, text=True).stdout.strip()

    return {
        "scenario": scenario,
        "profile": profile,
        "translate_it": translate_it,
        "prompt": prompt,
        "command": command,
    }


def launch_job(
    store: JobStore,
    *,
    scenario: str | None,
    profile: str,
    translate_it: bool,
    prompt: str,
    source: str,
    personality: str | None,
) -> dict[str, Any]:
    session_name = sanitize_name(f"{SESSION_PREFIX}-{scenario or 'custom'}-{secrets.token_hex(3)}")
    command = [
        str(WRAPPER_PATH),
        "--profile",
        profile,
        "--session-name",
        session_name,
        "--chat-query",
        prompt,
    ]

    stdout_path = store.jobs_root / "_pending-stdout.log"
    stderr_path = store.jobs_root / "_pending-stderr.log"
    stdout_file = stdout_path.open("w", encoding="utf-8")
    stderr_file = stderr_path.open("w", encoding="utf-8")

    process = subprocess.Popen(
        command,
        cwd=str(ROOT),
        stdout=stdout_file,
        stderr=stderr_file,
        text=True,
    )

    job = store.create_job(
        scenario=scenario,
        profile=profile,
        translate_it=translate_it,
        prompt=prompt,
        source=source,
        personality=personality,
        command=command,
        process=process,
    )

    Path(stdout_path).replace(store.stdout_path(job["job_id"]))
    Path(stderr_path).replace(store.stderr_path(job["job_id"]))
    return store.read_job(job["job_id"])


class AtlasHandler(SimpleHTTPRequestHandler):
    server_version = "AtlasPrivateControl/1.0"

    def __init__(self, *args: Any, directory: str | None = None, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(CONTROL_ROOT), **kwargs)

    @property
    def app_config(self) -> AppConfig:
        return self.server.app_config  # type: ignore[attr-defined]

    @property
    def job_store(self) -> JobStore:
        return self.server.job_store  # type: ignore[attr-defined]

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("[atlas-control] " + format % args + "\n")

    def _json_response(self, payload: Any, status: int = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def _require_token_if_needed(self) -> bool:
        expected = self.app_config.api_token
        if not expected:
            return True

        provided = self.headers.get("X-Atlas-Token") or self.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if secrets.compare_digest(provided, expected):
            return True

        self._json_response({"error": "Forbidden"}, status=HTTPStatus.FORBIDDEN)
        return False

    def _not_found(self) -> None:
        self._json_response({"error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path

        if path in {"/", "/index.html", "/styles.css", "/app.js"}:
            if path == "/":
                self.path = "/index.html"
            return super().do_GET()

        if path == "/api/health":
            return self._json_response(
                {
                    "status": "ok",
                    "host": self.app_config.host,
                    "port": self.app_config.port,
                    "profile": self.app_config.profile,
                    "has_api_token": bool(self.app_config.api_token),
                    "jobs_root": str(self.app_config.jobs_root.relative_to(ROOT)),
                }
            )

        if path == "/api/scenarios":
            return self._json_response({"scenarios": SCENARIOS})

        if path == "/api/agents":
            return self._json_response({"agents": load_personalities()})

        if path == "/api/jobs":
            return self._json_response({"jobs": self.job_store.list_jobs()})

        if path.startswith("/api/jobs/"):
            job_id = path.rsplit("/", 1)[-1]
            metadata_path = self.job_store.metadata_path(job_id)
            if not metadata_path.exists():
                return self._not_found()

            query = parse_qs(parsed.query)
            job = self.job_store.read_job(job_id)
            if "tail" in query:
                max_lines = int(query.get("tail", [str(DEFAULT_TAIL_LINES)])[0])
                job["stdout_tail"] = read_text_tail(self.job_store.stdout_path(job_id), max_lines=max_lines)
                job["stderr_tail"] = read_text_tail(self.job_store.stderr_path(job_id), max_lines=max_lines)
            return self._json_response(job)

        self._not_found()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path

        if path in {"/api/preview", "/api/run", "/api/custom-run"}:
            if not self._require_token_if_needed():
                return

        try:
            if path == "/api/preview":
                payload = self._read_json_body()
                scenario = str(payload.get("scenario", "article"))
                profile = str(payload.get("profile", self.app_config.profile))
                translate_it = bool(payload.get("translate_it", False))
                return self._json_response(build_preview(profile, scenario, translate_it))

            if path == "/api/run":
                payload = self._read_json_body()
                scenario = str(payload.get("scenario", "article"))
                profile = str(payload.get("profile", self.app_config.profile))
                translate_it = bool(payload.get("translate_it", False))
                preview = build_preview(profile, scenario, translate_it)
                personality = payload.get("personality")
                job = launch_job(
                    self.job_store,
                    scenario=scenario,
                    profile=profile,
                    translate_it=translate_it,
                    prompt=preview["prompt"],
                    source="scenario",
                    personality=str(personality) if personality else None,
                )
                return self._json_response(job, status=HTTPStatus.ACCEPTED)

            if path == "/api/custom-run":
                payload = self._read_json_body()
                prompt = str(payload.get("prompt", "")).strip()
                if not prompt:
                    return self._json_response({"error": "prompt is required"}, status=HTTPStatus.BAD_REQUEST)

                profile = str(payload.get("profile", self.app_config.profile))
                personality = str(payload.get("personality", "")).strip() or None
                if personality:
                    prompt = (
                        f"If your Hermes runtime supports overlays, switch to /personality {personality} before acting. "
                        f"Then follow the assignment below exactly.\n\n{prompt}"
                    )

                job = launch_job(
                    self.job_store,
                    scenario=None,
                    profile=profile,
                    translate_it=False,
                    prompt=prompt,
                    source="custom",
                    personality=personality,
                )
                return self._json_response(job, status=HTTPStatus.ACCEPTED)
        except subprocess.CalledProcessError as exc:
            return self._json_response(
                {
                    "error": "command failed",
                    "command": exc.cmd,
                    "stdout": exc.stdout,
                    "stderr": exc.stderr,
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        except json.JSONDecodeError as exc:
            return self._json_response({"error": f"invalid JSON body: {exc}"}, status=HTTPStatus.BAD_REQUEST)
        except Exception as exc:  # pragma: no cover - protective server path
            return self._json_response({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

        self._not_found()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Private Atlas control server")
    parser.add_argument("--host", default=os.environ.get("ATLAS_CONTROL_HOST", DEFAULT_HOST))
    parser.add_argument("--port", type=int, default=int(os.environ.get("ATLAS_CONTROL_PORT", DEFAULT_PORT)))
    parser.add_argument("--profile", default=os.environ.get("ATLAS_CONTROL_PROFILE", DEFAULT_PROFILE))
    parser.add_argument("--api-token", default=os.environ.get("ATLAS_CONTROL_TOKEN"))
    parser.add_argument("--check", action="store_true", help="Validate configuration and exit")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    jobs_root = JOBS_ROOT
    jobs_root.mkdir(parents=True, exist_ok=True)

    config = AppConfig(
        host=args.host,
        port=args.port,
        profile=args.profile,
        api_token=args.api_token,
        jobs_root=jobs_root,
    )

    if args.check:
        print(
            json.dumps(
                {
                    "host": config.host,
                    "port": config.port,
                    "profile": config.profile,
                    "has_api_token": bool(config.api_token),
                    "jobs_root": str(config.jobs_root.relative_to(ROOT)),
                    "launcher": str(LAUNCHER_PATH.relative_to(ROOT)),
                    "wrapper": str(WRAPPER_PATH.relative_to(ROOT)),
                },
                indent=2,
            )
        )
        return 0

    if config.host not in {"127.0.0.1", "localhost"}:
        raise SystemExit("Refusing to bind outside loopback. Use 127.0.0.1 or localhost only.")

    handler = partial(AtlasHandler, directory=str(CONTROL_ROOT))
    server = ThreadingHTTPServer((config.host, config.port), handler)
    server.app_config = config  # type: ignore[attr-defined]
    server.job_store = JobStore(config.jobs_root)  # type: ignore[attr-defined]

    print(f"[INFO] Atlas private control server listening on http://{config.host}:{config.port}")
    print(f"[INFO] Jobs root: {config.jobs_root}")
    print(f"[INFO] API token required: {'yes' if config.api_token else 'no'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Shutting down Atlas private control server")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())