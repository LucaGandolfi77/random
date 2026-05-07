/*******************************************************************************
 * Copyright 2019 Microchip FPGA Embedded Systems Solutions.
 *
 * SPDX-License-Identifier: MIT
 *
 * MPFS HAL Embedded Software example
 *
 */
/*******************************************************************************
 *
 * Code running on E51
 *
 */

#include <string.h>
#include "mpfs_hal/mss_hal.h"
#include "mpfs_hal/mpfs_hal_version.h"
#include "common.h"
#include "drivers/mss/mss_gpio/mss_gpio.h"
#include "boot.h"


/**
 * @brief idle thread in DTIM
 */
__attribute__((section(".ram_codetext"))) static void loop_in_dtim(void);

/*==============================================================================*/



__attribute__((section(".ram_codetext"))) static void loop_in_dtim(void)
{
    mb();
    /*Put this hart into WFI.*/
    while(1U)
    {
        do
        {
            __asm__ volatile("wfi");
        }while(0U == (read_csr(mip) & MIP_MSIP));
    }
}

/* Main function for the HART0(E51 processor).
 * Application code running on HART0 is placed here.
 */
void e51(void)
{
    clear_soft_interrupt();
    set_csr(mie, MIP_MSIP);
    BT_BootMain();

    /* shall never get here */
    disable_systick();
    loop_in_dtim();
}
