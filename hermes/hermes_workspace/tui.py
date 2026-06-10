from __future__ import annotations

import curses
import shlex
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .orchestrator import WorkspaceOrchestrator
from .store import ConfigStore


def _trim(value: str, length: int) -> str:
    text = value.strip().replace("\n", " ")
    if len(text) <= length:
        return text
    if length <= 3:
        return text[:length]
    return f"{text[: length - 3]}..."


def _wrap_lines(lines: list[str], width: int, limit: int) -> list[str]:
    wrapped: list[str] = []
    safe_width = max(8, width)
    for line in lines:
        if not line:
            wrapped.append("")
        else:
            wrapped.extend(textwrap.wrap(line, width=safe_width) or [""])
        if len(wrapped) >= limit:
            return wrapped[:limit]
    return wrapped[:limit]


@dataclass
class DashboardState:
    selected_index: int = 0
    live_mode: bool = False
    active_targets: list[str] = field(default_factory=list)
    status_message: str = "TUI pronta. Scrivi un task o un comando slash."
    last_dispatch: dict[str, Any] | None = None
    activity_log: list[str] = field(default_factory=list)


class HermesDashboardController:
    def __init__(self, root: Path | None = None) -> None:
        self.root = (root or ConfigStore().root).resolve()
        self.state = DashboardState()

    def snapshot(self) -> dict[str, Any]:
        store = ConfigStore(self.root)
        agents = store.list_agents()
        if not agents:
            raise RuntimeError("Nessun agente Hermes configurato nel workspace.")

        self.state.selected_index = max(0, min(self.state.selected_index, len(agents) - 1))
        self.state.active_targets = self._validate_targets(self.state.active_targets)
        selected_agent = agents[self.state.selected_index]
        memory_entries = store.shared_memory().list(limit=8)
        prompt_text = store.read_prompt(selected_agent.slug).strip()
        return {
            "workspace_name": store.system().get("workspace_name", "Hermes Triad Workspace"),
            "root": str(self.root),
            "agents": agents,
            "selected_agent": selected_agent,
            "selected_prompt": prompt_text,
            "memory_entries": memory_entries,
            "status_message": self.state.status_message,
            "live_mode": self.state.live_mode,
            "active_targets": list(self.state.active_targets),
            "activity_log": self.state.activity_log[-12:],
            "last_dispatch": self.state.last_dispatch,
        }

    def render_snapshot(self, width: int = 100) -> str:
        snapshot = self.snapshot()
        selected = snapshot["selected_agent"]
        lines = [
            f"Workspace: {snapshot['workspace_name']}",
            f"Mode: {'live' if snapshot['live_mode'] else 'preview'}",
            f"Dispatch targets: {self.target_label()}",
            f"Selected agent: {selected.display_name} ({selected.slug})",
            f"Status: {snapshot['status_message']}",
            "",
            "Agents:",
        ]
        for agent in snapshot["agents"]:
            marker = "*" if agent.slug == selected.slug else "-"
            target_marker = "[x]" if not snapshot["active_targets"] or agent.slug in snapshot["active_targets"] else "[ ]"
            lines.append(
                f"{marker} {target_marker} {agent.display_name} | {agent.role} | skills: {', '.join(agent.enabled_skills)}"
            )

        lines.extend(
            [
                "",
                "Selected prompt:",
                _trim(snapshot["selected_prompt"], width),
                "",
                "Shared memory:",
            ]
        )
        for entry in snapshot["memory_entries"][-5:]:
            lines.append(f"- [{entry['timestamp']}] {entry['author']}: {_trim(str(entry['content']), width)}")

        lines.extend(["", "Activity:"])
        for line in snapshot["activity_log"][-6:]:
            lines.append(f"- {line}")

        if snapshot["last_dispatch"]:
            lines.extend(["", "Last dispatch:"])
            for item in snapshot["last_dispatch"]["results"]:
                preview = item.get("output") or item.get("error") or ""
                lines.append(
                    f"- {item['display_name']} | {item['status']} | {item['mode']} | {_trim(preview, width)}"
                )
        return "\n".join(lines)

    def _available_agent_slugs(self) -> list[str]:
        return [agent.slug for agent in ConfigStore(self.root).list_agents()]

    def _validate_targets(self, targets: list[str]) -> list[str]:
        available = set(self._available_agent_slugs())
        unique_targets: list[str] = []
        seen: set[str] = set()
        for target in targets:
            if target in available and target not in seen:
                seen.add(target)
                unique_targets.append(target)
        return unique_targets

    def target_label(self) -> str:
        return ", ".join(self.state.active_targets) if self.state.active_targets else "tutti gli agenti"

    def _set_active_targets(self, targets: list[str]) -> None:
        valid_targets = self._validate_targets(targets)
        unknown = [target for target in targets if target not in set(self._available_agent_slugs())]
        if unknown:
            raise ValueError(f"Agenti sconosciuti: {', '.join(unknown)}")
        self.state.active_targets = valid_targets

    def toggle_selected_target(self) -> None:
        selected = ConfigStore(self.root).list_agents()[self.state.selected_index]
        if not self.state.active_targets:
            self.state.active_targets = [selected.slug]
            self._log(f"Target attivi: {self.target_label()}.")
            return
        if selected.slug in self.state.active_targets:
            self.state.active_targets = [slug for slug in self.state.active_targets if slug != selected.slug]
            self._log(f"Target attivi: {self.target_label()}.")
            return
        self.state.active_targets.append(selected.slug)
        self.state.active_targets = self._validate_targets(self.state.active_targets)
        self._log(f"Target attivi: {self.target_label()}.")

    def move_selection(self, delta: int) -> None:
        agents = ConfigStore(self.root).list_agents()
        if not agents:
            return
        self.state.selected_index = (self.state.selected_index + delta) % len(agents)
        selected = agents[self.state.selected_index]
        self.state.status_message = f"Agente selezionato: {selected.display_name}."

    def toggle_live_mode(self) -> None:
        self.state.live_mode = not self.state.live_mode
        self._log(f"Modalita di default: {'live' if self.state.live_mode else 'preview'}")

    def select_agent(self, slug: str) -> None:
        agents = ConfigStore(self.root).list_agents()
        for index, agent in enumerate(agents):
            if agent.slug == slug:
                self.state.selected_index = index
                self.state.status_message = f"Agente selezionato: {agent.display_name}."
                return
        raise ValueError(f"Agente sconosciuto: {slug}")

    def execute(self, raw: str) -> bool:
        text = raw.strip()
        if not text:
            return True
        if not text.startswith("/"):
            self._dispatch(text, live=self.state.live_mode)
            return True

        args = shlex.split(text[1:])
        if not args:
            return True

        command = args[0]
        values = args[1:]
        if command in {"quit", "exit"}:
            return False
        if command in {"help", "?"}:
            self._log("/show <agent>, /targets [show|set|add|remove|clear], /role <agent> <text>, /prompt <agent> <text>, /skill add|remove <agent> <skill>, /tool add|remove <agent> <tool>, /model <agent> <model>, /provider <agent> <provider>, /apikey <agent> <value>, /memory add <author> <text>, /dispatch <task>, /live <task>, /mode live|preview")
            return True
        if command == "show" and len(values) == 1:
            self.select_agent(values[0])
            return True
        if command == "targets":
            if not values or values[0] in {"show", "list"}:
                self._log(f"Target attivi: {self.target_label()}.")
                return True
            try:
                if values[0] == "set" and len(values) >= 2:
                    self._set_active_targets(values[1:])
                    self._log(f"Target attivi: {self.target_label()}.")
                    return True
                if values[0] == "add" and len(values) >= 2:
                    self._set_active_targets(self.state.active_targets + values[1:])
                    self._log(f"Target attivi: {self.target_label()}.")
                    return True
                if values[0] == "remove" and len(values) >= 2:
                    self._set_active_targets([slug for slug in self.state.active_targets if slug not in values[1:]])
                    self._log(f"Target attivi: {self.target_label()}.")
                    return True
                if values[0] in {"clear", "all"}:
                    self._set_active_targets([])
                    self._log("Target attivi azzerati: verranno usati tutti gli agenti.")
                    return True
            except ValueError as exc:
                self.state.status_message = str(exc)
                return True
        if command == "role" and len(values) >= 2:
            ConfigStore(self.root).update_agent(values[0], role=" ".join(values[1:]))
            self.select_agent(values[0])
            self._log(f"Role aggiornata per {values[0]}.")
            return True
        if command == "prompt" and len(values) >= 2:
            ConfigStore(self.root).update_agent(values[0], prompt_text=" ".join(values[1:]))
            self.select_agent(values[0])
            self._log(f"Prompt aggiornato per {values[0]}.")
            return True
        if command == "skill" and len(values) == 3 and values[0] in {"add", "remove"}:
            store = ConfigStore(self.root)
            if values[0] == "add":
                store.update_agent(values[1], skill_add=[values[2]])
            else:
                store.update_agent(values[1], skill_remove=[values[2]])
            self.select_agent(values[1])
            self._log(f"Skill aggiornata per {values[1]}.")
            return True
        if command == "tool" and len(values) == 3 and values[0] in {"add", "remove"}:
            store = ConfigStore(self.root)
            if values[0] == "add":
                store.update_agent(values[1], tool_add=[values[2]])
            else:
                store.update_agent(values[1], tool_remove=[values[2]])
            self.select_agent(values[1])
            self._log(f"Tool aggiornato per {values[1]}.")
            return True
        if command == "model" and len(values) >= 2:
            ConfigStore(self.root).update_agent(values[0], model=" ".join(values[1:]))
            self.select_agent(values[0])
            self._log(f"Model aggiornato per {values[0]}.")
            return True
        if command == "provider" and len(values) == 2:
            ConfigStore(self.root).update_agent(values[0], provider=values[1])
            self.select_agent(values[0])
            self._log(f"Provider aggiornato per {values[0]}.")
            return True
        if command == "apikey" and len(values) == 2:
            ConfigStore(self.root).update_agent(values[0], api_key=values[1])
            self.select_agent(values[0])
            self._log(f"API key aggiornata per {values[0]}.")
            return True
        if command == "memory" and len(values) >= 3 and values[0] == "add":
            entry = ConfigStore(self.root).shared_memory().append(values[1], " ".join(values[2:]))
            self._log(f"Memoria aggiornata: {entry['entry_id']}.")
            return True
        if command == "dispatch" and values:
            self._dispatch(" ".join(values), live=False)
            return True
        if command == "live" and values:
            self._dispatch(" ".join(values), live=True)
            return True
        if command == "mode" and len(values) == 1 and values[0] in {"live", "preview"}:
            self.state.live_mode = values[0] == "live"
            self._log(f"Modalita di default: {values[0]}.")
            return True

        self.state.status_message = f"Comando non riconosciuto: {text}"
        return True

    def _dispatch(self, task: str, *, live: bool) -> None:
        payload = WorkspaceOrchestrator(self.root).dispatch(
            task,
            live=live,
            target_agents=self.state.active_targets or None,
        )
        self.state.last_dispatch = payload
        self._log(
            f"Dispatch {'live' if live else 'preview'} completato: {payload['agent_count']} agenti ({self.target_label()}) su task '{_trim(task, 48)}'."
        )

    def _log(self, message: str) -> None:
        self.state.status_message = message
        self.state.activity_log.append(message)
        self.state.activity_log = self.state.activity_log[-50:]


