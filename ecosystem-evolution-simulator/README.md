# Ecosystem Evolution Simulator

A real-time ecosystem simulator where species evolve dynamically, featuring interactive population graphs and genetic lineage trees.

## Features

- **Real-time Species Simulation**: Multiple species with predator-prey relationships and genetic trait inheritance
- **Population Graphs**: Live updating matplotlib charts showing population dynamics
- **Genetic Lineage Tree**: Interactive NetworkX visualization of evolutionary relationships
- **Control Panel**: Play/pause controls, speed adjustment, and parameter tuning

## Installation

```bash
pip install -e .
```

## Usage

```bash
ecosystem-sim
# or
python -m ecosystem_simulator
```

## Architecture

```
┌─────────────────┐
│  Simulation     │
│  Engine (SimPy) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Species        │────▶│  Population     │
│  Manager        │     │  Tracker        │
└─────────────────┘     └────────┬────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│  Matplotlib     │                           │  NetworkX       │
│  (Population)   │                           │  (Lineage Tree) │
└─────────────────┘                           └─────────────────┘
```

## Controls

- **Play/Pause**: Start or stop the simulation
- **Step**: Advance one time step
- **Speed Slider**: Adjust simulation speed (1-100)

## Requirements

- Python 3.10+
- PyQt6
- NetworkX
- Matplotlib
- SimPy
- NumPy
- SciPy