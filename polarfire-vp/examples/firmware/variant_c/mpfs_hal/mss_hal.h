#ifndef PFVP_VARIANT_C_MSS_HAL_H
#define PFVP_VARIANT_C_MSS_HAL_H

#include "../common.h"

#define CLINT0_BASE 0x02000000UL
#define CLINT_MSIP_OFFSET(hart) ((hart) * 4UL)

#define MSTATUS_MIE (1UL << 3)

static inline uint32_t current_hartid(void)
{
    return (uint32_t)read_csr(mhartid);
}

static inline void clear_soft_interrupt(void)
{
    mmio_write32(CLINT0_BASE + CLINT_MSIP_OFFSET(current_hartid()), 0U);
}

static inline void set_soft_interrupt(uint32_t hart_id)
{
    mmio_write32(CLINT0_BASE + CLINT_MSIP_OFFSET(hart_id), 1U);
}

static inline void disable_systick(void)
{
    clear_csr(mie, MIP_MTIP);
}

static inline void __enable_irq(void)
{
    set_csr(mstatus, MSTATUS_MIE);
}

static inline void __disable_irq(void)
{
    clear_csr(mstatus, MSTATUS_MIE);
}

#endif
