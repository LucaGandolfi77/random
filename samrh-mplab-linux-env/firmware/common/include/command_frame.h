#ifndef COMMAND_FRAME_H
#define COMMAND_FRAME_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define COMMAND_FRAME_SYNC_BYTE (0xA5U)
#define COMMAND_FRAME_SIZE_BYTES (6U)

typedef enum
{
    COMMAND_FRAME_STATUS_OK = 0,
    COMMAND_FRAME_STATUS_INVALID_ARGUMENT,
    COMMAND_FRAME_STATUS_INVALID_LENGTH,
    COMMAND_FRAME_STATUS_INVALID_SYNC,
    COMMAND_FRAME_STATUS_UNSUPPORTED_OPCODE,
    COMMAND_FRAME_STATUS_INVALID_CRC
} command_frame_status_t;

typedef struct
{
    uint8_t opcode;
    uint16_t parameter;
    uint8_t sequence;
} command_frame_t;

bool command_frame_is_supported_opcode(uint8_t opcode);
uint8_t command_frame_crc8(const uint8_t *data, size_t length);
command_frame_status_t command_frame_parse(const uint8_t *data, size_t length, command_frame_t *frame);

#endif