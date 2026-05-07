from polarfire_vp.core import HartContext, HartState, LogicalClock, VirtualMachine
from polarfire_vp.cpu import RiscV64FunctionalCpu
from polarfire_vp.cpu.riscv import (
    CSR_MCAUSE,
    CSR_MIE,
    CSR_MEPC,
    CSR_MSTATUS,
    CSR_MTVEC,
    MIP_MEIP,
    MSTATUS_MIE,
)
from polarfire_vp.memory import MMIORegion, MemoryBus, RAMRegion
from polarfire_vp.peripherals import CoreLocalInterruptController, DemoIrqPeripheral, SimpleInterruptController


def encode_wfi() -> int:
    return 0x1050_0073


def encode_ebreak() -> int:
    return 0x0010_0073


def encode_nop() -> int:
    return 0x0000_0013


def test_clint_wakes_wfi_hart_and_vectors_to_mtvec() -> None:
    bus = MemoryBus()
    ram = RAMRegion("ram", 0x8000_0000, 0x4000)
    bus.map_region(ram)
    clint = CoreLocalInterruptController(name="clint0", size=0x10000)
    bus.map_region(
        MMIORegion(
            "clint0",
            0x0200_0000,
            0x10000,
            read_callback=clint.read,
            write_callback=clint.write,
        )
    )

    ram.load(0x8000_0000, encode_wfi().to_bytes(4, "little"))
    ram.load(0x8000_0004, encode_ebreak().to_bytes(4, "little"))
    ram.load(0x8000_0100, encode_ebreak().to_bytes(4, "little"))

    cpu = RiscV64FunctionalCpu(name="e51", bus=bus, reset_pc=0x8000_0000, hart_id=0)
    machine = VirtualMachine(
        name="interrupt-test",
        bus=bus,
        cpu=cpu,
        clock=LogicalClock(),
        peripherals={"clint0": clint},
    )
    machine.reset()
    cpu.csrs[CSR_MTVEC] = 0x8000_0100
    cpu.csrs[CSR_MSTATUS] |= MSTATUS_MIE
    cpu.csrs[CSR_MIE] |= 1 << 7

    clint.write(clint.MTIMECMP_BASE, (1).to_bytes(8, "little"))

    first = machine.step(1)
    assert first.reason == "wfi"
    assert machine.hart(0).state == HartState.WFI

    result = machine.run(max_steps=4)

    assert result.reason == "breakpoint"
    assert cpu.pc == 0x8000_0100
    assert cpu.csrs[CSR_MEPC] == 0x8000_0004
    assert cpu.csrs[CSR_MCAUSE] == (1 << 63) | 7


def test_plic_targets_external_interrupt_to_specific_hart() -> None:
    bus = MemoryBus()
    bus.map_region(RAMRegion("ram", 0x8000_0000, 0x1000))
    plic = SimpleInterruptController(name="plic", size=0x1000)

    cpu0 = RiscV64FunctionalCpu(name="e51", bus=bus, reset_pc=0x8000_0000, hart_id=0)
    cpu1 = RiscV64FunctionalCpu(name="u54_1", bus=bus, reset_pc=0x8000_0000, hart_id=1)

    machine = VirtualMachine(
        name="plic-test",
        bus=bus,
        harts=[
            HartContext(hart_id=0, name="e51", kind="e51", role="monitor", cpu=cpu0, reset_pc=0x8000_0000),
            HartContext(hart_id=1, name="u54_1", kind="u54", role="application", cpu=cpu1, reset_pc=0x8000_0000),
        ],
        clock=LogicalClock(),
        peripherals={"plic": plic},
        boot_hart_id=0,
    )
    machine.reset()

    plic.raise_irq(3, target_harts={1})

    assert machine.hart(0).cpu.csrs.get(0x344, 0) & MIP_MEIP == 0
    assert machine.hart(1).cpu.csrs.get(0x344, 0) & MIP_MEIP == MIP_MEIP


def test_plic_claim_complete_clears_pending_irq_and_meip() -> None:
    bus = MemoryBus()
    bus.map_region(RAMRegion("ram", 0x8000_0000, 0x1000))
    plic = SimpleInterruptController(name="plic", size=0x1000)

    cpu0 = RiscV64FunctionalCpu(name="e51", bus=bus, reset_pc=0x8000_0000, hart_id=0)
    cpu1 = RiscV64FunctionalCpu(name="u54_1", bus=bus, reset_pc=0x8000_0000, hart_id=1)

    machine = VirtualMachine(
        name="plic-claim-complete-test",
        bus=bus,
        harts=[
            HartContext(hart_id=0, name="e51", kind="e51", role="monitor", cpu=cpu0, reset_pc=0x8000_0000),
            HartContext(hart_id=1, name="u54_1", kind="u54", role="application", cpu=cpu1, reset_pc=0x8000_0000),
        ],
        clock=LogicalClock(),
        peripherals={"plic": plic},
        boot_hart_id=0,
    )
    machine.reset()

    plic.raise_irq(5, target_harts={1})

    claim_offset = plic.CLAIM_BASE + (1 * plic.CONTEXT_STRIDE)
    assert int.from_bytes(plic.read(claim_offset, 4), "little") == 5
    assert int.from_bytes(plic.read(plic.CLAIM_BASE, 4), "little") == 0

    plic.write(claim_offset, (5).to_bytes(4, "little"))

    assert int.from_bytes(plic.read(plic.PENDING, 4), "little") == 0
    assert machine.hart(1).cpu.csrs.get(0x344, 0) & MIP_MEIP == 0


def test_demo_irq_peripheral_fires_scheduled_external_interrupts() -> None:
    bus = MemoryBus()
    ram = RAMRegion("ram", 0x8000_0000, 0x1000)
    bus.map_region(ram)
    for offset in range(0, 0x20, 4):
        ram.load(0x8000_0000 + offset, encode_nop().to_bytes(4, "little"))

    plic = SimpleInterruptController(name="plic", size=0x1000)
    irqdemo = DemoIrqPeripheral(
        name="irqdemo0",
        size=0x1000,
        events=[{"tick": 2, "irq": 4, "target_harts": [2]}],
    )

    cpu0 = RiscV64FunctionalCpu(name="e51", bus=bus, reset_pc=0x8000_0000, hart_id=0)
    cpu2 = RiscV64FunctionalCpu(name="u54_2", bus=bus, reset_pc=0x8000_0000, hart_id=2)

    machine = VirtualMachine(
        name="demo-irq-test",
        bus=bus,
        harts=[
            HartContext(hart_id=0, name="e51", kind="e51", role="monitor", cpu=cpu0, reset_pc=0x8000_0000),
            HartContext(
                hart_id=2,
                name="u54_2",
                kind="u54",
                role="application",
                cpu=cpu2,
                reset_pc=0x8000_0000,
                start_mode="halted",
            ),
        ],
        clock=LogicalClock(),
        peripherals={"plic": plic, "irqdemo0": irqdemo},
        boot_hart_id=0,
    )
    machine.reset()

    result = machine.run(max_steps=3, hart_id=0)

    assert result.reason == "max-steps"
    assert int.from_bytes(irqdemo.read(irqdemo.FIRED_MASK, 4), "little") == 1
    assert int.from_bytes(plic.read(plic.CLAIM_BASE + (2 * plic.CONTEXT_STRIDE), 4), "little") == 4
    assert machine.hart(2).cpu.csrs.get(0x344, 0) & MIP_MEIP == MIP_MEIP
