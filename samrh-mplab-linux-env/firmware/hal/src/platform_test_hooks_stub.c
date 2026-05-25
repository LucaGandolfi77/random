#include "platform_test_hooks.h"

void platform_test_init(void)
{
}

void platform_test_complete(uint32_t failures)
{
    (void)failures;

#if defined(ENABLE_TEST_BREAKPOINT) && (defined(__arm__) || defined(__thumb__))
    __asm volatile ("bkpt #0");
#endif
}

void platform_test_idle(void)
{
#if defined(__arm__) || defined(__thumb__)
    __asm volatile ("nop");
#endif
}