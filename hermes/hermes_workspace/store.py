from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any
import json

import yaml


DEFAULT_ROOT = Path(__file__).resolve().parent.parent


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_yaml(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    content = yaml.safe_load(path.read_text(encoding="utf-8"))
    return default if content is None else content


def write_yaml(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, sort_keys=False, allow_unicode=False), encoding="utf-8")


def mask_secret(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}...{value[-4:]}"


@dataclass
class AgentConfig:
    slug: str
    display_name: str
    role: str
    specialty: str
    description: str
    prompt_file: str
    enabled_skills: list[str]
    enabled_tools: list[str]
    provider: str
    model: str
    api_key_env: str | None = None
    api_key: str | None = None
    backend: str = "hermes-cli"
    parallel_group: str = "triad"
    allow_live_runs: bool = True

    def to_public_dict(self, reveal_secret: bool = False) -> dict[str, Any]:
        payload = asdict(self)
        if not reveal_secret:
            payload["api_key"] = mask_secret(self.api_key)
        return payload


class SharedMemoryStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text(json.dumps({"entries": []}, indent=2), encoding="utf-8")
        self._lock = Lock()

    def _load(self) -> dict[str, Any]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _save(self, payload: dict[str, Any]) -> None:
        self.path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    def append(
        self,
        author: str,
        content: str,
        *,
        category: str = "note",
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        with self._lock:
            payload = self._load()
            entries = payload.setdefault("entries", [])
            entry = {
                "entry_id": f"mem-{len(entries) + 1:04d}",
                "timestamp": utc_now_iso(),
                "author": author,
                "category": category,
                "tags": tags or [],
                "metadata": metadata or {},
                "content": content,
            }
            entries.append(entry)
            self._save(payload)
            return entry

    def list(self, limit: int = 20) -> list[dict[str, Any]]:
        payload = self._load()
        entries = payload.get("entries", [])
        return entries[-limit:]

    def search(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        lowered = query.lower()
        matches = []
        for entry in reversed(self._load().get("entries", [])):
            haystack = json.dumps(entry, ensure_ascii=False).lower()
            if lowered in haystack:
                matches.append(entry)
            if len(matches) >= limit:
                break
        return list(reversed(matches))

    def excerpt(self, limit: int = 6) -> str:
        lines = []
        for entry in self.list(limit=limit):
            content = str(entry["content"]).replace("\n", " ").strip()
            if len(content) > 180:
                content = f"{content[:177]}..."
            lines.append(f"- [{entry['timestamp']}] {entry['author']}: {content}")
        return "\n".join(lines) if lines else "- shared memory is currently empty"


class ConfigStore:
    def __init__(self, root: Path | None = None) -> None:
        self.root = (root or DEFAULT_ROOT).resolve()

    @property
    def config_dir(self) -> Path:
        return self.root / "config"

    @property
    def agents_dir(self) -> Path:
        return self.config_dir / "agents"

    @property
    def skills_path(self) -> Path:
        return self.root / "skills" / "catalog.yaml"

    @property
    def system_path(self) -> Path:
        return self.config_dir / "system.yaml"

    @property
    def secrets_path(self) -> Path:
        return self.config_dir / "secrets.local.yaml"

    def system(self) -> dict[str, Any]:
        return load_yaml(self.system_path, {})

    def skill_catalog(self) -> dict[str, Any]:
        return load_yaml(self.skills_path, {"skills": {}})

    def shared_memory_path(self) -> Path:
        rel_path = self.system().get("shared_memory_path", "runtime/memory/shared_memory.json")
        return self.root / rel_path

    def shared_memory(self) -> SharedMemoryStore:
        return SharedMemoryStore(self.shared_memory_path())

    def _agent_path(self, slug: str) -> Path:
        return self.agents_dir / f"{slug}.yaml"

    def _relative_to_root(self, path: Path) -> str:
        return str(path.resolve().relative_to(self.root)).replace("\\", "/")

    def load_secrets(self) -> dict[str, Any]:
        return load_yaml(self.secrets_path, {"agents": {}})

    def save_secrets(self, payload: dict[str, Any]) -> None:
        write_yaml(self.secrets_path, payload)

    def list_agents(self) -> list[AgentConfig]:
        order = self.system().get("agent_order", [])
        agents = [self.load_agent(path.stem) for path in sorted(self.agents_dir.glob("*.yaml"))]
        order_index = {slug: index for index, slug in enumerate(order)}
        agents.sort(key=lambda item: (order_index.get(item.slug, 999), item.slug))
        return agents

    def load_agent(self, slug: str) -> AgentConfig:
        payload = load_yaml(self._agent_path(slug), None)
        if payload is None:
            raise FileNotFoundError(f"Unknown agent: {slug}")
        secret_payload = self.load_secrets().get("agents", {}).get(slug, {})
        payload["api_key"] = secret_payload.get("api_key")
        return AgentConfig(**payload)

    def save_agent(self, agent: AgentConfig) -> None:
        payload = asdict(agent)
        payload.pop("api_key", None)
        write_yaml(self._agent_path(agent.slug), payload)

    def read_prompt(self, slug: str) -> str:
        agent = self.load_agent(slug)
        return (self.root / agent.prompt_file).read_text(encoding="utf-8")

    def write_prompt(self, slug: str, text: str) -> None:
        agent = self.load_agent(slug)
        prompt_path = self.root / agent.prompt_file
        prompt_path.parent.mkdir(parents=True, exist_ok=True)
        prompt_path.write_text(text.strip() + "\n", encoding="utf-8")

    def set_api_key(self, slug: str, value: str | None) -> None:
        secrets_payload = self.load_secrets()
        secrets_payload.setdefault("agents", {}).setdefault(slug, {})["api_key"] = value or ""
        self.save_secrets(secrets_payload)

    def update_agent(
        self,
        slug: str,
        *,
        role: str | None = None,
        specialty: str | None = None,
        description: str | None = None,
        provider: str | None = None,
        model: str | None = None,
        api_key_env: str | None = None,
        api_key: str | None = None,
        skill_add: list[str] | None = None,
        skill_remove: list[str] | None = None,
        tool_add: list[str] | None = None,
        tool_remove: list[str] | None = None,
        prompt_text: str | None = None,
        prompt_file: str | None = None,
    ) -> AgentConfig:
        agent = self.load_agent(slug)

        if role is not None:
            agent.role = role
        if specialty is not None:
            agent.specialty = specialty
        if description is not None:
            agent.description = description
        if provider is not None:
            agent.provider = provider
        if model is not None:
            agent.model = model
        if api_key_env is not None:
            agent.api_key_env = api_key_env

        if prompt_file is not None:
            new_prompt_path = (self.root / prompt_file).resolve()
            if self.root not in new_prompt_path.parents and new_prompt_path != self.root:
                raise ValueError("prompt_file must stay inside the workspace root")
            new_prompt_path.parent.mkdir(parents=True, exist_ok=True)
            if not new_prompt_path.exists():
                new_prompt_path.write_text("", encoding="utf-8")
            agent.prompt_file = self._relative_to_root(new_prompt_path)

        if prompt_text is not None:
            self.write_prompt(slug, prompt_text)

        if skill_add:
            for skill in skill_add:
                if skill not in agent.enabled_skills:
                    agent.enabled_skills.append(skill)
        if skill_remove:
            agent.enabled_skills = [skill for skill in agent.enabled_skills if skill not in skill_remove]

        if tool_add:
            for tool in tool_add:
                if tool not in agent.enabled_tools:
                    agent.enabled_tools.append(tool)
        if tool_remove:
            agent.enabled_tools = [tool for tool in agent.enabled_tools if tool not in tool_remove]

        self.save_agent(agent)

        if api_key is not None:
            self.set_api_key(slug, api_key)

        return self.load_agent(slug)