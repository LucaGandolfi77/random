from polarfire_vp.core import LogicalClock, VirtualMachine
from polarfire_vp.cpu import RiscV64FunctionalCpu
from polarfire_vp.memory import MMIORegion, MemoryBus, RAMRegion
from polarfire_vp.peripherals import TimerPeripheral, UARTPeripheral


def encode_lui(rd: int, imm20: int) -> int:
    return (imm20 << 12) | (rd << 7) | 0x37


def encode_addi(rd: int, rs1: int, imm: int) -> int:
    imm &= 0xFFF
    return (imm << 20) | (rs1 << 15) | (rd << 7) | 0x13


def encode_sb(rs1: int, rs2: int, imm: int) -> int:
    imm &= 0xFFF
    return (((imm >> 5) & 0x7F) << 25) | (rs2 << 20) | (rs1 << 15) | (((imm >> 0) & 0x1F) << 7) | 0x23


def encode_sd(rs1: int, rs2: int, imm: int) -> int:
    imm &= 0xFFF
    return (((imm >> 5) & 0x7F) << 25) | (rs2 << 20) | (rs1 << 15) | (0x3 << 12) | (((imm >> 0) & 0x1F) << 7) | 0x23


def encode_ebreak() -> int:
    return 0x0010_0073


def test_cpu_executes_uart_mmio_program() -> None:
    bus = MemoryBus()
    ram = RAMRegion("ram", 0x8000_0000, 0x1000)
    bus.map_region(ram)
    output: list[str] = []
    uart = UARTPeripheral(name="uart0", size=0x1000, sink=output.append)
    bus.map_region(
        MMIORegion(
            "uart0",
            0x2010_0000,
            0x1000,
            read_callback=uart.read,
            write_callback=uart.write,
        )
    )

    program = [
        encode_lui(5, 0x20100),
        encode_addi(6, 0, 65),
        encode_sb(5, 6, 0),
        encode_ebreak(),
    ]
    for index, instruction in enumerate(program):
        ram.load(0x8000_0000 + (index * 4), instruction.to_bytes(4, "little"))

    cpu = RiscV64FunctionalCpu(name="mss", bus=bus, reset_pc=0x8000_0000)
    machine = VirtualMachine(name="test", bus=bus, cpu=cpu, clock=LogicalClock(), peripherals={"uart0": uart})
    machine.reset()

    result = machine.run(max_steps=8)

    assert result.reason == "breakpoint"
    assert "".join(output) == "A"
    assert uart.collected_output() == "A"


def test_timer_advances_with_logical_clock() -> None:
    timer = TimerPeripheral(name="timer0", size=0x1000)
    timer.write(timer.COMPARE, (4).to_bytes(8, "little"))
    timer.write(timer.CONTROL, (timer.CTRL_ENABLE).to_bytes(8, "little"))

    timer.on_tick(1, 1)
    timer.on_tick(1, 2)
    timer.on_tick(2, 4)

    assert timer.counter == 4
    assert timer.status & timer.STATUS_PENDING


def test_cpu_can_store_64_bit_value_to_ram() -> None:
    bus = MemoryBus()
    ram = RAMRegion("ram", 0x8000_0000, 0x1000)
    bus.map_region(ram)

    program = [
        encode_lui(5, 0x80000),
        encode_addi(5, 5, 0x20),
        encode_addi(6, 0, 0x34),
        encode_sd(5, 6, 0),
        encode_ebreak(),
    ]
    for index, instruction in enumerate(program):
        ram.load(0x8000_0000 + (index * 4), instruction.to_bytes(4, "little"))

    cpu = RiscV64FunctionalCpu(name="mss", bus=bus, reset_pc=0x8000_0000)
    machine = VirtualMachine(name="ram-store", bus=bus, cpu=cpu)
    machine.reset()
    result = machine.run(max_steps=8)

    assert result.reason == "breakpoint"
    assert bus.read_u64(0x8000_0020) == 0x34
