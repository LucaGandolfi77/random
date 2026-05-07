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
    *(.text .text.*)
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
  _stack_top = ORIGIN(ddr) + 0x10000;
}
