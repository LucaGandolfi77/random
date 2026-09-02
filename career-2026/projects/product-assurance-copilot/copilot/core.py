"""Local Assurance Copilot: source-grounded retrieval over Workbench docs.

Deterministic search + extractive answers with mandatory citations, path
allowlist, prompt-injection guardrails and audit log. No external APIs; no
approval/conformity claims.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # project root under /careers-2026
ALLOWED_ROOTS = [ROOT]                       # extend only with explicit allowed dirs
SENSITIVE_HINTS = (".env", "secret", "credential", "private_key", "token")
INJECTION_HINTS = ("ignore previous instructions", "ignore your instructions", "system prompt",
                   "you are now", "do not follow", "forget everything")


@dataclass
class SourceDoc:
    doc_id: str
    path: str          # repo-relative
    checksum: str
    size_bytes: int
    version: str = "unversioned"
    title: str = ""
    content: str = ""
    superseded: bool = False
    suspicious: bool = False
    indexed_ts: str = ""


def _rel(path: Path) -> str:
    rp = path.resolve()
    for root in ALLOWED_ROOTS:
        root_r = root.resolve()
        if rp == root_r or root_r in rp.parents:
            return str(rp.relative_to(ROOT.parent.parent)) if False else str(rp)
    raise ValueError("path outside allowed roots")


def safe_sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def looks_suspicious(text: str) -> bool:
    low = text.lower()
    return any(h in low for h in INJECTION_HINTS)


def extract_title(content: str) -> str:
    first = next((ln for ln in content.splitlines() if ln.startswith("# ")), "")
    return first.lstrip("# ").strip()


class Indexer:
    def __init__(self) -> None:
        self.docs: dict[str, SourceDoc] = {}
        self.audit: list[dict] = []

    def index_directory(self, directory: Path, version: str = "unversioned") -> int:
        directory = directory.resolve()
        if not any(directory == r.resolve() or r.resolve() in directory.parents for r in ALLOWED_ROOTS):
            raise ValueError("directory outside allowed roots")
        count = 0
        for path in sorted(directory.rglob("*.md")):
            if any(h in path.name.lower() for h in SENSITIVE_HINTS):
                continue
            content = path.read_text(encoding="utf-8", errors="ignore")
            checksum = safe_sha(content)
            doc_id = f"{path.stem}@{checksum[:8]}"
            suspicious = looks_suspicious(content)
            self.docs[doc_id] = SourceDoc(
                doc_id=doc_id, path=str(path), checksum=checksum, size_bytes=len(content),
                version=version, title=extract_title(content), content=content,
                superseded=version.endswith("superseded"), suspicious=suspicious,
                indexed_ts="local")
            count += 1
        self.audit.append({"event": "INDEXED", "directory": str(directory), "files": count})
        return count

    def search(self, query: str, top_k: int = 3, allow_suspicious: bool = False) -> list[SourceDoc]:
        tokens = [t for t in re.findall(r"[A-Za-z0-9_]+", query.lower()) if len(t) > 2]
        scored = []
        for doc in self.docs.values():
            if doc.suspicious and not allow_suspicious:
                continue
            low = doc.content.lower()
            score = sum(2 if t in doc.title.lower() else 1 for t in tokens if t in low)
            if query.lower() in low:
                score += 3
            if score > 0:
                scored.append((score, doc))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [d for _, d in scored[:top_k]]


@dataclass
class Answer:
    answer: str
    sources: list[dict] = field(default_factory=list)
    uncertainty: str = ""
    missing_evidence: bool = False
    generated_summary: bool = False
    refused: bool = False


def extractive_snippet(doc: SourceDoc, query: str, radius: int = 220) -> str:
    low = doc.content.lower()
    idx = low.find(query.lower())
    if idx < 0:
        for token in re.findall(r"[A-Za-z0-9_]{4,}", query.lower()):
            idx = low.find(token)
            if idx >= 0:
                break
    if idx < 0:
        return doc.content[: radius]
    start = max(0, idx - radius // 2)
    return doc.content[start:start + radius].replace("\n", " ").strip()


class Copilot:
    def __init__(self, indexer: Indexer) -> None:
        self.indexer = indexer
        self.audit: list[dict] = []

    def ask(self, query: str, allow_suspicious: bool = False) -> Answer:
        if looks_suspicious(query):
            self.audit.append({"event": "QUERY_INJECTION_BLOCKED", "query": query[:60]})
            return Answer(answer="Query blocked (prompt-injection pattern).", refused=True,
                          uncertainty="none")
        docs = self.indexer.search(query, allow_suspicious=allow_suspicious)
        if not docs:
            self.audit.append({"event": "REFUSED_NO_EVIDENCE", "query": query[:60]})
            return Answer(answer="No internal evidence found for this query in the allowed corpus.",
                          refused=True, missing_evidence=True, uncertainty="corpus limited")
        top = docs[0]
        if top.suspicious and not allow_suspicious:
            self.audit.append({"event": "DOC_SUSPICIOUS_SKIPPED", "doc": top.path})
            return Answer(answer="Matching document marked suspicious; answer withheld.",
                          refused=True, uncertainty="document content flagged")
        snippet = extractive_snippet(top, query)
        sources = [{"path": d.path, "version": d.version, "checksum_prefix": d.checksum[:12],
                    "superseded": d.superseded} for d in docs]
        self.audit.append({"event": "ANSWERED", "query": query[:60], "top": top.path})
        return Answer(answer=snippet, sources=sources,
                      uncertainty="Extractive snippet; review full document before action.",
                      missing_evidence=top.superseded, generated_summary=False)

    def missing_docs(self, expected: list[str], indexed_paths: set[str]) -> list[str]:
        return sorted(set(expected) - indexed_paths)
