ENTRY(_start)

MEMORY
{
  ddr (rwx) : ORIGIN = 0x80000000, LENGTH = 64M
}

SECTIONS
{
  . = ORIGIN(ddr);

  .text :
  {
    *(.text.start)
    *(.text .text.*)
    *(.ram_codetext .ram_codetext.*)
    *(.rodata .rodata.*)
  } > ddr

  .data :
  {
    *(.data .data.*)
  } > ddr

  .bss (NOLOAD) :
  {
    *(.bss .bss.*)
    *(COMMON)
  } > ddr

  . = ALIGN(16);
  __stack_region_end = ORIGIN(ddr) + 0x20000;
}
