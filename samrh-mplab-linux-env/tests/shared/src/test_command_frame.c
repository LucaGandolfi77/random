#include "test_command_frame.h"

#include "command_frame.h"

static void emit(test_log_fn_t log_fn, const char *message)
{
    if (log_fn != 0)
    {
        log_fn(message);
    }
}

static void build_frame(uint8_t opcode, uint16_t parameter, uint8_t sequence, uint8_t frame[COMMAND_FRAME_SIZE_BYTES])
{
    frame[0] = COMMAND_FRAME_SYNC_BYTE;
    frame[1] = opcode;
    frame[2] = (uint8_t)(parameter & 0x00FFU);
    frame[3] = (uint8_t)((parameter >> 8U) & 0x00FFU);
    frame[4] = sequence;
    frame[5] = command_frame_crc8(frame, COMMAND_FRAME_SIZE_BYTES - 1U);
}

static uint32_t test_parse_valid_frame(test_log_fn_t log_fn)
{
    uint8_t frame[COMMAND_FRAME_SIZE_BYTES];
    command_frame_t parsed = {0U, 0U, 0U};
    const command_frame_status_t status_expected = COMMAND_FRAME_STATUS_OK;
    uint32_t failures = 0U;
    command_frame_status_t status_actual;

    build_frame(0x21U, 0x1234U, 0x5AU, frame);
    status_actual = command_frame_parse(frame, COMMAND_FRAME_SIZE_BYTES, &parsed);

    if (status_actual != status_expected)
    {
        emit(log_fn, "test_parse_valid_frame: parse status mismatch");
        ++failures;
    }

    if ((parsed.opcode != 0x21U) || (parsed.parameter != 0x1234U) || (parsed.sequence != 0x5AU))
    {
        emit(log_fn, "test_parse_valid_frame: parsed payload mismatch");
        ++failures;
    }

    return failures;
}

static uint32_t test_reject_invalid_length(test_log_fn_t log_fn)
{
    uint8_t frame[COMMAND_FRAME_SIZE_BYTES];

    build_frame(0x10U, 0x0001U, 0x01U, frame);

    if (command_frame_parse(frame, COMMAND_FRAME_SIZE_BYTES - 1U, &(command_frame_t){0U, 0U, 0U}) != COMMAND_FRAME_STATUS_INVALID_LENGTH)
    {
        emit(log_fn, "test_reject_invalid_length: expected invalid length");
        return 1U;
    }

    return 0U;
}

static uint32_t test_reject_unsupported_opcode(test_log_fn_t log_fn)
{
    uint8_t frame[COMMAND_FRAME_SIZE_BYTES];

    build_frame(0x7EU, 0x2222U, 0x02U, frame);
    frame[5] = command_frame_crc8(frame, COMMAND_FRAME_SIZE_BYTES - 1U);

    if (command_frame_parse(frame, COMMAND_FRAME_SIZE_BYTES, &(command_frame_t){0U, 0U, 0U}) != COMMAND_FRAME_STATUS_UNSUPPORTED_OPCODE)
    {
        emit(log_fn, "test_reject_unsupported_opcode: expected unsupported opcode");
        return 1U;
    }

    return 0U;
}

static uint32_t test_reject_crc_error(test_log_fn_t log_fn)
{
    uint8_t frame[COMMAND_FRAME_SIZE_BYTES];

    build_frame(0x37U, 0x00F0U, 0x03U, frame);
    frame[5] ^= 0xFFU;

    if (command_frame_parse(frame, COMMAND_FRAME_SIZE_BYTES, &(command_frame_t){0U, 0U, 0U}) != COMMAND_FRAME_STATUS_INVALID_CRC)
    {
        emit(log_fn, "test_reject_crc_error: expected invalid crc");
        return 1U;
    }

    return 0U;
}

uint32_t test_command_frame_run_all(test_log_fn_t log_fn)
{
    uint32_t failures = 0U;

    failures += test_parse_valid_frame(log_fn);
    failures += test_reject_invalid_length(log_fn);
    failures += test_reject_unsupported_opcode(log_fn);
    failures += test_reject_crc_error(log_fn);

    return failures;
}