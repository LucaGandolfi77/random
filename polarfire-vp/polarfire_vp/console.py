"""Interactive shell and script runner."""

from __future__ import annotations

import cmd
import shlex
from pathlib import Path

from rich.console import Console

from polarfire_vp.session import SimulationSession


class SimulationConsole(cmd.Cmd):
    intro = "PolarFire VP interactive shell. Type help or ? to list commands."
    prompt = "pfvp> "

    def __init__(self, session: SimulationSession | None = None, *, console: Console | None = None):
        super().__init__()
        self.console = console or Console()
        self.session = session or SimulationSession(console=self.console)

    def do_load(self, arg: str) -> bool | None:
        tokens = shlex.split(arg)
        if len(tokens) != 2 or tokens[0] not in {"platform", "elf"}:
            self.console.print("usage: load platform <path> | load elf <path>")
            return None
        kind, raw_path = tokens
        path = Path(raw_path)
        if kind == "platform":
            machine = self.session.load_platform(path)
            self.console.print(f"Loaded platform {machine.name} from {path}")
        else:
            image = self.session.load_elf(path)
            self.console.print(
                f"Loaded ELF {path} entry=0x{image.entry_point:016x} symbols={len(image.symbols.symbols)}"
            )
        return None

    def do_reset(self, arg: str) -> None:
        self.session.reset()
        self.console.print("Machine reset")

    def do_start(self, arg: str) -> None:
        tokens = shlex.split(arg)
        max_steps = int(tokens[0], 0) if tokens else 100_000
        result = self.session.run(max_steps=max_steps)
        self.console.print(f"Stopped: {result.reason} pc=0x{result.pc:016x} steps={result.steps}")

    def do_continue(self, arg: str) -> None:
        self.do_start(arg)

    def do_stop(self, arg: str) -> None:
        if self.session.machine is not None:
            self.session.machine.request_stop()
        self.console.print("Stop requested")

    def do_step(self, arg: str) -> None:
        tokens = shlex.split(arg)
        count = int(tokens[0], 0) if tokens else 1
        result = self.session.step(count)
        self.console.print(f"Step stop: {result.reason} pc=0x{result.pc:016x} steps={result.steps}")

    def do_regs(self, arg: str) -> None:
        tokens = shlex.split(arg)
        hart_id = int(tokens[0], 0) if tokens else None
        self.console.print(self.session.render_registers(hart_id))

    def do_harts(self, arg: str) -> None:
        self.console.print(self.session.render_harts())

    def do_hart(self, arg: str) -> None:
        tokens = shlex.split(arg)
        if len(tokens) < 2:
            self.console.print("usage: hart <select|release|halt> <hart_id> [pc]")
            return
        action = tokens[0]
        hart_id = int(tokens[1], 0)
        if action == "select":
            self.session.select_hart(hart_id)
            self.console.print(f"Selected hart {hart_id}")
            return
        if action == "release":
            pc = int(tokens[2], 0) if len(tokens) > 2 else None
            self.session.release_hart(hart_id, pc=pc)
            self.console.print(f"Released hart {hart_id}")
            return
        if action == "halt":
            self.session.halt_hart(hart_id)
            self.console.print(f"Halted hart {hart_id}")
            return
        self.console.print("usage: hart <select|release|halt> <hart_id> [pc]")

    def do_mem(self, arg: str) -> None:
        tokens = shlex.split(arg)
        if len(tokens) != 3 or tokens[0] != "read":
            self.console.print("usage: mem read <address> <length>")
            return
        address = int(tokens[1], 0)
        length = int(tokens[2], 0)
        data = self.session.read_memory(address, length)
        self.console.print(data.hex())

    def do_log(self, arg: str) -> None:
        tokens = shlex.split(arg)
        if len(tokens) != 3 or tokens[0] != "peripheral":
            self.console.print("usage: log peripheral <name> <on|off>")
            return
        self.session.enable_peripheral_logging(tokens[1], tokens[2].lower() == "on")
        self.console.print(f"Peripheral {tokens[1]} logging {tokens[2]}")

    def do_break(self, arg: str) -> None:
        tokens = shlex.split(arg)
        if len(tokens) != 1:
            self.console.print("usage: break <address|symbol>")
            return
        address = self.session.add_breakpoint(tokens[0])
        self.console.print(f"Breakpoint added at 0x{address:016x}")

    def do_delete(self, arg: str) -> None:
        tokens = shlex.split(arg)
        if len(tokens) != 1:
            self.console.print("usage: delete <address|symbol>")
            return
        address = self.session.remove_breakpoint(tokens[0])
        self.console.print(f"Breakpoint removed at 0x{address:016x}")

    def do_peripherals(self, arg: str) -> None:
        if self.session.machine is None:
            self.console.print("No platform loaded")
            return
        for name, peripheral in self.session.machine.peripherals.items():
            self.console.print(f"{name}: {peripheral.__class__.__name__}")

    def do_start_gdb_server(self, arg: str) -> None:
        tokens = shlex.split(arg)
        port = int(tokens[0], 0) if tokens else 3333
        host, bound_port = self.session.start_gdb_server(port)
        self.console.print(f"GDB server listening on {host}:{bound_port}")

    def do_quit(self, arg: str) -> bool:
        self.session.shutdown()
        return True

    def do_exit(self, arg: str) -> bool:
        return self.do_quit(arg)

    def default(self, line: str) -> None:
        self.console.print(f"Unknown command: {line}")


def run_script(path: str | Path, *, session: SimulationSession | None = None, console: Console | None = None) -> SimulationSession:
    shell = SimulationConsole(session=session, console=console)
    script_path = Path(path)
    with script_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            command = line.strip()
            if not command or command.startswith("#"):
                continue
            shell.onecmd(command)
    return shell.session
