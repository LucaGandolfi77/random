# Simulator and Hardware Strategy

## Suitable for Host Tests

Use host tests for:

1. Parsers
2. CRC and checksum logic
3. State machines
4. Deterministic scheduling or mode-management logic
5. Edge cases that are easier to enumerate under Linux than under a debugger

## Suitable for Simulator Tests

Use simulator tests only when the test is primarily about:

1. CPU execution of plain C code
2. Symbol visibility and test-run control
3. Startup or control flow that does not depend on unsupported peripherals

## Requires Hardware

Use hardware-backed tests for:

1. Interrupt timing
2. Peripheral drivers
3. Clock and reset behaviour
4. Radiation-hardening features or board-specific monitoring
5. Debugger interaction that differs from simulator behaviour

## Conservative Rule

If a test touches a peripheral, assumes realistic timing, or depends on debugger side effects, do not treat simulator results as sufficient evidence until the behaviour has been verified against hardware.

## Graceful Degradation

If simulator support is incomplete:

1. Keep the logic portion in host tests.
2. Keep the integration hook in target code.
3. Execute the integration scenario on hardware.