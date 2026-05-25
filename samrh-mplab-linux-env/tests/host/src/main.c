#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>

#include "test_command_frame.h"

static void host_log(const char *message)
{
    (void)fprintf(stderr, "FAIL: %s\n", message);
}

int main(void)
{
    const uint32_t failures = test_command_frame_run_all(host_log);

    if (failures == 0U)
    {
        (void)puts("host tests: PASS");
        return 0;
    }

    (void)fprintf(stderr, "host tests: FAIL (%" PRIu32 " failures)\n", failures);
    return 1;
}