#ifndef PFVP_VARIANT_C_BSP_BOARD_H
#define PFVP_VARIANT_C_BSP_BOARD_H

#include <stdint.h>

uint64_t BT_BOARD_get_hart_jump_ddr_addr(void);
uint64_t BT_BOARD_get_hart_jump_ddr(void);
void BT_BOARD_set_hart_jump_ddr_addr(uint32_t hart_id, uint64_t next_addr);
void BT_BOARD_set_hart_jump_ddr(uint32_t hart_id, uint64_t value);
void PLIC_init(void);
uint32_t PLIC_claim(void);
void PLIC_complete(uint32_t irq_id);

#endif
