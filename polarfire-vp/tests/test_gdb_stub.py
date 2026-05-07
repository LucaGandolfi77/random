import socket

from polarfire_vp.core import HartContext, VirtualMachine
from polarfire_vp.cpu import RiscV64FunctionalCpu
from polarfire_vp.debug import GdbRemoteStub
from polarfire_vp.memory import MemoryBus, RAMRegion


def _send_packet(connection: socket.socket, payload: str) -> str:
    data = payload.encode("ascii")
    checksum = sum(data) % 256
    connection.sendall(b"$" + data + b"#" + f"{checksum:02x}".encode("ascii"))
    assert connection.recv(1) == b"+"
    assert connection.recv(1) == b"$"
    body = bytearray()
    while True:
        chunk = connection.recv(1)
        if chunk == b"#":
            break
        body.extend(chunk)
    connection.recv(2)
    connection.sendall(b"+")
    return body.decode("ascii")


def test_gdb_stub_serves_registers_and_memory() -> None:
    bus = MemoryBus()
    ram = RAMRegion("ram", 0x8000_0000, 0x1000)
    ram.load(0x8000_0000, b"\x73\x00\x10\x00")
    bus.map_region(ram)
    cpu = RiscV64FunctionalCpu(name="mss", bus=bus, reset_pc=0x8000_0000)
    machine = VirtualMachine(name="gdb-test", bus=bus, cpu=cpu)
    machine.reset()

    stub = GdbRemoteStub(machine, port=0)
    info = stub.start()

    try:
        with socket.create_connection((info.host, info.port), timeout=1.0) as connection:
            supported = _send_packet(connection, "qSupported:multiprocess+")
            registers = _send_packet(connection, "g")
            memory = _send_packet(connection, "m80000000,4")

        assert "PacketSize=" in supported
        assert len(registers) == 33 * 8 * 2
        assert memory == "73001000"
    finally:
        stub.stop()


def test_gdb_stub_exposes_multihart_threads_and_switches_register_context() -> None:
    bus = MemoryBus()
    bus.map_region(RAMRegion("ram", 0x8000_0000, 0x1000))
    cpu0 = RiscV64FunctionalCpu(name="e51", bus=bus, reset_pc=0x8000_0000, hart_id=0)
    cpu1 = RiscV64FunctionalCpu(name="u54_1", bus=bus, reset_pc=0x8000_0100, hart_id=1)

    machine = VirtualMachine(
        name="gdb-multihart",
        bus=bus,
        harts=[
            HartContext(hart_id=0, name="e51", kind="e51", role="monitor", cpu=cpu0, reset_pc=0x8000_0000),
            HartContext(hart_id=1, name="u54_1", kind="u54", role="application", cpu=cpu1, reset_pc=0x8000_0100),
        ],
        boot_hart_id=0,
    )
    machine.reset()

    stub = GdbRemoteStub(machine, port=0)
    info = stub.start()

    try:
        with socket.create_connection((info.host, info.port), timeout=1.0) as connection:
            threads = _send_packet(connection, "qfThreadInfo")
            current = _send_packet(connection, "qC")
            switch_result = _send_packet(connection, "Hg2")
            registers = _send_packet(connection, "g")

        pc = int.from_bytes(bytes.fromhex(registers[-16:]), "little")
        assert threads == "m1,2"
        assert current == "QC1"
        assert switch_result == "OK"
        assert pc == 0x8000_0100
    finally:
        stub.stop()

