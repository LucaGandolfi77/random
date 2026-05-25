# SAMRH71 Project Manifest

Conservative default device: `SAMRH71F20C`

Create an MPLAB X standalone project with these settings:

1. Device: `SAMRH71F20C`
2. Compiler: XC32
3. Artifact type: ELF
4. Configuration name: `default`

Required preprocessor symbols:

1. `UNIT_TEST`
2. `TARGET_SAMRH71`

Optional preprocessor symbols:

1. `USE_HARMONY`
2. `ENABLE_TEST_BREAKPOINT`

Required source files to reference from the repository root:

1. `firmware/common/src/command_frame.c`
2. `firmware/hal/src/platform_test_hooks_stub.c`
3. `tests/shared/src/test_command_frame.c`
4. `tests/target/src/main.c`

Required include directories:

1. `firmware/common/include`
2. `firmware/hal/include`
3. `tests/shared/include`
4. `tests/target/include`