#include <stdint.h>

#include "platform_test_hooks.h"
#include "target_test_status.h"
#include "test_command_frame.h"

volatile uint32_t unit_test_done __attribute__((used)) = 0U;
volatile uint32_t unit_test_failures __attribute__((used)) = 0U;
volatile uint32_t unit_test_signature __attribute__((used)) = 0U;

static void target_log(const char *message)
{
    (void)message;
}

int main(void)
{
    platform_test_init();

    unit_test_done = 0U;
    unit_test_failures = test_command_frame_run_all(target_log);
    unit_test_signature = 0x54455354UL;
    unit_test_done = 1U;

    platform_test_complete(unit_test_failures);

    for (;;)
    {
        platform_test_idle();
    }
}