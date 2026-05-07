#include <stdint.h>
#include "common.h"
#include "boot.h"
#include "bsp_board.h"
#include "mpfs_hal/mss_hal.h"

#define UART0_BASE 0x20100000UL

static void uart_putc(char value)
{
    mmio_write8(UART0_BASE, (uint8_t)value);
}

static void uart_puts(const char *text)
{
    while (*text != '\0')
    {
        uart_putc(*text);
        ++text;
    }
}

static uint64_t boot_magic_for_hart(uint32_t hart_id)
{
    switch (hart_id)
    {
        case 1U: return 1U;
        case 2U: return 12U;
        case 3U: return 123U;
        case 4U: return 1234U;
        default: return 0U;
    }
}

static uintptr_t boot_entry_for_hart(uint32_t hart_id)
{
    switch (hart_id)
    {
        case 1U: return (uintptr_t)&u54_entry;
        case 2U: return (uintptr_t)&u54_2;
        case 3U: return (uintptr_t)&u54_3;
        case 4U: return (uintptr_t)&u54_4;
        default: return (uintptr_t)&u54_entry;
    }
}

void BT_BootMain(void)
{
    uint32_t hart_id;

    uart_puts("E51: BT_BootMain arming U54 board handoff\n");
    for (hart_id = 1U; hart_id <= 4U; ++hart_id)
    {
        BT_BOARD_set_hart_jump_ddr_addr(hart_id, (uint64_t)boot_entry_for_hart(hart_id));
        BT_BOARD_set_hart_jump_ddr(hart_id, boot_magic_for_hart(hart_id));
        set_soft_interrupt(hart_id);
    }
}
