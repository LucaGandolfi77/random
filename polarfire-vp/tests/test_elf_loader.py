import struct
from pathlib import Path

from polarfire_vp.elf import ElfLoader
from polarfire_vp.memory import MemoryBus, RAMRegion


def _align(value: int, alignment: int) -> int:
    return (value + (alignment - 1)) & ~(alignment - 1)


def build_minimal_riscv64_elf(path: Path) -> None:
    text = b"\x73\x00\x10\x00"
    shstr = b"\x00.text\x00.shstrtab\x00.strtab\x00.symtab\x00"
    strtab = b"\x00main\x00"

    ehsize = 64
    phentsize = 56
    shentsize = 64
    phoff = ehsize
    text_off = _align(ehsize + phentsize, 0x10)
    shstr_off = _align(text_off + len(text), 0x08)
    strtab_off = _align(shstr_off + len(shstr), 0x08)
    symtab_off = _align(strtab_off + len(strtab), 0x08)
    shoff = _align(symtab_off + (24 * 2), 0x08)

    name_text = shstr.index(b".text")
    name_shstr = shstr.index(b".shstrtab")
    name_strtab = shstr.index(b".strtab")
    name_symtab = shstr.index(b".symtab")

    ident = bytearray(16)
    ident[0:4] = b"\x7fELF"
    ident[4] = 2
    ident[5] = 1
    ident[6] = 1

    elf_header = struct.pack(
        "<16sHHIQQQIHHHHHH",
        bytes(ident),
        2,
        243,
        1,
        0x8000_0000,
        phoff,
        shoff,
        0,
        ehsize,
        phentsize,
        1,
        shentsize,
        5,
        2,
    )
    program_header = struct.pack(
        "<IIQQQQQQ",
        1,
        5,
        text_off,
        0x8000_0000,
        0x8000_0000,
        len(text),
        len(text) + 0x20,
        0x1000,
    )

    null_sh = b"\x00" * shentsize
    text_sh = struct.pack("<IIQQQQIIQQ", name_text, 1, 0x6, 0x8000_0000, text_off, len(text), 0, 0, 4, 0)
    shstr_sh = struct.pack("<IIQQQQIIQQ", name_shstr, 3, 0, 0, shstr_off, len(shstr), 0, 0, 1, 0)
    strtab_sh = struct.pack("<IIQQQQIIQQ", name_strtab, 3, 0, 0, strtab_off, len(strtab), 0, 0, 1, 0)
    symtab_sh = struct.pack("<IIQQQQIIQQ", name_symtab, 2, 0, 0, symtab_off, 24 * 2, 3, 1, 8, 24)

    null_sym = b"\x00" * 24
    main_sym = struct.pack("<IBBHQQ", 1, 0x12, 0, 1, 0x8000_0000, len(text))

    content = bytearray()
    content.extend(elf_header)
    content.extend(program_header)
    content.extend(b"\x00" * (text_off - len(content)))
    content.extend(text)
    content.extend(b"\x00" * (shstr_off - len(content)))
    content.extend(shstr)
    content.extend(b"\x00" * (strtab_off - len(content)))
    content.extend(strtab)
    content.extend(b"\x00" * (symtab_off - len(content)))
    content.extend(null_sym)
    content.extend(main_sym)
    content.extend(b"\x00" * (shoff - len(content)))
    content.extend(null_sh)
    content.extend(text_sh)
    content.extend(shstr_sh)
    content.extend(strtab_sh)
    content.extend(symtab_sh)
    path.write_bytes(bytes(content))


def test_elf_loader_populates_memory_and_symbols(tmp_path: Path) -> None:
    elf_path = tmp_path / "demo.elf"
    build_minimal_riscv64_elf(elf_path)

    bus = MemoryBus()
    bus.map_region(RAMRegion("ddr", 0x8000_0000, 0x1000))

    image = ElfLoader(bus=bus).load(elf_path)

    assert image.entry_point == 0x8000_0000
    assert image.segments_loaded == 1
    assert bus.read_u32(0x8000_0000) == 0x0010_0073
    assert bus.read_u32(0x8000_0008) == 0
    assert image.symbols.address_of("main") == 0x8000_0000
    assert image.symbols.lookup(0x8000_0000).name == "main"
