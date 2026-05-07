# Variant C Firmware

This firmware variant models a more PolarFire-like boot flow in C.

It keeps the E51-side code intentionally close to the Microchip HAL example you provided:

- `e51()` clears its own software interrupt;
- enables `MIP_MSIP` in `mie`;
- calls `BT_BootMain()`;
- disables the systick source;
- enters a `wfi` loop placed in `.ram_codetext`.

`BT_BootMain()` is implemented for the virtual platform by programming an HSS/HLS-like `bootctrl` mailbox. That model:

- exposes per-hart launch and board-handoff registers at `0x0170_0000 + hart * 0x1000`;
- stores `entryPoint`, `privMode` and `flags` for each U54 hart, plus board-visible `hart_jump_ddr_addr` and `hart_jump_ddr` values;
- relies on CLINT `MSIP` as the actual wake/release mechanism.

The secondary path is split into:

- `parked_hart_entry()` as the common parked-hart entry;
- `u54_1()` for the HAL-like WFI, mailbox polling and `mret` handoff;
- `u54_entry()` for the hart 1 application-side behavior;
- `u54_2()`, `u54_3()` and `u54_4()` for distinct PLIC claim/complete service loops on the remaining U54 harts.

In the current VP implementation the U54 path is closer to the HAL snippet you provided: the hart wakes on `MSIP`, reads the board handoff words, and jumps via `mret` to a hart-specific application entry once the expected boot magic is present.

For demo purposes `u54_entry()` on hart 1 brings its GPIO bit high and then parks in `wfi`, while harts 2, 3 and 4 configure their GPIO bit, arm `MIP_MEIP`, then wait for external interrupts and acknowledge them through the PLIC claim/complete aperture.

The example board now also includes `irqdemo0`, a clock-driven external interrupt source that raises IRQ lines 2, 3 and 4 toward U54_2, U54_3 and U54_4 during the standard demo script. This lets the stock `demo_variant_c.resc` exercise the PLIC service loops end-to-end without requiring extra firmware images or manual MMIO pokes.

## Build

```bash
cd /workspaces/random/polarfire-vp/examples/firmware/variant_c
make
```

Expected output:

- `build/mpfs_variant_c.elf`
- `build/mpfs_variant_c.map`
- `build/mpfs_variant_c.dis` after `make disasm`

## Run

```bash
cd /workspaces/random/polarfire-vp
/workspaces/random/.venv/bin/python -m polarfire_vp.cli shell \
  --platform examples/boards/polarfire_vk.yaml \
  --elf examples/firmware/variant_c/build/mpfs_variant_c.elf
```

Suggested session:

```text
log peripheral bootctrl on
log peripheral irqdemo0 on
log peripheral plic on
log peripheral clint0 on
reset
continue
harts
mem read 0x20400000 16
mem read 0x20120000 4

# optional: watch the distinct secondary paths too
break u54_2
break u54_3
break u54_4
```
