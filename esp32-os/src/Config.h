#pragma once

#define OS_NAME        "esp32-os"
#define OS_VERSION     "1.0.0"
#define OS_AUTHOR      "opencode"

#define SERIAL_BAUD      115200

#define SHELL_MAX_LINE   256
#define SHELL_MAX_ARGS   16
#define SHELL_HISTORY    8
#define SHELL_MAX_CMDS   40
#define SHELL_PROMPT     "root@esp32-os:/"

#define KERNEL_MAX_TASKS 16

#define FS_MAX_PATH      128
#define FS_MOUNT_POINT   "/littlefs"

#define INIT_RC_PATH     "/boot/init.rc"
#define MOTD_PATH        "/etc/motd"

// LED_BUILTIN defined per-board in pins_arduino.h (Arduino.h)
