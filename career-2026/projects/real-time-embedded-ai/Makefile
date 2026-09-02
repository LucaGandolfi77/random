CXX ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -Iinclude -Imodels
SRC := src/runtime.cpp src/sha256.cpp

.PHONY: all build test bench clean cmake

all: build

build:
	mkdir -p build
	$(CXX) $(CXXFLAGS) $(SRC) src/tests_main.cpp -o build/tests -pthread
	$(CXX) $(CXXFLAGS) $(SRC) src/bench_main.cpp -o build/bench -pthread

test: build
	./build/tests

bench: build
	./build/bench 200000

cmake:
	cmake -S . -B build/cmake && cmake --build build/cmake && ctest --test-dir build/cmake

clean:
	rm -rf build
