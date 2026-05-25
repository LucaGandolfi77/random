ROOT_DIR := ../..
BUILD_DIR := build
BIN := $(BUILD_DIR)/host_unit_tests

include $(ROOT_DIR)/make/host-flags.mk

CC ?= $(HOST_CC)
CFLAGS ?= $(HOST_CFLAGS)
CPPFLAGS := $(HOST_CPPFLAGS) \
	-I$(ROOT_DIR)/firmware/common/include \
	-I$(ROOT_DIR)/tests/shared/include

SRC := \
	$(ROOT_DIR)/firmware/common/src/command_frame.c \
	$(ROOT_DIR)/tests/shared/src/test_command_frame.c \
	src/main.c

.PHONY: all clean test

all: $(BIN)

$(BIN): $(SRC) | $(BUILD_DIR)
	$(CC) $(CFLAGS) $(CPPFLAGS) $(SRC) -o $@

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

test: $(BIN)
	./$(BIN)

clean:
	rm -rf $(BUILD_DIR)