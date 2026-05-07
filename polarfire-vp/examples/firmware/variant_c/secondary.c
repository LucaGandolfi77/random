#include <stdint.h>

#include "mpfs_hal/mss_hal.h"
#include "common.h"
#include "bsp_board.h"
#include "drivers/mss/mss_gpio/mss_gpio.h"

#define UART0_BASE 0x20100000UL

static void jump_to_application(uint64_t next_addr);
static void plic_service_loop(uint32_t hart_id, uint32_t expected_irq_id);
static uint64_t expected_boot_magic(uint32_t hart_id);

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

static void uart_put_hex_digit(uint32_t value)
{
    value &= 0xFU;
    uart_putc((value < 10U) ? (char)('0' + value) : (char)('A' + (value - 10U)));
}

static void uart_put_hartid(uint32_t hart_id)
{
    uart_put_hex_digit(hart_id);
}

static void uart_put_hex32(uint32_t value)
{
    uint32_t shift;

    for (shift = 28U;; shift -= 4U)
    {
        uart_put_hex_digit((value >> shift) & 0xFU);
        if (shift == 0U)
        {
            break;
        }
    }
}

static uint64_t expected_boot_magic(uint32_t hart_id)
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

void u54_1(void)
{
    uint32_t hart_id = current_hartid();
    uint64_t hart_jump_ddr_addr;
    uint64_t hart_jump_ddr;

    /* Clear pending software interrupt in case there was any.
       Enable only the software interrupt so that the E51 core can bring this
       core out of WFI by raising a software interrupt. */
    clear_soft_interrupt();
    set_csr(mie, MIP_MSIP);

    /* Put this hart into WFI. */
    do
    {
        __asm__ volatile("wfi");
    } while (0U == (read_csr(mip) & MIP_MSIP));

    /* The hart is out of WFI, clear the SW interrupt. Here onwards application
       code can enable and use any interrupts as required. */
    clear_soft_interrupt();

    __enable_irq();

    while (1U)
    {
        hart_jump_ddr_addr = BT_BOARD_get_hart_jump_ddr_addr();
        hart_jump_ddr = BT_BOARD_get_hart_jump_ddr();

        if (hart_jump_ddr == expected_boot_magic(hart_id))
        {
            jump_to_application(hart_jump_ddr_addr);
        }
    }
}

void u54_entry(void)
{
    uint32_t hart_id = current_hartid();
    uint32_t gpio_mask = 1U << (hart_id - 1U);

    MSS_GPIO_config(MSS_GPIO_get_output() | gpio_mask);
    MSS_GPIO_set_output(MSS_GPIO_get_output() | gpio_mask);

    uart_puts("U54 hart online: ");
    uart_put_hartid(hart_id);
    uart_puts("\n");

    while (1U)
    {
        __asm__ volatile("wfi");
    }
}

void u54_2(void)
{
    plic_service_loop(2U, 2U);
}

void u54_3(void)
{
    plic_service_loop(3U, 3U);
}

void u54_4(void)
{
    plic_service_loop(4U, 4U);
}

void parked_hart_entry(void)
{
    u54_1();
}

static void plic_service_loop(uint32_t hart_id, uint32_t expected_irq_id)
{
    uint32_t gpio_mask = 1U << (hart_id - 1U);

    MSS_GPIO_config(MSS_GPIO_get_output() | gpio_mask);
    PLIC_init();
    set_csr(mie, MIP_MEIP);

    uart_puts("U54 PLIC service hart online: ");
    uart_put_hartid(hart_id);
    uart_puts("\n");

    while (1U)
    {
        uint32_t claimed_irq;

        __asm__ volatile("wfi");
        claimed_irq = PLIC_claim();
        if (claimed_irq == 0U)
        {
            continue;
        }

        uart_puts("U54 hart ");
        uart_put_hartid(hart_id);
        uart_puts(" claimed PLIC IRQ 0x");
        uart_put_hex32(claimed_irq);
        uart_puts("\n");

        if (claimed_irq == expected_irq_id)
        {
            MSS_GPIO_set_output(MSS_GPIO_get_output() | gpio_mask);
        }

        PLIC_complete(claimed_irq);
    }
}

static void jump_to_application(uint64_t next_addr)
{
    /* Clear pending software interrupt in case there was any.
       Enable only the software interrupt so that the E51 core can bring this
       core out of WFI by raising a software interrupt. */
    clear_soft_interrupt();
    set_csr(mie, MIP_MSIP);

    /* Restore PLIC to known state: */
    __disable_irq();
    PLIC_init();

    /* Disable all interrupts: */
    write_csr(mie, 0U);

    /* User application execution should now start and never return here.... */
    write_csr(mepc, next_addr);

    /* Unreachable code */
    __asm__ __volatile__("mret");
    __builtin_unreachable();
}
