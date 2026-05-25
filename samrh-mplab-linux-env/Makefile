SHELL := /usr/bin/env bash

.PHONY: help host-build host-test host-test-clang verify-tools lint-sh

help:
	@printf '%s\n' \
		'Available targets:' \
		'  host-build      Build host-side unit tests' \
		'  host-test       Build and run host-side unit tests' \
		'  host-test-clang Build and run host-side unit tests with clang' \
		'  verify-tools    Detect MPLAB X / XC32 tools on Linux' \
		'  lint-sh         Parse-check Bash scripts'

host-build:
	./scripts/build-host-tests.sh --build-only

host-test:
	./scripts/build-host-tests.sh

host-test-clang:
	./scripts/build-host-tests.sh --compiler clang

verify-tools:
	./scripts/verify-tools.sh

lint-sh:
	bash -n scripts/*.sh scripts/lib/*.sh