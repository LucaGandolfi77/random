"""Minimal GDB Remote Serial Protocol stub for the virtual platform."""

from __future__ import annotations

import socket
import threading
from dataclasses import dataclass

from polarfire_vp.core.machine import VirtualMachine

TARGET_XML = """<?xml version=\"1.0\"?>
<!DOCTYPE target SYSTEM \"gdb-target.dtd\"> 
<target>
  <architecture>riscv:rv64</architecture>
  <feature name=\"org.gnu.gdb.riscv.cpu\">
    <reg name=\"zero\" bitsize=\"64\" regnum=\"0\"/>
    <reg name=\"ra\" bitsize=\"64\"/>
    <reg name=\"sp\" bitsize=\"64\"/>
    <reg name=\"gp\" bitsize=\"64\"/>
    <reg name=\"tp\" bitsize=\"64\"/>
    <reg name=\"t0\" bitsize=\"64\"/>
    <reg name=\"t1\" bitsize=\"64\"/>
    <reg name=\"t2\" bitsize=\"64\"/>
    <reg name=\"s0\" bitsize=\"64\"/>
    <reg name=\"s1\" bitsize=\"64\"/>
    <reg name=\"a0\" bitsize=\"64\"/>
    <reg name=\"a1\" bitsize=\"64\"/>
    <reg name=\"a2\" bitsize=\"64\"/>
    <reg name=\"a3\" bitsize=\"64\"/>
    <reg name=\"a4\" bitsize=\"64\"/>
    <reg name=\"a5\" bitsize=\"64\"/>
    <reg name=\"a6\" bitsize=\"64\"/>
    <reg name=\"a7\" bitsize=\"64\"/>
    <reg name=\"s2\" bitsize=\"64\"/>
    <reg name=\"s3\" bitsize=\"64\"/>
    <reg name=\"s4\" bitsize=\"64\"/>
    <reg name=\"s5\" bitsize=\"64\"/>
    <reg name=\"s6\" bitsize=\"64\"/>
    <reg name=\"s7\" bitsize=\"64\"/>
    <reg name=\"s8\" bitsize=\"64\"/>
    <reg name=\"s9\" bitsize=\"64\"/>
    <reg name=\"s10\" bitsize=\"64\"/>
    <reg name=\"s11\" bitsize=\"64\"/>
    <reg name=\"t3\" bitsize=\"64\"/>
    <reg name=\"t4\" bitsize=\"64\"/>
    <reg name=\"t5\" bitsize=\"64\"/>
    <reg name=\"t6\" bitsize=\"64\"/>
    <reg name=\"pc\" bitsize=\"64\" type=\"code_ptr\"/>
  </feature>
</target>
"""


@dataclass(slots=True)
class GdbServerInfo:
    host: str
    port: int


