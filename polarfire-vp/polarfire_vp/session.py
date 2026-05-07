"""High-level session object used by the CLI and script runner."""

from __future__ import annotations

from pathlib import Path

from rich.console import Console
from rich.table import Table

from polarfire_vp.boards import build_virtual_machine, load_board_from_file
from polarfire_vp.debug import GdbRemoteStub
from polarfire_vp.elf import ElfLoader, LoadedElfImage


class SimulationSession:
    def __init__(self, *, console: Console | None = None):
        self.console = console or Console()
        self.machine = None
        self.board = None
        self.image: LoadedElfImage | None = None
        self.gdb_server: GdbRemoteStub | None = None
        self.uart_output: list[str] = []

    def load_platform(self, path: str | Path):
        self.board = load_board_from_file(path)
        self.uart_output = []
        self.machine = build_virtual_machine(self.board, uart_sink=self._uart_sink)
        return self.machine

    def load_elf(self, path: str | Path) -> LoadedElfImage:
        self._require_machine()
        loader = ElfLoader(bus=self.machine.bus)
        image = loader.load(path)
        self.machine.set_entry_point(image.entry_point)
        self.machine.set_symbol_table(image.symbols)
        self.image = image
        return image

    def reset(self) -> None:
        self._require_machine()
        self.machine.reset()

    def run(self, *, max_steps: int = 100_000, hart_id: int | None = None):
        self._require_machine()
        return self.machine.run(max_steps=max_steps, hart_id=hart_id)

    def step(self, count: int = 1, *, hart_id: int | None = None):
        self._require_machine()
        return self.machine.step(count, ignore_current_breakpoint=True, hart_id=hart_id)

    def select_hart(self, hart_id: int) -> None:
        self._require_machine()
        self.machine.select_hart(hart_id)

    def release_hart(self, hart_id: int, pc: int | None = None) -> None:
        self._require_machine()
        self.machine.release_hart(hart_id, pc=pc)

    def halt_hart(self, hart_id: int) -> None:
        self._require_machine()
        self.machine.halt_hart(hart_id)

    def add_breakpoint(self, spec: str) -> int:
        self._require_machine()
        address = self._resolve_breakpoint_spec(spec)
        self.machine.add_breakpoint(address)
        return address

    def remove_breakpoint(self, spec: str) -> int:
        self._require_machine()
        address = self._resolve_breakpoint_spec(spec)
        self.machine.remove_breakpoint(address)
        return address

    def read_memory(self, address: int, length: int) -> bytes:
        self._require_machine()
        return self.machine.read_memory(address, length)

    def enable_peripheral_logging(self, name: str, enabled: bool = True) -> None:
        self._require_machine()
        peripheral = self.machine.peripherals[name]
        peripheral.enable_access_logging(enabled)

    def start_gdb_server(self, port: int = 3333, host: str = "127.0.0.1") -> tuple[str, int]:
        self._require_machine()
        if self.gdb_server is not None:
            self.gdb_server.stop()
        self.gdb_server = GdbRemoteStub(self.machine, host=host, port=port)
        info = self.gdb_server.start()
        return info.host, info.port

    def stop_gdb_server(self) -> None:
        if self.gdb_server is not None:
            self.gdb_server.stop()
            self.gdb_server = None

    def render_registers(self, hart_id: int | None = None) -> Table:
        self._require_machine()
        selected_hart_id = self.machine.selected_hart_id if hart_id is None else hart_id
        registers = self.machine.registers(selected_hart_id)
        table = Table(title=f"Registers Hart {selected_hart_id}")
        table.add_column("Register")
        table.add_column("Value")
        for name, value in registers.items():
            table.add_row(name, f"0x{value:016x}")
        return table

    def render_harts(self) -> Table:
        self._require_machine()
        table = Table(title="Hart States")
        table.add_column("Hart")
        table.add_column("Name")
        table.add_column("Kind")
        table.add_column("Role")
        table.add_column("State")
        table.add_column("PC")
        for hart in self.machine.harts:
            table.add_row(
                str(hart.hart_id),
                hart.name,
                hart.kind,
                hart.role,
                hart.state,
                f"0x{hart.cpu.pc:016x}",
            )
        return table

    def shutdown(self) -> None:
        self.stop_gdb_server()

    def _resolve_breakpoint_spec(self, spec: str) -> int:
        try:
            return int(spec, 0)
        except ValueError:
            address = self.machine.resolve_symbol(spec) if self.machine else None
            if address is None:
                raise ValueError(f"Unknown breakpoint target: {spec}")
            return address

    def _require_machine(self):
        if self.machine is None:
            raise RuntimeError("No platform loaded")

    def _uart_sink(self, text: str) -> None:
        self.uart_output.append(text)
        self.console.print(text, end="")
