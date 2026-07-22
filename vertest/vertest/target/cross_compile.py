from __future__ import annotations

import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class TargetConfig:
    """Configuration for a target platform (architecture, compiler, etc.)."""
    name: str
    architecture: str
    compiler: str
    linker_flags: list[str] = field(default_factory=lambda: ["-nostdlib", "-ffreestanding", "-T", "linker.ld"])
    cflags: list[str] = field(default_factory=lambda: ["-g", "-O0", "-mthumb", "-fno-common"])
    renode_platform: str = ""
    mplabx_device: str = ""
    mplabx_pack: str = ""
    mplabx_compiler: str = ""


BARE_METAL_CFLAGS = ["-g", "-O0", "-mthumb", "-fno-common", "-ffreestanding"]
BARE_METAL_LDFLAGS = ["-nostdlib", "-nostartfiles", "-ffreestanding", "-lgcc"]

TARGETS: dict[str, TargetConfig] = {
    "cortex-m3": TargetConfig(
        name="ARM Cortex-M3",
        architecture="armv7-m",
        compiler="arm-none-eabi-gcc",
        cflags=BARE_METAL_CFLAGS + ["-mcpu=cortex-m3"],
        linker_flags=BARE_METAL_LDFLAGS + ["-mcpu=cortex-m3", "-mthumb"],
        renode_platform="cortex-m3",
        mplabx_device="ATSAM3X8E",
        mplabx_pack="SAM3X_DFP",
        mplabx_compiler="XC32",
    ),
    "cortex-m4": TargetConfig(
        name="ARM Cortex-M4",
        architecture="armv7e-m",
        compiler="arm-none-eabi-gcc",
        cflags=BARE_METAL_CFLAGS + ["-mcpu=cortex-m4", "-mfpu=fpv4-sp-d16", "-mfloat-abi=softfp"],
        linker_flags=BARE_METAL_LDFLAGS + ["-mcpu=cortex-m4", "-mthumb"],
        renode_platform="cortex-m4",
        mplabx_device="ATSAME54P20A",
        mplabx_pack="SAME54_DFP",
        mplabx_compiler="XC32",
    ),
    "cortex-m0": TargetConfig(
        name="ARM Cortex-M0+",
        architecture="armv6-m",
        compiler="arm-none-eabi-gcc",
        cflags=BARE_METAL_CFLAGS + ["-mcpu=cortex-m0plus"],
        linker_flags=BARE_METAL_LDFLAGS + ["-mcpu=cortex-m0plus", "-mthumb"],
        renode_platform="cortex-m0",
        mplabx_device="ATSAMD21G18A",
        mplabx_pack="SAMD21_DFP",
        mplabx_compiler="XC32",
    ),
    "riscv32": TargetConfig(
        name="RISC-V 32-bit",
        architecture="rv32imc",
        compiler="riscv32-unknown-elf-gcc",
        cflags=["-g", "-O0", "-march=rv32imc", "-mabi=ilp32", "-fno-common"],
        linker_flags=["-nostdlib", "-ffreestanding"],
        renode_platform="riscv32",
    ),
    "pic32mx": TargetConfig(
        name="Microchip PIC32MX",
        architecture="mips32r2",
        compiler="xc32-gcc",
        cflags=["-g", "-O0", "-mips32r2", "-fno-common"],
        linker_flags=["-nostdlib"],
        mplabx_device="PIC32MX795F512L",
        mplabx_pack="PIC32MX_DFP",
        mplabx_compiler="XC32",
    ),
    "pic24": TargetConfig(
        name="Microchip PIC24",
        architecture="pic24",
        compiler="xc16-gcc",
        cflags=["-g", "-O0"],
        linker_flags=[],
        mplabx_device="PIC24FJ128GA306",
        mplabx_pack="PIC24F_DFP",
        mplabx_compiler="XC16",
    ),
    "pic16": TargetConfig(
        name="Microchip PIC16",
        architecture="pic16",
        compiler="xc8-cc",
        cflags=["-g", "-O0"],
        linker_flags=[],
        mplabx_device="PIC16F18877",
        mplabx_pack="PIC16F1_xxxx_DFP",
        mplabx_compiler="XC8",
    ),
}


def detect_cross_compiler(target: str = "cortex-m3") -> Optional[TargetConfig]:
    config = TARGETS.get(target)
    if not config:
        return None
    if shutil.which(config.compiler):
        return config
    return None


def list_available_targets() -> list[str]:
    available = []
    for name, cfg in TARGETS.items():
        if shutil.which(cfg.compiler):
            available.append(name)
    return available


def list_all_targets() -> list[str]:
    return list(TARGETS.keys())
