# SAMRH707 Target Notes

Use this directory for SAMRH707-specific startup files, linker scripts, BSP adapters, and low-level initialization.

Recommended split:

1. Startup and vector table files managed by MPLAB X or Harmony.
2. Linker script and memory-map artefacts reviewed under configuration control.
3. Any radiation-hardening or board-specific hooks kept separate from shared application logic.