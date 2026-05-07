CROSS ?= riscv64-unknown-elf
BUILD_DIR := build
ELF := $(BUILD_DIR)/hello_uart.elf
OBJDUMP := $(BUILD_DIR)/hello_uart.dis

ASFLAGS := -march=rv64im -mabi=lp64 -mno-relax
LDFLAGS := -T linker.ld -nostdlib -nostartfiles -Wl,-Map=$(BUILD_DIR)/hello_uart.map

.PHONY: all clean disasm

all: $(ELF)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(ELF): hello_uart.S linker.ld | $(BUILD_DIR)
	$(CROSS)-gcc $(ASFLAGS) $(LDFLAGS) -o $@ hello_uart.S

disasm: $(ELF)
	$(CROSS)-objdump -d $(ELF) > $(OBJDUMP)

clean:
	rm -rf $(BUILD_DIR)
