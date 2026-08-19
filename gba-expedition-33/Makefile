#---------------------------------------------------------------------------------
# EXPEDITION 33 - a Pokemon-style story RPG for the Game Boy Advance
# based on the lore of "Clair Obscur: Expedition 33".
#
# Requires devkitPro (devkitARM + libgba):
#   macOS:   https://devkitpro.org/wiki/Getting_Started
#   Linux:   pacman -S gba-dev   (via dkp-pacman)
#   Windows: devkitPro installer
#
# Build:   make
# Clean:   make clean
# Output:  expedition33.gba  -> run it in mGBA / VBA-M / RetroArch / any GBA emulator
#---------------------------------------------------------------------------------
.SUFFIXES:

ifeq ($(strip $(DEVKITARM)),)
$(error "Please set DEVKITARM in your environment. export DEVKITARM=<path to>devkitARM")
endif

ifeq ($(strip $(DEVKITPRO)),)
$(error "Please set DEVKITPRO in your environment. export DEVKITPRO=<path to>devkitPro")
endif

TARGET     := expedition33
GAME_TITLE := EXPEDITION33
GAME_CODE  := EXP3
MAKER_CODE := 01

ARCH    := -marm -mthumb-interwork -mcpu=arm7tdmi -mtune=arm7tdmi
CFLAGS  := -g -Wall -Wextra -O2 $(ARCH) -ffunction-sections -fdata-sections \
           -I$(DEVKITPRO)/libgba/include
LDFLAGS := -g $(ARCH) -Wl,-Map,$(TARGET).map
LIBS    := -lgba
LIBDIRS := -L$(DEVKITPRO)/libgba/lib

export DEPSDIR := $(CURDIR)
OFILES  := src/main.o

include $(DEVKITARM)/base_tools
include $(DEVKITARM)/base_rules

#---------------------------------------------------------------------------------
all: $(TARGET).gba

$(TARGET).gba: $(TARGET).elf
	$(OBJCOPY) -O binary $< $@
	gbafix $@ -t$(GAME_TITLE) -c$(GAME_CODE) -m$(MAKER_CODE)
	@echo "==> built $@"

$(TARGET).elf: $(OFILES)
	$(CC) $(LDFLAGS) -specs=gba.specs $(OFILES) $(LIBDIRS) $(LIBS) -o $@

clean:
	rm -f $(OFILES) src/main.d $(TARGET).elf $(TARGET).gba $(TARGET).map

.PHONY: all clean