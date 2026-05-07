#include <stdint.h>

#include "common.h"
#include "mpfs_hal/mss_hal.h"

#define BOOTCTRL_BASE 0x01700000UL
#define BOOTCTRL_HART_STRIDE 0x1000UL
#define BOOTCTRL_BOARD_JUMP_DDR_ADDR 0x100UL
#define BOOTCTRL_BOARD_JUMP_DDR_VALUE 0x108UL

#define PLIC_BASE 0x0C000000UL
#define PLIC_ENABLE_BASE 0x100UL
#define PLIC_CLAIM_BASE 0x200UL
#define PLIC_CONTEXT_STRIDE 0x10UL

#define BOOTCTRL_HART_FIELD(hart, field) (BOOTCTRL_BASE + ((hart) * BOOTCTRL_HART_STRIDE) + (field))

uint64_t BT_BOARD_get_hart_jump_ddr_addr(void)
{
    return mmio_read64(BOOTCTRL_HART_FIELD(current_hartid(), BOOTCTRL_BOARD_JUMP_DDR_ADDR));
}

uint64_t BT_BOARD_get_hart_jump_ddr(void)
{
    return mmio_read64(BOOTCTRL_HART_FIELD(current_hartid(), BOOTCTRL_BOARD_JUMP_DDR_VALUE));
}

void BT_BOARD_set_hart_jump_ddr_addr(uint32_t hart_id, uint64_t next_addr)
{
    mmio_write64(BOOTCTRL_HART_FIELD(hart_id, BOOTCTRL_BOARD_JUMP_DDR_ADDR), next_addr);
}

void BT_BOARD_set_hart_jump_ddr(uint32_t hart_id, uint64_t value)
{
    mmio_write64(BOOTCTRL_HART_FIELD(hart_id, BOOTCTRL_BOARD_JUMP_DDR_VALUE), value);
}

void PLIC_init(void)
{
    mmio_write32(PLIC_BASE + PLIC_ENABLE_BASE + (current_hartid() * PLIC_CONTEXT_STRIDE), 0xFFFFFFFFU);
}

uint32_t PLIC_claim(void)
{
    return mmio_read32(PLIC_BASE + PLIC_CLAIM_BASE + (current_hartid() * PLIC_CONTEXT_STRIDE));
}

void PLIC_complete(uint32_t irq_id)
{
    mmio_write32(PLIC_BASE + PLIC_CLAIM_BASE + (current_hartid() * PLIC_CONTEXT_STRIDE), irq_id);
}
