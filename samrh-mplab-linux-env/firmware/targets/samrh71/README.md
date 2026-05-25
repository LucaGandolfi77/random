# SAMRH71 Target Notes

Use this directory for SAMRH71-specific startup files, linker scripts, BSP adapters, and low-level initialization.

Recommended split:

1. Startup and vector table files managed by MPLAB X or Harmony.
2. Device-pack-dependent files kept isolated from shared code.
3. Board bring-up, clocks, watchdog, and debug wiring reviewed independently from business logic.