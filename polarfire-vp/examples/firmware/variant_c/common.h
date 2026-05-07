#ifndef PFVP_VARIANT_C_COMMON_H
#define PFVP_VARIANT_C_COMMON_H

#include <stdint.h>

#define MIP_MSIP (1UL << 3)
#define MIP_MTIP (1UL << 7)

#define read_csr(reg) ({ \
    uintptr_t __tmp; \
    __asm__ volatile ("csrr %0, " #reg : "=r"(__tmp)); \
    __tmp; \
})

#define write_csr(reg, value) do { \
    uintptr_t __tmp = (uintptr_t)(value); \
    __asm__ volatile ("csrw " #reg ", %0" :: "rK"(__tmp)); \
} while (0)

#define set_csr(reg, bits) do { \
    uintptr_t __tmp = (uintptr_t)(bits); \
    __asm__ volatile ("csrs " #reg ", %0" :: "rK"(__tmp)); \
} while (0)

#define clear_csr(reg, bits) do { \
    uintptr_t __tmp = (uintptr_t)(bits); \
    __asm__ volatile ("csrc " #reg ", %0" :: "rK"(__tmp)); \
} while (0)

#define mb() __asm__ volatile ("" ::: "memory")

static inline void mmio_write8(uintptr_t address, uint8_t value)
{
    *(volatile uint8_t *)address = value;
}

static inline void mmio_write32(uintptr_t address, uint32_t value)
{
    *(volatile uint32_t *)address = value;
}

static inline void mmio_write64(uintptr_t address, uint64_t value)
{
    *(volatile uint64_t *)address = value;
}

static inline uint32_t mmio_read32(uintptr_t address)
{
    return *(volatile uint32_t *)address;
}

static inline uint64_t mmio_read64(uintptr_t address)
{
    return *(volatile uint64_t *)address;
}

#endif
