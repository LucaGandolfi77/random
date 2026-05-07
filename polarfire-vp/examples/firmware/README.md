# Demo firmware

This directory contains a minimal RV64 bare-metal firmware used to exercise the virtual platform.

Available variants:

- `hello_uart.S`: minimal assembly-oriented smoke test.
- `variant_c/`: C-oriented E51 boot flow derived from the Microchip HAL style, using an HSS/HLS-like launch mailbox plus `MSIP` to start U54 harts.

On the default PolarFire VK example board the ELF is loaded once and shared by the E51 and all parked U54 harts. In practice you typically boot on the E51 first and release U54 harts later for SMP or AMP bring-up experiments.

The demo does the following:

1. prints a startup string through the modeled UART;
2. configures one GPIO bit as output and drives it high;
3. arms the logical timer;
4. polls the timer status register;
5. stops on `ebreak` so the simulator or GDB can halt at a deterministic point.

## Build

You need a RISC-V bare-metal toolchain such as `riscv64-unknown-elf-gcc`.

```bash
cd /workspaces/random/polarfire-vp/examples/firmware
make
```

This produces:

- `build/hello_uart.elf`
- `build/hello_uart.map`
- `build/hello_uart.dis` after `make disasm`

## Run with the simulator

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m polarfire_vp.cli run \
  --platform examples/boards/polarfire_vk.yaml \
  --elf examples/firmware/build/hello_uart.elf \
  --break-at main
```

## Debug with GDB

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m polarfire_vp.cli shell \
  --platform examples/boards/polarfire_vk.yaml \
  --elf examples/firmware/build/hello_uart.elf
```

In the shell:

```text
harts
break main
start_gdb_server 3333
reset
continue
```

Then connect:

```bash
riscv64-unknown-elf-gdb /workspaces/random/polarfire-vp/examples/firmware/build/hello_uart.elf \
  -ex "set architecture riscv:rv64" \
  -ex "target remote 127.0.0.1:3333"
```

Use `info threads` inside GDB to inspect the modeled hart set.

## Variant C

The more realistic E51 boot handoff example lives in [variant_c/README.md](variant_c/README.md).

It uses:

- the E51-side `e51()` routine modeled on the Microchip snippet;
- the `bootctrl` MMIO peripheral to populate HSS-style per-hart launch records;
- CLINT `MSIP` to wake the parked secondary bootstrap path.
