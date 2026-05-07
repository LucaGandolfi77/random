"""ELF loader for firmware images."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from elftools.elf.elffile import ELFFile


@dataclass(slots=True)
class Symbol:
    name: str
    address: int
    size: int
    kind: str


class SymbolTable:
    def __init__(self, symbols: list[Symbol]):
        self._symbols = sorted(symbols, key=lambda item: item.address)
        self._by_name = {symbol.name: symbol for symbol in self._symbols}

    @property
    def symbols(self) -> tuple[Symbol, ...]:
        return tuple(self._symbols)

    def address_of(self, name: str) -> int | None:
        symbol = self._by_name.get(name)
        return None if symbol is None else symbol.address

    def lookup(self, address: int) -> Symbol | None:
        previous: Symbol | None = None
        for symbol in self._symbols:
            if symbol.address > address:
                break
            previous = symbol
        if previous is None:
            return None
        if previous.size and address >= previous.address + previous.size:
            return None
        return previous


@dataclass(slots=True)
class LoadedElfImage:
    path: Path
    entry_point: int
    segments_loaded: int
    bytes_loaded: int
    symbols: SymbolTable


class ElfLoader:
    def __init__(self, *, bus: Any):
        self.bus = bus

    def load(self, path: str | Path) -> LoadedElfImage:
        elf_path = Path(path)
        with elf_path.open("rb") as handle:
            elf = ELFFile(handle)
            bytes_loaded = 0
            segments_loaded = 0
            for segment in elf.iter_segments():
                if segment["p_type"] != "PT_LOAD":
                    continue
                address = int(segment["p_vaddr"])
                data = segment.data()
                if data:
                    self.bus.load_blob(address, data)
                    bytes_loaded += len(data)
                mem_size = int(segment["p_memsz"])
                file_size = int(segment["p_filesz"])
                if mem_size > file_size:
                    self.bus.load_blob(address + file_size, b"\x00" * (mem_size - file_size))
                    bytes_loaded += mem_size - file_size
                segments_loaded += 1

            symbols = self._read_symbols(elf)

        return LoadedElfImage(
            path=elf_path,
            entry_point=int(elf.header["e_entry"]),
            segments_loaded=segments_loaded,
            bytes_loaded=bytes_loaded,
            symbols=SymbolTable(symbols),
        )

    def _read_symbols(self, elf: ELFFile) -> list[Symbol]:
        section = elf.get_section_by_name(".symtab")
        if section is None:
            return []
        symbols: list[Symbol] = []
        for symbol in section.iter_symbols():
            name = symbol.name
            if not name:
                continue
            shndx = symbol["st_shndx"]
            if shndx == "SHN_UNDEF":
                continue
            info = symbol["st_info"]
            symbols.append(
                Symbol(
                    name=name,
                    address=int(symbol["st_value"]),
                    size=int(symbol["st_size"]),
                    kind=str(info["type"]),
                )
            )
        return symbols
