"""Typed board description models."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from polarfire_vp.exceptions import ConfigurationError


def _coerce_int(value: int | str | None, *, field_name: str, default: int | None = None) -> int:
    if value is None:
        if default is None:
            raise ConfigurationError(f"Missing required integer field: {field_name}")
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        try:
            return int(value, 0)
        except ValueError as exc:
            raise ConfigurationError(f"Invalid integer value for {field_name}: {value}") from exc
    raise ConfigurationError(f"Invalid type for {field_name}: {type(value)!r}")


@dataclass(slots=True)
class HartConfig:
    hart_id: int
    name: str
    kind: str
    role: str
    reset_pc: int
    start_mode: str

    @classmethod
    def from_mapping(
        cls,
        mapping: dict[str, Any],
        *,
        default_reset_pc: int,
        boot_hart: int,
    ) -> "HartConfig":
        hart_id = _coerce_int(mapping.get("hart_id"), field_name="cpu.harts[].hart_id")
        return cls(
            hart_id=hart_id,
            name=str(mapping.get("name", f"hart{hart_id}")),
            kind=str(mapping.get("kind", "generic-rv64")),
            role=str(mapping.get("role", "boot" if hart_id == boot_hart else "application")),
            reset_pc=_coerce_int(mapping.get("reset_pc"), field_name=f"cpu.harts[{hart_id}].reset_pc", default=default_reset_pc),
            start_mode=str(mapping.get("start_mode", "running" if hart_id == boot_hart else "halted")),
        )


@dataclass(slots=True)
class CpuConfig:
    name: str
    backend: str
    hart_count: int = 1
    reset_pc: int = 0
    boot_hart: int = 0
    isa: str = "rv64imac"
    harts: list[HartConfig] = field(default_factory=list)

    @classmethod
    def from_mapping(cls, mapping: dict[str, Any]) -> "CpuConfig":
        if "name" not in mapping:
            raise ConfigurationError("CPU config requires a name")
        if "backend" not in mapping:
            raise ConfigurationError("CPU config requires a backend")
        reset_pc = _coerce_int(mapping.get("reset_pc"), field_name="cpu.reset_pc", default=0)
        boot_hart = _coerce_int(mapping.get("boot_hart"), field_name="cpu.boot_hart", default=0)
        hart_count = _coerce_int(mapping.get("hart_count"), field_name="cpu.hart_count", default=1)
        raw_harts = list(mapping.get("harts", []))
        harts = [
            HartConfig.from_mapping(item, default_reset_pc=reset_pc, boot_hart=boot_hart)
            for item in raw_harts
        ]
        if not harts:
            harts = [
                HartConfig(
                    hart_id=index,
                    name=f"hart{index}",
                    kind="generic-rv64",
                    role="boot" if index == boot_hart else "application",
                    reset_pc=reset_pc,
                    start_mode="running" if index == boot_hart else "halted",
                )
                for index in range(hart_count)
            ]
        hart_ids = {hart.hart_id for hart in harts}
        if len(hart_ids) != len(harts):
            raise ConfigurationError("CPU hart IDs must be unique")
        if boot_hart not in hart_ids:
            raise ConfigurationError("cpu.boot_hart must reference a defined hart")
        return cls(
            name=str(mapping["name"]),
            backend=str(mapping["backend"]),
            hart_count=len(harts),
            reset_pc=reset_pc,
            boot_hart=boot_hart,
            isa=str(mapping.get("isa", "rv64imac")),
            harts=sorted(harts, key=lambda item: item.hart_id),
        )


@dataclass(slots=True)
class MemoryRegionConfig:
    name: str
    kind: str
    base: int
    size: int
    permissions: str = "rw"
    file: str | None = None
    fill: int = 0

    @property
    def end(self) -> int:
        return self.base + self.size

    @classmethod
    def from_mapping(cls, mapping: dict[str, Any]) -> "MemoryRegionConfig":
        required = ("name", "kind", "base", "size")
        for key in required:
            if key not in mapping:
                raise ConfigurationError(f"Memory region missing required field: {key}")
        return cls(
            name=str(mapping["name"]),
            kind=str(mapping["kind"]),
            base=_coerce_int(mapping["base"], field_name=f"memory.{mapping['name']}.base"),
            size=_coerce_int(mapping["size"], field_name=f"memory.{mapping['name']}.size"),
            permissions=str(mapping.get("permissions", "rw")),
            file=str(mapping["file"]) if mapping.get("file") else None,
            fill=_coerce_int(mapping.get("fill"), field_name=f"memory.{mapping['name']}.fill", default=0),
        )


@dataclass(slots=True)
class PeripheralConfig:
    name: str
    kind: str
    base: int
    size: int
    irq: int | None = None
    properties: dict[str, Any] = field(default_factory=dict)

    @property
    def end(self) -> int:
        return self.base + self.size

    @classmethod
    def from_mapping(cls, mapping: dict[str, Any]) -> "PeripheralConfig":
        required = ("name", "kind", "base", "size")
        for key in required:
            if key not in mapping:
                raise ConfigurationError(f"Peripheral missing required field: {key}")
        properties = dict(mapping)
        for key in required + ("irq",):
            properties.pop(key, None)
        return cls(
            name=str(mapping["name"]),
            kind=str(mapping["kind"]),
            base=_coerce_int(mapping["base"], field_name=f"peripheral.{mapping['name']}.base"),
            size=_coerce_int(mapping["size"], field_name=f"peripheral.{mapping['name']}.size"),
            irq=_coerce_int(mapping["irq"], field_name=f"peripheral.{mapping['name']}.irq") if mapping.get("irq") is not None else None,
            properties=properties,
        )


@dataclass(slots=True)
class BoardConfig:
    name: str
    vendor: str
    description: str
    cpu: CpuConfig
    memories: list[MemoryRegionConfig]
    peripherals: list[PeripheralConfig]
    source: Path | None = None

    @classmethod
    def from_mapping(cls, mapping: dict[str, Any], *, source: Path | None = None) -> "BoardConfig":
        for key in ("name", "vendor", "description", "cpu", "memory", "peripherals"):
            if key not in mapping:
                raise ConfigurationError(f"Board description missing required field: {key}")

        memories = [MemoryRegionConfig.from_mapping(item) for item in mapping["memory"]]
        peripherals = [PeripheralConfig.from_mapping(item) for item in mapping["peripherals"]]
        _validate_no_overlap(memories, peripherals)

        return cls(
            name=str(mapping["name"]),
            vendor=str(mapping["vendor"]),
            description=str(mapping["description"]),
            cpu=CpuConfig.from_mapping(mapping["cpu"]),
            memories=memories,
            peripherals=peripherals,
            source=source,
        )


def _validate_no_overlap(memories: list[MemoryRegionConfig], peripherals: list[PeripheralConfig]) -> None:
    spans: list[tuple[str, int, int]] = []
    for region in memories:
        spans.append((region.name, region.base, region.end))
    for peripheral in peripherals:
        spans.append((peripheral.name, peripheral.base, peripheral.end))
    spans.sort(key=lambda item: item[1])
    for current, nxt in zip(spans, spans[1:]):
        if nxt[1] < current[2]:
            raise ConfigurationError(
                f"Address space overlap detected between {current[0]} and {nxt[0]}"
            )