class GdbRemoteStub:
    def __init__(self, machine: VirtualMachine, *, host: str = "127.0.0.1", port: int = 3333):
        self.machine = machine
        self.host = host
        self.port = port
        self._server_socket: socket.socket | None = None
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._lock = threading.RLock()
        self._no_ack_mode = False
        self._general_thread_id = self._thread_id_for_hart(self.machine.selected_hart_id)
        self._continue_thread_id: int | None = None
        self._last_stop_hart_id = self.machine.selected_hart_id

    def start(self) -> GdbServerInfo:
        if self._thread and self._thread.is_alive():
            return GdbServerInfo(self.host, self.port)
        self._stop.clear()
        self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_socket.bind((self.host, self.port))
        self._server_socket.listen(1)
        self._server_socket.settimeout(0.2)
        self.port = self._server_socket.getsockname()[1]
        self._thread = threading.Thread(target=self._serve, name="pfvp-gdb", daemon=True)
        self._thread.start()
        return GdbServerInfo(self.host, self.port)

    def stop(self) -> None:
        self._stop.set()
        if self._server_socket is not None:
            try:
                self._server_socket.close()
            except OSError:
                pass
            self._server_socket = None
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

    def _serve(self) -> None:
        if self._server_socket is None:
            return
        while not self._stop.is_set():
            try:
                connection, _ = self._server_socket.accept()
            except TimeoutError:
                continue
            except OSError:
                break
            with connection:
                connection.settimeout(0.2)
                self._no_ack_mode = False
                self._handle_client(connection)

    def _handle_client(self, connection: socket.socket) -> None:
        while not self._stop.is_set():
            packet = self._read_packet(connection)
            if packet is None:
                continue
            response = self._dispatch(packet)
            if response is None:
                continue
            self._send_packet(connection, response)

    def _read_packet(self, connection: socket.socket) -> str | None:
        while not self._stop.is_set():
            try:
                lead = connection.recv(1)
            except TimeoutError:
                return None
            if not lead:
                return None
            if lead == b"+":
                continue
            if lead == b"\x03":
                return "?"
            if lead != b"$":
                continue
            payload = bytearray()
            while True:
                chunk = connection.recv(1)
                if chunk == b"#":
                    break
                payload.extend(chunk)
            checksum = connection.recv(2)
            actual = sum(payload) % 256
            expected = int(checksum.decode("ascii"), 16)
            if actual != expected:
                connection.sendall(b"-")
                continue
            if not self._no_ack_mode:
                connection.sendall(b"+")
            return payload.decode("ascii")
        return None

    def _send_packet(self, connection: socket.socket, payload: str) -> None:
        data = payload.encode("ascii")
        checksum = sum(data) % 256
        packet = b"$" + data + b"#" + f"{checksum:02x}".encode("ascii")
        connection.sendall(packet)

    def _dispatch(self, packet: str) -> str | None:
        with self._lock:
            if packet.startswith("qSupported"):
                return "PacketSize=1000;QStartNoAckMode+;qXfer:features:read+"
            if packet == "QStartNoAckMode":
                self._no_ack_mode = True
                return "OK"
            if packet.startswith("qXfer:features:read:target.xml:"):
                return self._serve_xfer(packet)
            if packet == "qAttached":
                return "1"
            if packet == "qC":
                return f"QC{self._general_thread_id:x}"
            if packet == "qfThreadInfo":
                return "m" + ",".join(f"{self._thread_id_for_hart(hart_id):x}" for hart_id in self.machine.hart_ids())
            if packet == "qsThreadInfo":
                return "l"
            if packet.startswith("Hg"):
                return self._set_general_thread(packet[2:])
            if packet.startswith("Hc"):
                return self._set_continue_thread(packet[2:])
            if packet in {"!", "qSymbol::"}:
                return "OK"
            if packet.startswith("qThreadExtraInfo,"):
                return self._thread_extra_info(packet.split(",", 1)[1])
            if packet == "vCont?":
                return "vCont;c;s"
            if packet.startswith("vCont;"):
                action = packet.split(";", 1)[1]
                if action.startswith("c"):
                    return self._run_continue(*self._parse_vcont_action(action))
                if action.startswith("s"):
                    return self._run_step(*self._parse_vcont_action(action))
                return ""
            if packet == "qTStatus":
                return ""
            if packet == "?":
                return self._stop_reply()
            if packet == "g":
                return self._selected_cpu().read_registers_for_gdb().hex()
            if packet.startswith("G"):
                self._selected_cpu().write_registers_from_gdb(bytes.fromhex(packet[1:]))
                return "OK"
            if packet.startswith("p"):
                return self._read_single_register(packet[1:])
            if packet.startswith("P"):
                return self._write_single_register(packet[1:])
            if packet.startswith("m"):
                return self._read_memory(packet[1:])
            if packet.startswith("M"):
                return self._write_memory(packet[1:])
            if packet.startswith("Z0,"):
                address = int(packet.split(",")[1], 16)
                self.machine.add_breakpoint(address)
                return "OK"
            if packet.startswith("z0,"):
                address = int(packet.split(",")[1], 16)
                self.machine.remove_breakpoint(address)
                return "OK"
            if packet.startswith("c"):
                return self._run_continue(packet[1:], self._continue_thread_id)
            if packet.startswith("s"):
                return self._run_step(packet[1:], self._continue_thread_id)
            if packet.startswith("D"):
                return "OK"
            if packet.startswith("qOffsets"):
                return "Text=0;Data=0;Bss=0"
            if packet.startswith("T"):
                return "OK" if self._thread_exists(int(packet[1:], 16)) else "E01"
            return ""

    def _serve_xfer(self, packet: str) -> str:
        _, _, _, _, offset_text, length_text = packet.split(":")
        offset = int(offset_text, 16)
        length = int(length_text, 16)
        chunk = TARGET_XML[offset:offset + length]
        prefix = "l" if offset + length >= len(TARGET_XML) else "m"
        return prefix + chunk

    def _read_single_register(self, index_hex: str) -> str:
        index = int(index_hex, 16)
        registers = self._selected_cpu().read_registers_for_gdb()
        start = index * 8
        end = start + 8
        if end > len(registers):
            return ""
        return registers[start:end].hex()

    def _write_single_register(self, payload: str) -> str:
        index_text, value_text = payload.split("=", 1)
        index = int(index_text, 16)
        value = bytes.fromhex(value_text)
        registers = bytearray(self._selected_cpu().read_registers_for_gdb())
        start = index * 8
        registers[start:start + 8] = value.ljust(8, b"\x00")[:8]
        self._selected_cpu().write_registers_from_gdb(bytes(registers))
        return "OK"

    def _read_memory(self, payload: str) -> str:
        address_text, length_text = payload.split(",", 1)
        address = int(address_text, 16)
        length = int(length_text, 16)
        return self.machine.read_memory(address, length).hex()

    def _write_memory(self, payload: str) -> str:
        header, data_text = payload.split(":", 1)
        address_text, length_text = header.split(",", 1)
        address = int(address_text, 16)
        length = int(length_text, 16)
        data = bytes.fromhex(data_text)
        self.machine.write_memory(address, data[:length])
        return "OK"

    def _run_continue(self, address_text: str, thread_id: int | None) -> str:
        hart_id = self._hart_id_for_run(thread_id)
        cpu = self.machine.hart(hart_id).cpu if hart_id is not None else self._selected_cpu()
        if address_text:
            cpu.set_pc(int(address_text, 16))
        result = self.machine.run(max_steps=100_000, hart_id=hart_id)
        self._last_stop_hart_id = self.machine.selected_hart_id if result.hart_id is None else result.hart_id
        return self._stop_reply()

    def _run_step(self, address_text: str, thread_id: int | None) -> str:
        hart_id = self._hart_id_for_run(thread_id)
        cpu = self.machine.hart(hart_id).cpu if hart_id is not None else self._selected_cpu()
        if address_text:
            cpu.set_pc(int(address_text, 16))
        result = self.machine.step(1, ignore_current_breakpoint=True, hart_id=hart_id)
        self._last_stop_hart_id = self.machine.selected_hart_id if result.hart_id is None else result.hart_id
        return self._stop_reply()

    def _stop_reply(self) -> str:
        thread_id = self._thread_id_for_hart(self._last_stop_hart_id)
        return f"T05thread:{thread_id:x};"

    def _selected_cpu(self):
        hart_id = self._hart_id_from_thread_id(self._general_thread_id)
        self.machine.select_hart(hart_id)
        return self.machine.cpu

    def _thread_id_for_hart(self, hart_id: int) -> int:
        return hart_id + 1

    def _hart_id_from_thread_id(self, thread_id: int) -> int:
        return thread_id - 1

    def _thread_exists(self, thread_id: int) -> bool:
        hart_id = self._hart_id_from_thread_id(thread_id)
        return hart_id in self.machine.hart_ids()

    def _set_general_thread(self, thread_text: str) -> str:
        if thread_text in {"0", "-1"}:
            return "OK"
        thread_id = int(thread_text, 16)
        if not self._thread_exists(thread_id):
            return "E01"
        self._general_thread_id = thread_id
        self.machine.select_hart(self._hart_id_from_thread_id(thread_id))
        return "OK"

    def _set_continue_thread(self, thread_text: str) -> str:
        if thread_text in {"0", "-1"}:
            self._continue_thread_id = None
            return "OK"
        thread_id = int(thread_text, 16)
        if not self._thread_exists(thread_id):
            return "E01"
        self._continue_thread_id = thread_id
        return "OK"

    def _thread_extra_info(self, thread_text: str) -> str:
        thread_id = int(thread_text, 16)
        if not self._thread_exists(thread_id):
            return ""
        hart = self.machine.hart(self._hart_id_from_thread_id(thread_id))
        return f"hart{hart.hart_id}:{hart.name}:{hart.state}".encode("ascii").hex()

    def _parse_vcont_action(self, action: str) -> tuple[str, int | None]:
        if ":" not in action:
            return "", self._continue_thread_id
        _, thread_text = action.split(":", 1)
        if thread_text in {"0", "-1"}:
            return "", None
        return "", int(thread_text, 16)

    def _hart_id_for_run(self, thread_id: int | None) -> int | None:
        if thread_id is None:
            return None
        return self._hart_id_from_thread_id(thread_id)
