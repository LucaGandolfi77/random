#ifndef TEST_COMMAND_FRAME_H
#define TEST_COMMAND_FRAME_H

#include <stdint.h>

typedef void (*test_log_fn_t)(const char *message);

uint32_t test_command_frame_run_all(test_log_fn_t log_fn);

#endif