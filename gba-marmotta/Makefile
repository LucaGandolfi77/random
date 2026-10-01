#---------------------------------------------------------------------------------
# Marmotta - build del Game Boy Advance ROM
#---------------------------------------------------------------------------------
.SUFFIXES:

ifeq ($(strip $(DEVKITARM)),)
$(error "DEVKITARM non e' impostato. Esegui: source scripts/env.sh && make")
endif

include $(DEVKITARM)/gba_rules

#---------------------------------------------------------------------------------
TARGET		:= marmotta
BUILD		:= build
SOURCES		:= source
INCLUDES	:= include
DATA		:=
MUSIC		:=

GAME_TITLE	:= MARMOTTA
GAME_CODE	:= MRMT
MAKER_CODE	:= 01

#---------------------------------------------------------------------------------
# Opzioni di compilazione
#
# -mthumb: il game loop e' in Thumb (meno I/O, piu' veloce su EWRAM)
# -O2 e -fno-strict-aliasing: la fisica fa molti reinterpret_cast su strutture
#---------------------------------------------------------------------------------
ARCH	:=	-mthumb -mthumb-interwork

CFLAGS	:=	-g -Wall -Wextra -O2 -fno-strict-aliasing \
		-mcpu=arm7tdmi -mtune=arm7tdmi \
		$(ARCH)

CFLAGS	+=	$(INCLUDE)

ASFLAGS	:=	-g $(ARCH)
LDFLAGS	=	-g $(ARCH) -Wl,-Map,$(notdir $*.map)

LIBS	:=	-ltonc -lgba

# gba_rules definisce solo LIBGBA, quindi aggiungo libtonc a mano
LIBTONC	:=	$(DEVKITPRO)/libtonc
LIBDIRS	:=	$(LIBTONC) $(LIBGBA)

#---------------------------------------------------------------------------------
ifneq ($(BUILD),$(notdir $(CURDIR)))
#---------------------------------------------------------------------------------

# tonc_types.h e gba_base.h definiscono alcune macro con gli stessi nomi ma
# significati diversi (IWRAM_DATA, EWRAM_DATA, ALIGN). I warning sono attesi e
# non influiscono sulla compilazione, quindi li silenziamo per il solo codice
# del progetto: sono Header del toolchain, non roba nostra da correggere.
export OUTPUT	:=	$(CURDIR)/$(TARGET)
export VPATH	:=	$(foreach dir,$(SOURCES),$(CURDIR)/$(dir)) \
			$(foreach dir,$(DATA),$(CURDIR)/$(dir))

export DEPSDIR	:=	$(CURDIR)/$(BUILD)

CFILES		:=	$(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.c)))
CPPFILES	:=	$(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.cpp)))
SFILES		:=	$(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.s)))
BINFILES	:=	$(foreach dir,$(DATA),$(notdir $(wildcard $(dir)/*.*)))

ifneq ($(strip $(CPPFILES)),)
export LD	:=	$(CXX)
else
export LD	:=	$(CC)
endif

export OFILES_BIN := $(addsuffix .o,$(BINFILES))
export OFILES_SOURCES := $(CPPFILES:.cpp=.o) $(CFILES:.c=.o) $(SFILES:.s=.o)
export OFILES := $(OFILES_BIN) $(OFILES_SOURCES)
export HFILES := $(addsuffix .h,$(subst .,_,$(BINFILES)))

export INCLUDE	:=	$(foreach dir,$(INCLUDES),-iquote $(CURDIR)/$(dir)) \
				$(foreach dir,$(LIBDIRS),-I$(dir)/include) \
				-I$(CURDIR)/$(BUILD)

export LIBPATHS	:=	$(foreach dir,$(LIBDIRS),-L$(dir)/lib)

.PHONY: $(BUILD) clean run screenshot env

#---------------------------------------------------------------------------------
$(BUILD):
	@[ -d $@ ] || mkdir -p $@
	@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile

#---------------------------------------------------------------------------------
# clean
#---------------------------------------------------------------------------------
clean:
	@echo clean ...
	@rm -fr $(BUILD) $(TARGET).elf $(TARGET).gba

#---------------------------------------------------------------------------------
# source: rigenera gli asset grafici in build/ (nessuna dipendenza esterna)
#---------------------------------------------------------------------------------
source:
	@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile source

#---------------------------------------------------------------------------------
# env: installa/verifica il toolchain e stampa le varianti d'ambiente
#---------------------------------------------------------------------------------
env:
	@scripts/setup-toolchain.sh

#---------------------------------------------------------------------------------
# run: lancia il ROM in mNBA headless sotto Xvfb
#---------------------------------------------------------------------------------
run:
	@scripts/run-rom.sh $(OUTPUT).gba

#---------------------------------------------------------------------------------
# screenshot: cattura un frame del ROM in build/screenshot.png
#---------------------------------------------------------------------------------
screenshot:
	@scripts/run-rom.sh $(OUTPUT).gba build/screenshot.png

#---------------------------------------------------------------------------------
else
#---------------------------------------------------------------------------------
# main targets
#---------------------------------------------------------------------------------
$(OUTPUT).gba	:	$(OUTPUT).elf

$(OUTPUT).elf	:	$(OFILES)

$(OFILES_SOURCES) : $(HFILES)

%.bin.o	%_bin.h :	%.bin
	@echo $(notdir $<)
	@$(bin2o)

-include $(DEPSDIR)/*.d
#---------------------------------------------------------------------------------
endif
#---------------------------------------------------------------------------------
