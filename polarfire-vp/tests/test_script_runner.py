from pathlib import Path

from rich.console import Console

from polarfire_vp.console import run_script


def test_script_runner_loads_example_board_and_toggles_logging(tmp_path: Path) -> None:
    script = tmp_path / "demo.resc"
    script.write_text(
        "\n".join(
            [
                "load platform /workspaces/random/polarfire-vp/examples/boards/polarfire_vk.yaml",
                "reset",
                "harts",
                "hart release 1",
                "hart select 1",
                "log peripheral uart0 on",
            ]
        ),
        encoding="utf-8",
    )

    session = run_script(script, console=Console(record=True))
    try:
        assert session.machine is not None
        assert session.machine.name == "PolarFire SoC Video Kit"
        assert session.machine.peripherals["uart0"].log_accesses is True
        assert len(session.machine.harts) == 5
        assert session.machine.selected_hart_id == 1
    finally:
        session.shutdown()
