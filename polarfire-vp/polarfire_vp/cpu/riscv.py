"""Pragmatic RV64 functional CPU backend.

This is intentionally not a full ISA model. The implementation focuses on:
- early boot code
- MMIO-oriented firmware loops
- simple bring-up scenarios

Unsupported instructions raise CpuExecutionError so the boundary is explicit.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from polarfire_vp.cpu.base import CpuBackend
from polarfire_vp.exceptions import CpuExecutionError


REGISTER_NAMES = [
    "zero",
    "ra",
    "sp",
    "gp",
    "tp",
    "t0",
    "t1",
    "t2",
    "s0",
    "s1",
    "a0",
    "a1",
    "a2",
    "a3",
    "a4",
    "a5",
    "a6",
    "a7",
    "s2",
    "s3",
    "s4",
    "s5",
    "s6",
    "s7",
    "s8",
    "s9",
    "s10",
    "s11",
    "t3",
    "t4",
    "t5",
    "t6",
]

CSR_MHARTID = 0xF14
CSR_MSTATUS = 0x300
CSR_MISA = 0x301
CSR_MIE = 0x304
CSR_MTVEC = 0x305
CSR_MSCRATCH = 0x340
CSR_MEPC = 0x341
CSR_MCAUSE = 0x342
CSR_MTVAL = 0x343
CSR_MIP = 0x344

MSTATUS_MIE = 1 << 3
MSTATUS_MPIE = 1 << 7

MIP_MSIP = 1 << 3
MIP_MTIP = 1 << 7
MIP_MEIP = 1 << 11

INTERRUPT_SOFTWARE = 3
INTERRUPT_TIMER = 7
INTERRUPT_EXTERNAL = 11


@dataclass(slots=True)
class SymbolInfo:
    name: str
    address: int
    size: int = 0


def sign_extend(value: int, bits: int) -> int:
    sign_bit = 1 << (bits - 1)
    return (value & (sign_bit - 1)) - (value & sign_bit)


def mask64(value: int) -> int:
    return value & 0xFFFF_FFFF_FFFF_FFFF


def _mulh(lhs: int, rhs: int) -> int:
    lhs_signed = sign_extend(lhs & 0xFFFF_FFFF_FFFF_FFFF, 64)
    rhs_signed = sign_extend(rhs & 0xFFFF_FFFF_FFFF_FFFF, 64)
    product = lhs_signed * rhs_signed
    return (product >> 64) & 0xFFFF_FFFF_FFFF_FFFF


def _mulhsu(lhs: int, rhs: int) -> int:
    lhs_signed = sign_extend(lhs & 0xFFFF_FFFF_FFFF_FFFF, 64)
    rhs_unsigned = rhs & 0xFFFF_FFFF_FFFF_FFFF
    product = lhs_signed * rhs_unsigned
    return (product >> 64) & 0xFFFF_FFFF_FFFF_FFFF


def _mulhu(lhs: int, rhs: int) -> int:
    product = (lhs & 0xFFFF_FFFF_FFFF_FFFF) * (rhs & 0xFFFF_FFFF_FFFF_FFFF)
    return (product >> 64) & 0xFFFF_FFFF_FFFF_FFFF


def _div_signed(lhs: int, rhs: int) -> int:
    lhs_signed = sign_extend(lhs & 0xFFFF_FFFF_FFFF_FFFF, 64)
    rhs_signed = sign_extend(rhs & 0xFFFF_FFFF_FFFF_FFFF, 64)
    if rhs_signed == 0:
        return 0xFFFF_FFFF_FFFF_FFFF
    if lhs_signed == -(1 << 63) and rhs_signed == -1:
        return lhs & 0xFFFF_FFFF_FFFF_FFFF
    return mask64(int(lhs_signed / rhs_signed))


def _div_unsigned(lhs: int, rhs: int) -> int:
    lhs &= 0xFFFF_FFFF_FFFF_FFFF
    rhs &= 0xFFFF_FFFF_FFFF_FFFF
    if rhs == 0:
        return 0xFFFF_FFFF_FFFF_FFFF
    return lhs // rhs


def _rem_signed(lhs: int, rhs: int) -> int:
    lhs_signed = sign_extend(lhs & 0xFFFF_FFFF_FFFF_FFFF, 64)
    rhs_signed = sign_extend(rhs & 0xFFFF_FFFF_FFFF_FFFF, 64)
    if rhs_signed == 0:
        return lhs & 0xFFFF_FFFF_FFFF_FFFF
    if lhs_signed == -(1 << 63) and rhs_signed == -1:
        return 0
    return mask64(lhs_signed % rhs_signed)


def _rem_unsigned(lhs: int, rhs: int) -> int:
    lhs &= 0xFFFF_FFFF_FFFF_FFFF
    rhs &= 0xFFFF_FFFF_FFFF_FFFF
    if rhs == 0:
        return lhs
    return lhs % rhs


class RiscV64FunctionalCpu(CpuBackend):
    def __init__(
        self,
        *,
        name: str,
        bus: Any,
        reset_pc: int = 0,
        hart_id: int = 0,
        hart_kind: str = "generic-rv64",
        role: str = "application",
        start_mode: str = "running",
    ):
        super().__init__(
            name=name,
            bus=bus,
            reset_pc=reset_pc,
            hart_id=hart_id,
            hart_kind=hart_kind,
            role=role,
            start_mode=start_mode,
        )
        self._pc = reset_pc
        self._regs = [0] * 32
        self.csrs = {
            CSR_MHARTID: hart_id,
            CSR_MSTATUS: 0,
            CSR_MISA: (2 << 62) | (1 << 8) | (1 << 12),
            CSR_MIE: 0,
            CSR_MTVEC: 0,
            CSR_MSCRATCH: 0,
            CSR_MEPC: 0,
            CSR_MCAUSE: 0,
            CSR_MTVAL: 0,
            CSR_MIP: 0,
        }

    @property
    def pc(self) -> int:
        return self._pc

    def reset(self, pc: int | None = None) -> None:
        self._regs = [0] * 32
        self._pc = self.reset_pc if pc is None else pc
        for key in list(self.csrs):
            if key == CSR_MHARTID:
                self.csrs[key] = self.hart_id
            elif key == CSR_MISA:
                self.csrs[key] = (2 << 62) | (1 << 8) | (1 << 12)
            else:
                self.csrs[key] = 0

    def registers(self) -> dict[str, int]:
        result = {name: self._regs[index] for index, name in enumerate(REGISTER_NAMES)}
        result["pc"] = self._pc
        return result

    def read_registers_for_gdb(self) -> bytes:
        payload = bytearray()
        for index in range(32):
            payload.extend(self._regs[index].to_bytes(8, "little"))
        payload.extend(self._pc.to_bytes(8, "little"))
        return bytes(payload)

    def write_registers_from_gdb(self, payload: bytes) -> None:
        expected = 33 * 8
        if len(payload) != expected:
            raise CpuExecutionError(f"Unexpected GDB register payload length: {len(payload)}")
        for index in range(32):
            start = index * 8
            self._regs[index] = int.from_bytes(payload[start:start + 8], "little")
        self._regs[0] = 0
        self._pc = int.from_bytes(payload[32 * 8:33 * 8], "little")

    def set_pc(self, pc: int) -> None:
        self._pc = mask64(pc)

    def set_interrupt_pending(self, kind: str, pending: bool) -> None:
        bit = self._interrupt_bit(kind)
        if pending:
            self.csrs[CSR_MIP] = self.csrs.get(CSR_MIP, 0) | bit
        else:
            self.csrs[CSR_MIP] = self.csrs.get(CSR_MIP, 0) & ~bit

    def has_enabled_interrupt(self, *, require_global_enable: bool = True) -> bool:
        enabled_mask = self.csrs.get(CSR_MIP, 0) & self.csrs.get(CSR_MIE, 0) & (MIP_MSIP | MIP_MTIP | MIP_MEIP)
        if enabled_mask == 0:
            return False
        if not require_global_enable:
            return True
        return bool(self.csrs.get(CSR_MSTATUS, 0) & MSTATUS_MIE)

    def step(self) -> str:
        if self.has_enabled_interrupt():
            self._take_interrupt()
            self._regs[0] = 0
            return "running"

        instruction = self.bus.read_u32(self._pc)
        current_pc = self._pc
        opcode = instruction & 0x7F
        next_pc = current_pc + 4

        try:
            if opcode == 0x37:
                rd = (instruction >> 7) & 0x1F
                imm = instruction & 0xFFFFF000
                self._write_reg(rd, imm)
            elif opcode == 0x17:
                rd = (instruction >> 7) & 0x1F
                imm = instruction & 0xFFFFF000
                self._write_reg(rd, current_pc + imm)
            elif opcode == 0x6F:
                rd = (instruction >> 7) & 0x1F
                imm = self._imm_j(instruction)
                self._write_reg(rd, next_pc)
                next_pc = mask64(current_pc + imm)
            elif opcode == 0x67:
                rd = (instruction >> 7) & 0x1F
                funct3 = (instruction >> 12) & 0x7
                rs1 = (instruction >> 15) & 0x1F
                if funct3 != 0:
                    raise CpuExecutionError(f"Unsupported JALR funct3={funct3}")
                imm = sign_extend((instruction >> 20) & 0xFFF, 12)
                target = (self._regs[rs1] + imm) & ~1
                self._write_reg(rd, next_pc)
                next_pc = mask64(target)
            elif opcode == 0x63:
                next_pc = self._execute_branch(instruction, current_pc, next_pc)
            elif opcode == 0x03:
                self._execute_load(instruction)
            elif opcode == 0x23:
                self._execute_store(instruction)
            elif opcode == 0x13:
                self._execute_op_imm(instruction)
            elif opcode == 0x33:
                self._execute_op(instruction)
            elif opcode == 0x0F:
                pass
            elif opcode == 0x73:
                reason = self._execute_system(instruction, current_pc, next_pc)
                self._pc = next_pc if reason in {"running", "wfi"} else self._pc
                self._regs[0] = 0
                return reason
            else:
                raise CpuExecutionError(
                    f"Unsupported opcode 0x{opcode:02x} at pc=0x{current_pc:016x}"
                )
        except Exception as exc:  # pragma: no cover - defensive propagation with context
            if isinstance(exc, CpuExecutionError):
                raise
            raise CpuExecutionError(
                f"Execution failed at pc=0x{current_pc:016x}: {exc}"
            ) from exc

        self._pc = mask64(next_pc)
        self._regs[0] = 0
        return "running"

    def _execute_branch(self, instruction: int, current_pc: int, next_pc: int) -> int:
        rs1 = (instruction >> 15) & 0x1F
        rs2 = (instruction >> 20) & 0x1F
        funct3 = (instruction >> 12) & 0x7
        imm = self._imm_b(instruction)
        lhs = self._regs[rs1]
        rhs = self._regs[rs2]
        take = False
        if funct3 == 0x0:
            take = lhs == rhs
        elif funct3 == 0x1:
            take = lhs != rhs
        elif funct3 == 0x4:
            take = sign_extend(lhs, 64) < sign_extend(rhs, 64)
        elif funct3 == 0x5:
            take = sign_extend(lhs, 64) >= sign_extend(rhs, 64)
        elif funct3 == 0x6:
            take = lhs < rhs
        elif funct3 == 0x7:
            take = lhs >= rhs
        else:
            raise CpuExecutionError(f"Unsupported branch funct3={funct3}")
        return mask64(current_pc + imm if take else next_pc)

    def _execute_load(self, instruction: int) -> None:
        rd = (instruction >> 7) & 0x1F
        funct3 = (instruction >> 12) & 0x7
        rs1 = (instruction >> 15) & 0x1F
        imm = sign_extend((instruction >> 20) & 0xFFF, 12)
        address = mask64(self._regs[rs1] + imm)
        if funct3 == 0x0:
            value = sign_extend(self.bus.read_u8(address), 8)
        elif funct3 == 0x1:
            value = sign_extend(self.bus.read_u16(address), 16)
        elif funct3 == 0x2:
            value = sign_extend(self.bus.read_u32(address), 32)
        elif funct3 == 0x3:
            value = self.bus.read_u64(address)
        elif funct3 == 0x4:
            value = self.bus.read_u8(address)
        elif funct3 == 0x5:
            value = self.bus.read_u16(address)
        elif funct3 == 0x6:
            value = self.bus.read_u32(address)
        else:
            raise CpuExecutionError(f"Unsupported load funct3={funct3}")
        self._write_reg(rd, value)

    def _execute_store(self, instruction: int) -> None:
        funct3 = (instruction >> 12) & 0x7
        rs1 = (instruction >> 15) & 0x1F
        rs2 = (instruction >> 20) & 0x1F
        imm = self._imm_s(instruction)
        address = mask64(self._regs[rs1] + imm)
        value = self._regs[rs2]
        if funct3 == 0x0:
            self.bus.write_u8(address, value & 0xFF)
        elif funct3 == 0x1:
            self.bus.write_u16(address, value & 0xFFFF)
        elif funct3 == 0x2:
            self.bus.write_u32(address, value & 0xFFFF_FFFF)
        elif funct3 == 0x3:
            self.bus.write_u64(address, value)
        else:
            raise CpuExecutionError(f"Unsupported store funct3={funct3}")

    def _execute_op_imm(self, instruction: int) -> None:
        rd = (instruction >> 7) & 0x1F
        funct3 = (instruction >> 12) & 0x7
        rs1 = (instruction >> 15) & 0x1F
        imm = sign_extend((instruction >> 20) & 0xFFF, 12)
        lhs = self._regs[rs1]
        if funct3 == 0x0:
            value = lhs + imm
        elif funct3 == 0x2:
            value = 1 if sign_extend(lhs, 64) < imm else 0
        elif funct3 == 0x3:
            value = 1 if lhs < (imm & 0xFFFF_FFFF_FFFF_FFFF) else 0
        elif funct3 == 0x4:
            value = lhs ^ imm
        elif funct3 == 0x6:
            value = lhs | imm
        elif funct3 == 0x7:
            value = lhs & imm
        elif funct3 == 0x1:
            shamt = (instruction >> 20) & 0x3F
            value = lhs << shamt
        elif funct3 == 0x5:
            shamt = (instruction >> 20) & 0x3F
            mode = (instruction >> 30) & 0x1
            value = sign_extend(lhs, 64) >> shamt if mode else lhs >> shamt
        else:
            raise CpuExecutionError(f"Unsupported OP-IMM funct3={funct3}")
        self._write_reg(rd, value)

    def _execute_op(self, instruction: int) -> None:
        rd = (instruction >> 7) & 0x1F
        funct3 = (instruction >> 12) & 0x7
        rs1 = (instruction >> 15) & 0x1F
        rs2 = (instruction >> 20) & 0x1F
        funct7 = (instruction >> 25) & 0x7F
        lhs = self._regs[rs1]
        rhs = self._regs[rs2]

        if funct7 == 0x00:
            value = self._execute_basic_alu(funct3, lhs, rhs)
        elif funct7 == 0x20:
            if funct3 == 0x0:
                value = lhs - rhs
            elif funct3 == 0x5:
                value = sign_extend(lhs, 64) >> (rhs & 0x3F)
            else:
                raise CpuExecutionError(f"Unsupported OP funct7=0x20 funct3={funct3}")
        elif funct7 == 0x01:
            value = self._execute_m_extension(funct3, lhs, rhs)
        else:
            raise CpuExecutionError(f"Unsupported OP funct7=0x{funct7:02x}")
        self._write_reg(rd, value)

    def _execute_basic_alu(self, funct3: int, lhs: int, rhs: int) -> int:
        if funct3 == 0x0:
            return lhs + rhs
        if funct3 == 0x1:
            return lhs << (rhs & 0x3F)
        if funct3 == 0x2:
            return 1 if sign_extend(lhs, 64) < sign_extend(rhs, 64) else 0
        if funct3 == 0x3:
            return 1 if lhs < rhs else 0
        if funct3 == 0x4:
            return lhs ^ rhs
        if funct3 == 0x5:
            return lhs >> (rhs & 0x3F)
        if funct3 == 0x6:
            return lhs | rhs
        if funct3 == 0x7:
            return lhs & rhs
        raise CpuExecutionError(f"Unsupported OP funct3={funct3}")

    def _execute_m_extension(self, funct3: int, lhs: int, rhs: int) -> int:
        if funct3 == 0x0:
            return mask64(lhs * rhs)
        if funct3 == 0x1:
            return _mulh(lhs, rhs)
        if funct3 == 0x2:
            return _mulhsu(lhs, rhs)
        if funct3 == 0x3:
            return _mulhu(lhs, rhs)
        if funct3 == 0x4:
            return _div_signed(lhs, rhs)
        if funct3 == 0x5:
            return _div_unsigned(lhs, rhs)
        if funct3 == 0x6:
            return _rem_signed(lhs, rhs)
        if funct3 == 0x7:
            return _rem_unsigned(lhs, rhs)
        raise CpuExecutionError(f"Unsupported M-extension funct3={funct3}")

    def _execute_system(self, instruction: int, current_pc: int, next_pc: int) -> str:
        funct3 = (instruction >> 12) & 0x7
        rd = (instruction >> 7) & 0x1F
        rs1 = (instruction >> 15) & 0x1F
        csr = (instruction >> 20) & 0xFFF
        if funct3 == 0x0:
            immediate = instruction >> 20
            if immediate == 0x000:
                self.csrs[CSR_MEPC] = next_pc
                self.csrs[CSR_MCAUSE] = 11
                self._pc = current_pc
                return "ecall"
            if immediate == 0x001:
                self._pc = current_pc
                return "breakpoint"
            if immediate == 0x105:
                return "wfi"
            if immediate == 0x302:
                self._return_from_trap(next_pc)
                return "running"
            raise CpuExecutionError(f"Unsupported SYSTEM immediate=0x{immediate:03x}")

        csr_value = self.csrs.get(csr, 0)
        write_value = self._regs[rs1]
        zimm = rs1
        if funct3 == 0x1:
            self.csrs[csr] = write_value
        elif funct3 == 0x2:
            if rs1 != 0:
                self.csrs[csr] = csr_value | write_value
        elif funct3 == 0x3:
            if rs1 != 0:
                self.csrs[csr] = csr_value & (~write_value & 0xFFFF_FFFF_FFFF_FFFF)
        elif funct3 == 0x5:
            self.csrs[csr] = zimm
        elif funct3 == 0x6:
            if zimm != 0:
                self.csrs[csr] = csr_value | zimm
        elif funct3 == 0x7:
            if zimm != 0:
                self.csrs[csr] = csr_value & (~zimm & 0xFFFF_FFFF_FFFF_FFFF)
        else:
            raise CpuExecutionError(f"Unsupported SYSTEM funct3={funct3}")
        self._write_reg(rd, csr_value)
        return "running"

    def _interrupt_bit(self, kind: str) -> int:
        if kind == "software":
            return MIP_MSIP
        if kind == "timer":
            return MIP_MTIP
        if kind == "external":
            return MIP_MEIP
        raise CpuExecutionError(f"Unsupported interrupt kind: {kind}")

    def _take_interrupt(self) -> None:
        cause, _ = self._next_interrupt()
        mstatus = self.csrs.get(CSR_MSTATUS, 0)
        mie_enabled = 1 if (mstatus & MSTATUS_MIE) else 0
        mstatus &= ~MSTATUS_MIE
        if mie_enabled:
            mstatus |= MSTATUS_MPIE
        else:
            mstatus &= ~MSTATUS_MPIE
        self.csrs[CSR_MSTATUS] = mstatus
        self.csrs[CSR_MEPC] = self._pc
        self.csrs[CSR_MCAUSE] = (1 << 63) | cause
        self._pc = self.csrs.get(CSR_MTVEC, self._pc)

    def _return_from_trap(self, next_pc: int) -> None:
        mstatus = self.csrs.get(CSR_MSTATUS, 0)
        if mstatus & MSTATUS_MPIE:
            mstatus |= MSTATUS_MIE
        else:
            mstatus &= ~MSTATUS_MIE
        mstatus |= MSTATUS_MPIE
        self.csrs[CSR_MSTATUS] = mstatus
        self._pc = self.csrs.get(CSR_MEPC, next_pc)

    def _next_interrupt(self) -> tuple[int, int]:
        pending = self.csrs.get(CSR_MIP, 0) & self.csrs.get(CSR_MIE, 0)
        for bit, cause in (
            (MIP_MEIP, INTERRUPT_EXTERNAL),
            (MIP_MSIP, INTERRUPT_SOFTWARE),
            (MIP_MTIP, INTERRUPT_TIMER),
        ):
            if pending & bit:
                return cause, bit
        raise CpuExecutionError("Interrupt requested without a pending enabled source")

    def _write_reg(self, index: int, value: int) -> None:
        if index == 0:
            return
        self._regs[index] = mask64(value)

    def _imm_s(self, instruction: int) -> int:
        imm = ((instruction >> 25) << 5) | ((instruction >> 7) & 0x1F)
        return sign_extend(imm, 12)

    def _imm_b(self, instruction: int) -> int:
        imm = (
            ((instruction >> 31) << 12)
            | (((instruction >> 7) & 0x1) << 11)
            | (((instruction >> 25) & 0x3F) << 5)
            | (((instruction >> 8) & 0xF) << 1)
        )
        return sign_extend(imm, 13)

    def _imm_j(self, instruction: int) -> int:
        imm = (
            ((instruction >> 31) << 20)
            | (((instruction >> 12) & 0xFF) << 12)
            | (((instruction >> 20) & 0x1) << 11)
            | (((instruction >> 21) & 0x3FF) << 1)
        )
        return sign_extend(imm, 21)
