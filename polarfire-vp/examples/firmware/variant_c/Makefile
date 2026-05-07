CROSS ?= riscv64-unknown-elf
BUILD_DIR := build
ELF := $(BUILD_DIR)/mpfs_variant_c.elf
OBJDUMP := $(BUILD_DIR)/mpfs_variant_c.dis

SRCS := start.S e51_hal_variant.c boot.c secondary.c bsp_board.c

CFLAGS := -march=rv64im -mabi=lp64 -mno-relax -ffreestanding -fno-builtin -fno-pic -fno-stack-protector -Wall -Wextra -I.
LDFLAGS := -T linker.ld -nostdlib -nostartfiles -Wl,-Map=$(BUILD_DIR)/mpfs_variant_c.map

.PHONY: all clean disasm

all: $(ELF)

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(ELF): $(SRCS) linker.ld | $(BUILD_DIR)
	$(CROSS)-gcc $(CFLAGS) $(LDFLAGS) -o $@ $(SRCS)

disasm: $(ELF)
	$(CROSS)-objdump -d $(ELF) > $(OBJDUMP)

clean:
	rm -rf $(BUILD_DIR)
