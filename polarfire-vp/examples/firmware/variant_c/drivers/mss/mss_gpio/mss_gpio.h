#ifndef PFVP_VARIANT_C_MSS_GPIO_H
#define PFVP_VARIANT_C_MSS_GPIO_H

#include <stdint.h>
#include "../../../../common.h"

#define MSS_GPIO0_BASE 0x20120000UL
#define MSS_GPIO_VALUE 0x00UL
#define MSS_GPIO_DIRECTION 0x04UL

static inline void MSS_GPIO_config(uint32_t mask)
{
    mmio_write32(MSS_GPIO0_BASE + MSS_GPIO_DIRECTION, mask);
}

static inline void MSS_GPIO_set_output(uint32_t mask)
{
    mmio_write32(MSS_GPIO0_BASE + MSS_GPIO_VALUE, mask);
}

static inline uint32_t MSS_GPIO_get_output(void)
{
    return mmio_read32(MSS_GPIO0_BASE + MSS_GPIO_VALUE);
}

#endif
