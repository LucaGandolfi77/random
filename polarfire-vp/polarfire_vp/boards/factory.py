"""Board instantiation helpers."""

from __future__ import annotations

from typing import Any, Callable

from polarfire_vp.boards.model import BoardConfig
from polarfire_vp.core.hart import HartContext
from polarfire_vp.core.machine import VirtualMachine
from polarfire_vp.core.clock import LogicalClock
from polarfire_vp.cpu import RiscV64FunctionalCpu
from polarfire_vp.memory import MMIORegion, MemoryBus, RAMRegion, ROMRegion
from polarfire_vp.peripherals import (
    BlockDevicePeripheral,
    BootControllerPeripheral,
    CoreLocalInterruptController,
    DemoIrqPeripheral,
    GPIOPeripheral,
    SimpleInterruptController,
    StubPeripheral,
    TimerPeripheral,
    UARTPeripheral,
)


def build_virtual_machine(
    config: BoardConfig,
    *,
    uart_sink: Callable[[str], None] | None = None,
) -> VirtualMachine:
    bus = MemoryBus()

    for region in config.memories:
        if region.kind == "ram":
            bus.map_region(RAMRegion(region.name, region.base, region.size, permissions=region.permissions, fill=region.fill))
        elif region.kind == "rom":
            bus.map_region(ROMRegion(region.name, region.base, region.size, fill=region.fill))
        else:
            raise ValueError(f"Unsupported memory region kind: {region.kind}")

    peripherals = {}
    for peripheral_cfg in config.peripherals:
        peripheral = _create_peripheral(peripheral_cfg.kind, peripheral_cfg, uart_sink)
        peripheral.base_address = peripheral_cfg.base
        peripherals[peripheral_cfg.name] = peripheral
        bus.map_region(
            MMIORegion(
                peripheral_cfg.name,
                peripheral_cfg.base,
                peripheral_cfg.size,
                read_callback=peripheral.read,
                write_callback=peripheral.write,
            )
        )

    harts = []
    for hart_cfg in config.cpu.harts:
        cpu = RiscV64FunctionalCpu(
            name=hart_cfg.name,
            bus=bus,
            reset_pc=hart_cfg.reset_pc,
            hart_id=hart_cfg.hart_id,
            hart_kind=hart_cfg.kind,
            role=hart_cfg.role,
            start_mode=hart_cfg.start_mode,
        )
        harts.append(
            HartContext(
                hart_id=hart_cfg.hart_id,
                name=hart_cfg.name,
                kind=hart_cfg.kind,
                role=hart_cfg.role,
                cpu=cpu,
                reset_pc=hart_cfg.reset_pc,
                start_mode=hart_cfg.start_mode,
            )
        )
    machine = VirtualMachine(
        name=config.name,
        bus=bus,
        harts=harts,
        clock=LogicalClock(),
        peripherals=peripherals,
        boot_hart_id=config.cpu.boot_hart,
    )
    machine.set_entry_point(config.cpu.reset_pc)
    return machine


def _create_peripheral(kind: str, config: Any, uart_sink: Callable[[str], None] | None):
    if kind == "uart":
        return UARTPeripheral(name=config.name, size=config.size, irq=config.irq, sink=uart_sink)
    if kind == "timer":
        return TimerPeripheral(name=config.name, size=config.size, irq=config.irq)
    if kind == "gpio":
        return GPIOPeripheral(name=config.name, size=config.size, irq=config.irq)
    if kind == "block-device":
        return BlockDevicePeripheral(
            name=config.name,
            size=config.size,
            irq=config.irq,
            sector_size=int(config.properties.get("sector_size", 512)),
            sectors=int(config.properties.get("sectors", 1024)),
            backing_file=config.properties.get("backing_file"),
        )
    if kind == "boot-controller":
        return BootControllerPeripheral(
            name=config.name,
            size=config.size,
            irq=config.irq,
            clint_name=str(config.properties.get("clint_name", "clint0")),
        )
    if kind == "clint":
        return CoreLocalInterruptController(name=config.name, size=config.size, irq=config.irq)
    if kind == "interrupt-controller":
        return SimpleInterruptController(name=config.name, size=config.size, irq=config.irq)
    if kind == "irq-demo":
        return DemoIrqPeripheral(name=config.name, size=config.size, events=config.properties.get("events", ()))
    if kind == "stub":
        return StubPeripheral(name=config.name, size=config.size, irq=config.irq, label=config.properties.get("label"))
    raise ValueError(f"Unsupported peripheral kind: {kind}")
