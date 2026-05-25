#ifndef TARGET_TEST_STATUS_H
#define TARGET_TEST_STATUS_H

#include <stdint.h>

extern volatile uint32_t unit_test_done;
extern volatile uint32_t unit_test_failures;
extern volatile uint32_t unit_test_signature;

#endif