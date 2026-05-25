#ifndef PLATFORM_TEST_HOOKS_H
#define PLATFORM_TEST_HOOKS_H

#include <stdint.h>

void platform_test_init(void);
void platform_test_complete(uint32_t failures);
void platform_test_idle(void);

#endif