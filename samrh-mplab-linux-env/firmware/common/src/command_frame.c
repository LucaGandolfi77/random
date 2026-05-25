#include "command_frame.h"

enum
{
    COMMAND_FRAME_CRC_INPUT_SIZE = COMMAND_FRAME_SIZE_BYTES - 1U,
    COMMAND_FRAME_OPCODE_NO_OP = 0x10U,
    COMMAND_FRAME_OPCODE_ARM = 0x21U,
    COMMAND_FRAME_OPCODE_DISARM = 0x37U,
    COMMAND_FRAME_CRC_POLYNOMIAL = 0x07U
};

static uint8_t crc8_update(uint8_t current, uint8_t value)
{
    uint8_t bit_index;

    current ^= value;
    for (bit_index = 0U; bit_index < 8U; ++bit_index)
    {
        if ((current & 0x80U) != 0U)
        {
            current = (uint8_t)((current << 1U) ^ COMMAND_FRAME_CRC_POLYNOMIAL);
        }
        else
        {
            current = (uint8_t)(current << 1U);
        }
    }

    return current;
}

bool command_frame_is_supported_opcode(uint8_t opcode)
{
    bool is_supported = false;

    switch (opcode)
    {
        case COMMAND_FRAME_OPCODE_NO_OP:
        case COMMAND_FRAME_OPCODE_ARM:
        case COMMAND_FRAME_OPCODE_DISARM:
            is_supported = true;
            break;

        default:
            is_supported = false;
            break;
    }

    return is_supported;
}

uint8_t command_frame_crc8(const uint8_t *data, size_t length)
{
    size_t index;
    uint8_t crc = 0U;

    if (data == NULL)
    {
        return 0U;
    }

    for (index = 0U; index < length; ++index)
    {
        crc = crc8_update(crc, data[index]);
    }

    return crc;
}

command_frame_status_t command_frame_parse(const uint8_t *data, size_t length, command_frame_t *frame)
{
    uint8_t expected_crc;

    if ((data == NULL) || (frame == NULL))
    {
        return COMMAND_FRAME_STATUS_INVALID_ARGUMENT;
    }

    if (length != COMMAND_FRAME_SIZE_BYTES)
    {
        return COMMAND_FRAME_STATUS_INVALID_LENGTH;
    }

    if (data[0] != COMMAND_FRAME_SYNC_BYTE)
    {
        return COMMAND_FRAME_STATUS_INVALID_SYNC;
    }

    if (!command_frame_is_supported_opcode(data[1]))
    {
        return COMMAND_FRAME_STATUS_UNSUPPORTED_OPCODE;
    }

    expected_crc = command_frame_crc8(data, COMMAND_FRAME_CRC_INPUT_SIZE);
    if (expected_crc != data[COMMAND_FRAME_CRC_INPUT_SIZE])
    {
        return COMMAND_FRAME_STATUS_INVALID_CRC;
    }

    frame->opcode = data[1];
    frame->parameter = (uint16_t)((uint16_t)data[2] | ((uint16_t)data[3] << 8U));
    frame->sequence = data[4];

    return COMMAND_FRAME_STATUS_OK;
}