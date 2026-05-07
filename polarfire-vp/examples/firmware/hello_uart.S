.section .text
.globl _start
.globl main

.equ UART0_BASE,  0x20100000
.equ TIMER0_BASE, 0x20110000
.equ GPIO0_BASE,  0x20120000

_start:
  la sp, _stack_top
  jal ra, main

hang:
  jal zero, hang

main:
  li t0, UART0_BASE
  la t1, message

print_loop:
  lbu t2, 0(t1)
  beq t2, zero, configure_devices
  sb t2, 0(t0)
  addi t1, t1, 1
  jal zero, print_loop

configure_devices:
  li t0, GPIO0_BASE
  li t1, 1
  sw t1, 4(t0)
  sw t1, 0(t0)

  li t0, TIMER0_BASE
  li t1, 32
  sd t1, 8(t0)
  li t1, 1
  sd t1, 16(t0)

wait_timer:
  ld t2, 20(t0)
  beq t2, zero, wait_timer
  ebreak

.section .rodata
message:
  .asciz "PolarFire VP booting...\n"
