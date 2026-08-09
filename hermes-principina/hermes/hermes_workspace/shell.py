from __future__ import annotations

import cmd
import json
import shlex

from rich.console import Console
from rich.table import Table

from .orchestrator import WorkspaceOrchestrator
from .store import ConfigStore


class HermesSlashShell(cmd.Cmd):
    intro = "Hermes Specialist shell. Usa /help per i comandi."
    prompt = "hermes[all]> "

    def __init__(self, root, default_targets: list[str] | None = None):
        super().__init__()
        self.root = root
        self.console = Console()
        self.active_targets: list[str] = []
        self._set_active_targets(default_targets or [])

    def _available_agent_slugs(self) -> list[str]:
        return [agent.slug for agent in ConfigStore(self.root).list_agents()]

    def _validate_targets(self, targets: list[str]) -> list[str]:
        available = set(self._available_agent_slugs())
        unknown = [target for target in targets if target not in available]
        if unknown:
            raise ValueError(f"Agenti sconosciuti: {', '.join(unknown)}")

        unique_targets: list[str] = []
        seen: set[str] = set()
        for target in targets:
            if target not in seen:
                seen.add(target)
                unique_targets.append(target)
        return unique_targets

    def _set_active_targets(self, targets: list[str]) -> None:
        self.active_targets = self._validate_targets(targets)
        label = ",".join(self.active_targets) if self.active_targets else "all"
        self.prompt = f"hermes[{label}]> "

    def _target_agents(self) -> list[str] | None:
        return self.active_targets or None

    def _target_label(self) -> str:
        return ", ".join(self.active_targets) if self.active_targets else "tutti gli agenti"

    def parseline(self, line: str):
        stripped = line.strip()
        if stripped.startswith("/"):
            stripped = stripped[1:]
        return super().parseline(stripped)

    def do_agents(self, arg: str) -> None:
        store = ConfigStore(self.root)
        table = Table(title="Hermes Agents")
        table.add_column("Slug")
        table.add_column("Display")
        table.add_column("Role")
        table.add_column("Skills")
        table.add_column("Target")
        for agent in store.list_agents():
            is_target = "yes" if not self.active_targets or agent.slug in self.active_targets else "no"
            table.add_row(agent.slug, agent.display_name, agent.role, ", ".join(agent.enabled_skills), is_target)
        self.console.print(table)

    def do_targets(self, arg: str) -> None:
        args = shlex.split(arg)
        if not args or args[0] in {"show", "list"}:
            self.console.print(f"Target attivi: {self._target_label()}")
            self.console.print(f"Agenti disponibili: {', '.join(self._available_agent_slugs())}")
            return

        try:
            if args[0] == "set" and len(args) >= 2:
                self._set_active_targets(args[1:])
                self.console.print(f"Target attivi impostati: {self._target_label()}")
                return
            if args[0] == "add" and len(args) >= 2:
                self._set_active_targets(self.active_targets + args[1:])
                self.console.print(f"Target attivi aggiornati: {self._target_label()}")
                return
            if args[0] == "remove" and len(args) >= 2:
                self._set_active_targets([target for target in self.active_targets if target not in args[1:]])
                self.console.print(f"Target attivi aggiornati: {self._target_label()}")
                return
            if args[0] in {"clear", "all"}:
                self._set_active_targets([])
                self.console.print("Target attivi azzerati: verranno usati tutti gli agenti.")
                return
        except ValueError as exc:
            self.console.print(str(exc))
            return

        self.console.print(
            "Usage: /targets [show] | /targets set <agent...> | /targets add <agent...> | /targets remove <agent...> | /targets clear"
        )

    def do_show(self, arg: str) -> None:
        args = shlex.split(arg)
        if not args:
            self.console.print("Usage: /show <agent>")
            return
        store = ConfigStore(self.root)
        payload = store.load_agent(args[0]).to_public_dict()
        payload["prompt_text"] = store.read_prompt(args[0]).strip()
        self.console.print_json(json.dumps(payload, ensure_ascii=False, indent=2))

    def do_role(self, arg: str) -> None:
        args = shlex.split(arg)
        if len(args) < 2:
            self.console.print("Usage: /role <agent> <new role>")
            return
        store = ConfigStore(self.root)
        agent = store.update_agent(args[0], role=" ".join(args[1:]))
        self.console.print(f"Role aggiornata per {agent.slug}")

    def do_prompt(self, arg: str) -> None:
        args = shlex.split(arg)
        if len(args) < 2:
            self.console.print("Usage: /prompt <agent> <new prompt>")
            return
        store = ConfigStore(self.root)
        agent = args[0]
        store.update_agent(agent, prompt_text=" ".join(args[1:]))
        self.console.print(f"Prompt aggiornato per {agent}")

    def do_skill(self, arg: str) -> None:
        args = shlex.split(arg)
        if len(args) != 3 or args[0] not in {"add", "remove"}:
            self.console.print("Usage: /skill add|remove <agent> <skill>")
            return
        store = ConfigStore(self.root)
        if args[0] == "add":
            store.update_agent(args[1], skill_add=[args[2]])
        else:
            store.update_agent(args[1], skill_remove=[args[2]])
        self.console.print(f"Skill aggiornata per {args[1]}")

    def do_tool(self, arg: str) -> None:
        args = shlex.split(arg)
        if len(args) != 3 or args[0] not in {"add", "remove"}:
            self.console.print("Usage: /tool add|remove <agent> <tool>")
            return
        store = ConfigStore(self.root)
        if args[0] == "add":
            store.update_agent(args[1], tool_add=[args[2]])
        else:
            store.update_agent(args[1], tool_remove=[args[2]])
        self.console.print(f"Tool aggiornato per {args[1]}")

    def do_apikey(self, arg: str) -> None:
        args = shlex.split(arg)
        if len(args) != 2:
            self.console.print("Usage: /apikey <agent> <value>")
            return
        store = ConfigStore(self.root)
        store.update_agent(args[0], api_key=args[1])
        self.console.print(f"API key aggiornata per {args[0]}")

    def do_model(self, arg: str) -> None:
        args = shlex.split(arg)
        if len(args) < 2:
            self.console.print("Usage: /model <agent> <model>")
            return
        store = ConfigStore(self.root)
        store.update_agent(args[0], model=" ".join(args[1:]))
        self.console.print(f"Model aggiornato per {args[0]}")

    def do_provider(self, arg: str) -> None:
        args = shlex.split(arg)
        if len(args) != 2:
            self.console.print("Usage: /provider <agent> <provider>")
            return
        store = ConfigStore(self.root)
        store.update_agent(args[0], provider=args[1])
        self.console.print(f"Provider aggiornato per {args[0]}")

    def do_memory(self, arg: str) -> None:
        args = shlex.split(arg)
        store = ConfigStore(self.root)
        memory = store.shared_memory()
        if not args or args[0] == "list":
            limit = int(args[1]) if len(args) > 1 else 10
            self.console.print_json(json.dumps(memory.list(limit=limit), ensure_ascii=False, indent=2))
            return
        if args[0] == "add" and len(args) >= 3:
            author = args[1]
            content = " ".join(args[2:])
            memory.append(author, content)
            self.console.print("Memoria aggiornata")
            return
        if args[0] == "search" and len(args) >= 2:
            query = " ".join(args[1:])
            self.console.print_json(json.dumps(memory.search(query), ensure_ascii=False, indent=2))
            return
        self.console.print("Usage: /memory list [limit] | /memory add <author> <content> | /memory search <query>")

    def do_dispatch(self, arg: str) -> None:
        task = arg.strip()
        if not task:
            self.console.print("Usage: /dispatch <task>")
            return
        payload = WorkspaceOrchestrator(self.root).dispatch(task, live=False, target_agents=self._target_agents())
        self.console.print_json(json.dumps(payload, ensure_ascii=False, indent=2))

    def do_live(self, arg: str) -> None:
        task = arg.strip()
        if not task:
            self.console.print("Usage: /live <task>")
            return
        payload = WorkspaceOrchestrator(self.root).dispatch(task, live=True, target_agents=self._target_agents())
        self.console.print_json(json.dumps(payload, ensure_ascii=False, indent=2))

    def do_reload(self, arg: str) -> None:
        self.console.print("Config e prompt sono letti da disco a ogni comando. Nessun reload esplicito richiesto.")

    def do_exit(self, arg: str) -> bool:
        return True

    def do_quit(self, arg: str) -> bool:
        return True

    def do_EOF(self, arg: str) -> bool:
        self.console.print("")
        return True