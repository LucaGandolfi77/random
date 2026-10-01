#---------------------------------------------------------------------------------
# Palimpsesto - build del Game Boy Advance ROM
#
# Struttura copiata da gba-marmotta, che e' il progetto GBA piu' maturo del
# repository: libtonc per la grafica e libgba per il resto.
#---------------------------------------------------------------------------------
.SUFFIXES:

ifeq ($(strip $(DEVKITARM)),)
$(error "DEVKITARM non e' impostato. Esegui: source scripts/env.sh && make")
endif

include $(DEVKITARM)/gba_rules

#---------------------------------------------------------------------------------
TARGET		:= palimpsesto
BUILD		:= build
SOURCES		:= source
INCLUDES	:= include
DATA		:=
MUSIC		:=

GAME_TITLE	:= PALIMPSESTO
GAME_CODE	:= PALE
MAKER_CODE	:= 01

#---------------------------------------------------------------------------------
# Opzioni di compilazione
#
# -mthumb: il game loop e' in Thumb, meno I/O e piu' veloce su EWRAM.
# -O2 e -fno-strict-aliasing: i moduli di stato fanno reinterpret_cast su
# strutture che attraversano la frontiera IWRAM/EWRAM.
#---------------------------------------------------------------------------------
ARCH	:=	-mthumb -mthumb-interwork

CFLAGS	:=	-g -Wall -Wextra -O2 -fno-strict-aliasing \
		-mcpu=arm7tdmi -mtune=arm7tdmi \
		$(ARCH)

# $(INCLUDE) viene esportato piu' in basso, dentro il ramo "top level" del
# makefile. Perche' CFLAGS e' espanso in modo ricorsivo (= e non :=) la
# espansione avviene quando la riga e' usata, quindi in quel momento INCLUDE e'
# gia' valorizzato. Con := invece resterebbe vuoto e la compilazione fallirebbe
# con "pale.h: No such file or directory", che e' un errore molto fuorviante.
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

.PHONY: $(BUILD) clean run screenshot env tests

$(BUILD):
	@[ -d $@ ] || mkdir -p $@
	@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile

# clean
clean:
	@echo clean ...
	@rm -fr $(BUILD) $(TARGET).elf $(TARGET).gba

# env: installa/verifica il toolchain e stampa le varianti d'ambiente
env:
	@scripts/setup-toolchain.sh

# run: lancia il ROM in mGBA headless sotto Xvfb
run:
	@scripts/run-rom.sh $(OUTPUT).gba

# screenshot: cattura un frame del ROM in build/screenshot.png
screenshot:
	@scripts/run-rom.sh $(OUTPUT).gba build/screenshot.png

# tests: banco di prova della logica di combattimento sul PC
tests:
	@tests/run-tests.sh

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