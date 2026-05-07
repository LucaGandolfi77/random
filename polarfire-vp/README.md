# PolarFire VP

PolarFire VP is a functional virtual platform for PolarFire SoC firmware bring-up, driver debug and startup validation.

The project is intentionally positioned between a board-level virtual platform such as Renode and the firmware-centric workflow expected by SoftConsole users:

- board descriptions are externalized in YAML;
- firmware is loaded from ELF images;
- the platform exposes a coherent memory map and MMIO fabric;
- UART, timer, GPIO, storage and interrupt controller models are immediately usable;
- a lightweight GDB remote stub enables source-level debug against the loaded ELF.

The current implementation is not cycle-accurate, HDL-accurate or electrically accurate. It is optimized for software execution flow, MMIO visibility and architectural clarity.

## Why Python-only in v0

The first release uses Python only.

- It keeps the architecture transparent while the board model, loader, CLI and debug workflow are still evolving.
- It enables fast iteration on YAML/DSL configuration, ELF parsing, GDB integration and scripted regression flows.
- The CPU backend boundary is explicit, so a future native backend in Rust or C++ can replace the current functional interpreter without rewriting the orchestration layer.

For the current scope this yields better engineering leverage than introducing a native core prematurely.

## Implemented capabilities

- Functional virtual machine with reset, run, stop and instruction stepping.
- RV64 functional CPU backend covering a practical subset of RV64I and M instructions for early boot and MMIO-oriented firmware loops.
- Multi-hart cluster modeling for one E51 monitor hart plus four U54 application harts with explicit per-hart state.
- Memory subsystem with RAM, ROM, MMIO regions and illegal-access detection.
- Peripheral framework with UART, timer, GPIO, boot controller, CLINT, interrupt controller, block device and stub peripherals.
- ELF loader with PT_LOAD segment handling, .bss zeroing and symbol extraction from .symtab.
- GDB Remote Serial Protocol stub for register access, memory inspection, software breakpoints, continue/step control and per-hart thread selection.
- Interactive CLI shell and Renode-inspired script runner.

## Repository layout

```text
polarfire-vp/
├── docs/
│   └── architecture.md
├── examples/
│   ├── boards/
│   │   └── polarfire_vk.yaml
│   ├── firmware/
│   │   ├── hello_uart.S
│   │   ├── linker.ld
│   │   ├── Makefile
│   │   └── README.md
│   └── scripts/
│       └── demo.resc
├── polarfire_vp/
│   ├── boards/
│   ├── core/
│   ├── cpu/
│   ├── debug/
│   ├── elf/
│   ├── memory/
│   ├── peripherals/
│   ├── cli.py
│   ├── console.py
│   ├── logging_utils.py
│   └── session.py
├── tests/
└── pyproject.toml
```

## Install

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m pip install -e .[dev]
```

## Quick start

Start an interactive shell:

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m polarfire_vp.cli shell \
  --platform examples/boards/polarfire_vk.yaml
```

Inside the shell:

```text
load platform examples/boards/polarfire_vk.yaml
harts
load elf examples/firmware/build/hello_uart.elf
break main
start_gdb_server 3333
reset
continue
regs
hart release 1
hart select 1
regs 1
```

Run a scripted session:

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m polarfire_vp.cli run-script-file \
  examples/scripts/demo.resc
```

Run the more realistic C-oriented E51 boot-handoff demo:

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m polarfire_vp.cli run-script-file \
  examples/scripts/demo_variant_c.resc
```

Run one-shot execution:

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m polarfire_vp.cli run \
  --platform examples/boards/polarfire_vk.yaml \
  --elf examples/firmware/build/hello_uart.elf \
  --break-at main \
  --gdb-port 3333
```

## GDB workflow

Build the demo ELF first as described in [examples/firmware/README.md](examples/firmware/README.md), then:

1. Start the simulator shell or the one-shot runner with `--gdb-port 3333`.
2. Connect from GDB:

```bash
riscv64-unknown-elf-gdb examples/firmware/build/hello_uart.elf \
  -ex "set architecture riscv:rv64" \
  -ex "target remote 127.0.0.1:3333" \
  -ex "break main" \
  -ex "continue"
```

3. GDB sees each hart as a separate thread. Use `info threads`, `thread 2`, `info reg`, `x/16wx 0x80000000`, `stepi` and `continue`.

## Multi-hart control

The PolarFire VK example models:

- hart 0 as the E51 monitor hart;
- hart 1..4 as U54 application harts;
- secondaries parked in `waiting-for-interrupt` state after reset until software raises `MSIP`.

Interactive shell commands:

```text
harts
hart release 1
hart select 1
regs 1
hart halt 1
```

Interrupt delivery is split across:

- `clint0` for per-hart software and timer interrupts;
- `plic` for external interrupts routed to selected hart contexts.

For boot handoff experiments the example board also exposes:

- `bootctrl`, an HSS/HLS-like per-hart launch mailbox at `0x0170_0000` that stores launch metadata, HLS status markers and a board handoff area consumed by parked U54 code together with CLINT `MSIP`.

## Variant C Firmware

The repository now includes a C-oriented firmware variant in [examples/firmware/variant_c/README.md](examples/firmware/variant_c/README.md) built around the E51 code pattern you provided.

That variant keeps the E51 logic close to the Microchip HAL example:

- clear local MSIP;
- enable `MIP_MSIP` in `mie`;
- call `BT_BootMain()`;
- park the E51 in a `wfi` loop placed in `.ram_codetext`.

`BT_BootMain()` is implemented against the VP `bootctrl` mailbox and now arms the U54 harts by writing per-hart board handoff values plus CLINT `MSIP`. The parked U54 path wakes from `wfi`, reads the shared handoff registers and enters a hart-specific application path via `mret`; harts 2, 3 and 4 then exercise the simplified PLIC claim/complete interface.

The example board also contains `irqdemo0`, a clock-driven demo-only IRQ source that raises external lines 2, 3 and 4 toward U54_2, U54_3 and U54_4 so the stock Variant C script can drive the secondary PLIC paths end-to-end.

## MMIO and logging

Enable peripheral access logging from the shell:

```text
log peripheral uart0 on
log peripheral timer0 on
mem read 0x20100008 0x4
```

Increase process logging with `-v` or `-vv` on CLI commands.

## Testing

Run the full test suite:

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m pytest
```

## Known limitations

- The RV64 CPU backend is functional, not complete. It targets bring-up-friendly RV64I/M flows and will reject unsupported instructions explicitly.
- There is no cycle model, bus arbitration model or electrical timing model.
- Interrupt delivery now covers per-hart CLINT software/timer sources and PLIC external routing, but it still omits full privilege-level emulation and detailed priority semantics.
- Multi-hart PolarFire execution is implemented for E51 + U54 scheduling, and the repository now includes an HSS/HLS-like boot handoff path via `bootctrl`, but the behavior is still simplified compared to full HSS monitor firmware and silicon-private handoff details.
- Video, CSI, HDMI, SDI, USB 3.x and high-speed networking are placeholder peripherals with MMIO-visible register state only.
- The GDB stub is intentionally minimal and optimized for register/memory inspection plus software breakpoints.

## Roadmap summary

- Replace or complement the functional CPU backend with a native RV64 backend.
- Add multi-hart scheduling and hart-local interrupt/CSR semantics.
- Expand storage, DMA and interrupt modeling.
- Evolve script automation toward regression-oriented firmware test benches.

The detailed architecture and roadmap are in [docs/architecture.md](docs/architecture.md).