class HermesWorkspaceTUI:
    def __init__(self, controller: HermesDashboardController, refresh_interval: float = 1.0) -> None:
        self.controller = controller
        self.refresh_interval = max(0.2, refresh_interval)
        self.input_buffer = ""

    def run(self) -> int:
        curses.wrapper(self._loop)
        return 0

    def _loop(self, stdscr: curses.window) -> None:
        try:
            curses.curs_set(1)
        except curses.error:
            pass
        stdscr.keypad(True)
        stdscr.timeout(int(self.refresh_interval * 1000))
        curses.use_default_colors()
        self._init_colors()

        while True:
            snapshot = self.controller.snapshot()
            self._draw(stdscr, snapshot)
            key = stdscr.getch()
            if key == -1:
                continue
            if key in (curses.KEY_UP, ord("k")):
                self.controller.move_selection(-1)
                continue
            if key in (curses.KEY_DOWN, ord("j")):
                self.controller.move_selection(1)
                continue
            if key == curses.KEY_F2:
                self.controller.toggle_live_mode()
                continue
            if key == ord(" "):
                self.controller.toggle_selected_target()
                continue
            if key in (10, 13, curses.KEY_ENTER):
                should_continue = self.controller.execute(self.input_buffer)
                self.input_buffer = ""
                if not should_continue:
                    return
                continue
            if key in (27,):
                return
            if key in (curses.KEY_BACKSPACE, 127, 8):
                self.input_buffer = self.input_buffer[:-1]
                continue
            if key == 12:
                self.controller._log("Refresh manuale eseguito.")
                continue
            if 32 <= key <= 126:
                self.input_buffer += chr(key)

    def _init_colors(self) -> None:
        try:
            curses.init_pair(1, curses.COLOR_CYAN, -1)
            curses.init_pair(2, curses.COLOR_GREEN, -1)
            curses.init_pair(3, curses.COLOR_YELLOW, -1)
            curses.init_pair(4, curses.COLOR_MAGENTA, -1)
        except curses.error:
            return

    def _draw(self, stdscr: curses.window, snapshot: dict[str, Any]) -> None:
        stdscr.erase()
        height, width = stdscr.getmaxyx()
        if height < 18 or width < 80:
            stdscr.addnstr(0, 0, "Terminale troppo piccolo per la TUI Hermes. Minimo 80x18.", max(1, width - 1))
            stdscr.refresh()
            return

        header_height = 3
        footer_height = 3
        body_height = height - header_height - footer_height
        left_width = max(28, width // 3)
        right_width = width - left_width
        upper_height = max(8, body_height // 2)
        lower_height = body_height - upper_height

        self._draw_panel(
            stdscr,
            0,
            0,
            header_height,
            width,
            "Hermes TUI",
            [
                f"Workspace: {snapshot['workspace_name']} | Mode: {'live' if snapshot['live_mode'] else 'preview'} | F2 toggle mode | ESC exit",
                f"Targets: {self.controller.target_label()} | F2 toggle mode | SPACE toggle selected target | ESC exit",
                f"Status: {snapshot['status_message']}",
            ],
            color_pair=1,
        )

        agent_lines = [
            f"{agent.display_name} [{agent.slug}]",
            f"  role: {_trim(agent.role, left_width - 8)}",
            f"  skills: {_trim(', '.join(agent.enabled_skills), left_width - 10)}",
            "",
        ]
        agent_lines = agent_lines[:-1]
        selected_slug = snapshot["selected_agent"].slug
        self._draw_agent_panel(
            stdscr,
            header_height,
            0,
            upper_height,
            left_width,
            snapshot["agents"],
            selected_slug,
            snapshot["active_targets"],
        )

        memory_lines = []
        for entry in snapshot["memory_entries"]:
            memory_lines.append(f"[{entry['timestamp']}] {entry['author']}")
            memory_lines.append(_trim(str(entry['content']), left_width - 4))
            memory_lines.append("")
        self._draw_panel(
            stdscr,
            header_height + upper_height,
            0,
            lower_height,
            left_width,
            "Shared Memory",
            memory_lines,
            color_pair=2,
        )

        selected = snapshot["selected_agent"]
        detail_lines = [
            f"Slug: {selected.slug}",
            f"Provider: {selected.provider}",
            f"Model: {selected.model}",
            f"API env: {selected.api_key_env or '-'}",
            f"Role: {selected.role}",
            f"Specialty: {selected.specialty}",
            f"Tools: {', '.join(selected.enabled_tools) or '-'}",
            "Prompt:",
            snapshot["selected_prompt"] or "(prompt vuoto)",
        ]
        self._draw_panel(
            stdscr,
            header_height,
            left_width,
            upper_height,
            right_width,
            "Selected Agent",
            detail_lines,
            color_pair=3,
        )

        activity_lines = list(snapshot["activity_log"])
        if snapshot["last_dispatch"]:
            activity_lines.append("")
            activity_lines.append(f"Last dispatch: {snapshot['last_dispatch']['mode']}")
            for item in snapshot["last_dispatch"]["results"]:
                preview = item.get("output") or item.get("error") or ""
                activity_lines.append(
                    f"{item['display_name']} | {item['status']} | {_trim(preview, right_width - 6)}"
                )
        self._draw_panel(
            stdscr,
            header_height + upper_height,
            left_width,
            lower_height,
            right_width,
            "Activity",
            activity_lines,
            color_pair=4,
        )

        self._draw_panel(
            stdscr,
            height - footer_height,
            0,
            footer_height,
            width,
            "Command",
            [
                self.input_buffer or "Scrivi un task per dispatch oppure /help per i comandi.",
                "Invio esegue | Frecce cambiano agente | Testo semplice usa il mode corrente | /dispatch e /live forzano il mode",
            ],
        )
        input_x = min(width - 2, 1 + len(" Command ") + 1)
        input_y = height - 2
        try:
            stdscr.move(input_y, min(width - 2, 1 + len(self.input_buffer)))
        except curses.error:
            pass
        stdscr.refresh()

    def _draw_agent_panel(
        self,
        stdscr: curses.window,
        y: int,
        x: int,
        height: int,
        width: int,
        agents: list[Any],
        selected_slug: str,
        active_targets: list[str],
    ) -> None:
        self._draw_box(stdscr, y, x, height, width, "Agents", color_pair=1)
        row = y + 1
        max_row = y + height - 2
        for agent in agents:
            target_marker = "[x]" if not active_targets or agent.slug in active_targets else "[ ]"
            lines = [
                f"{target_marker} {agent.display_name} [{agent.slug}]",
                f"role: {_trim(agent.role, width - 8)}",
                f"skills: {_trim(', '.join(agent.enabled_skills), width - 10)}",
                "",
            ]
            for index, line in enumerate(lines):
                if row > max_row:
                    return
                attr = curses.A_BOLD if agent.slug == selected_slug and index == 0 else curses.A_NORMAL
                if agent.slug == selected_slug:
                    attr |= curses.A_REVERSE if index == 0 else 0
                stdscr.addnstr(row, x + 1, line.ljust(max(1, width - 2)), max(1, width - 2), attr)
                row += 1

    def _draw_panel(
        self,
        stdscr: curses.window,
        y: int,
        x: int,
        height: int,
        width: int,
        title: str,
        lines: list[str],
        *,
        color_pair: int = 0,
    ) -> None:
        self._draw_box(stdscr, y, x, height, width, title, color_pair=color_pair)
        max_content_lines = max(1, height - 2)
        wrapped = _wrap_lines(lines, width - 2, max_content_lines)
        for index, line in enumerate(wrapped):
            stdscr.addnstr(y + 1 + index, x + 1, line.ljust(max(1, width - 2)), max(1, width - 2))

    def _draw_box(
        self,
        stdscr: curses.window,
        y: int,
        x: int,
        height: int,
        width: int,
        title: str,
        *,
        color_pair: int = 0,
    ) -> None:
        window = stdscr.derwin(height, width, y, x)
        window.box()
        attr = curses.color_pair(color_pair) | curses.A_BOLD if color_pair else curses.A_BOLD
        window.addnstr(0, 2, f" {title} ", max(1, width - 4), attr)
