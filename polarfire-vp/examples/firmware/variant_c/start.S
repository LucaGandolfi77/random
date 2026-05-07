.section .text.start
.globl _start

.equ STACK_STRIDE, 0x1000

_start:
  csrr a0, mhartid
  la t0, __stack_region_end
  li t1, STACK_STRIDE
  addi t2, a0, 1
  mul t1, t1, t2
  sub sp, t0, t1
  beqz a0, boot_e51
  tail parked_hart_entry

boot_e51:
  tail e51
