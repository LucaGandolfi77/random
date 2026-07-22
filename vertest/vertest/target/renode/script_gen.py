from __future__ import annotations

from pathlib import Path
from typing import Optional

from vertest.target.cross_compile import TargetConfig


class RenodeScriptGenerator:
    """Generates Renode simulation scripts (.resc) for running
    VeriTest harnesses in a simulated embedded environment."""

    PLATFORM_DEFS: dict[str, str] = {
        "cortex-m3": """
platform @ platforms/cpus/cortex-m3.repl
cpu Type: "cortex-m3"
""",
        "cortex-m4": """
platform @ platforms/cpus/cortex-m4.repl
cpu Type: "cortex-m4"
""",
        "cortex-m0": """
platform @ platforms/cpus/cortex-m0.repl
cpu Type: "cortex-m0"
""",
        "riscv32": """
platform @ platforms/cpus/riscv.repl
cpu Type: "riscv"
""",
    }

    UART_HANDLER = """
emulation CreateUartPtyTerminal "uart0"
sysbus.cpu Uart0 -> uart0 @ 0x40004000
"""

    def generate_resc(
        self,
        elf_path: Path,
        target: TargetConfig,
        output_path: Path,
        timeout_s: int = 30,
    ) -> Path:
        platform = self.PLATFORM_DEFS.get(target.renode_platform, self.PLATFORM_DEFS.get("cortex-m3", ""))
        script = f""":name: VeriTest - {target.name}
:description: Auto-generated Renode script for running unit tests
:kernel: {elf_path}

{machine_block(target.renode_platform)}

{self.UART_HANDLER}

sysbus LoadELF @{elf_path}

# Start simulation
emulation RunFor "{timeout_s}s"
"""

        path = output_path / "vertest_run.resc"
        path.write_text(script)
        return path

    def generate_repl(self, target_name: str, output_path: Path) -> Optional[Path]:
        repl_content = self.PLATFORM_DEFS.get(target_name)
        if not repl_content:
            return None
        path = output_path / f"{target_name}.repl"
        path.write_text(repl_content)
        return path


def machine_block(platform: str) -> str:
    return f"""
mach create
machine LoadPlatformDescription @platforms/cpus/{platform}.repl
"""
