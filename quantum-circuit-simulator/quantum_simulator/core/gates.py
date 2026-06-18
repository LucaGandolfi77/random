"""Quantum gate definitions for circuit building."""

import numpy as np
from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class QuantumGate:
    """Represents a quantum gate with matrix representation."""
    name: str
    matrix: np.ndarray
    num_qubits: int
    symbol: str
    color: Tuple[int, int, int]
    description: str = ""
    
    def __post_init__(self):
        self.matrix = np.array(self.matrix, dtype=complex)


# Single-qubit gates
IDENTITY = QuantumGate(
    name="I",
    matrix=[[1, 0], [0, 1]],
    num_qubits=1,
    symbol="I",
    color=(200, 200, 200),
    description="Identity: leaves the qubit unchanged"
)

PAULI_X = QuantumGate(
    name="X",
    matrix=[[0, 1], [1, 0]],
    num_qubits=1,
    symbol="X",
    color=(255, 100, 100),
    description="Pauli-X: flips |0⟩ and |1⟩"
)

PAULI_Y = QuantumGate(
    name="Y",
    matrix=[[0, -1j], [1j, 0]],
    num_qubits=1,
    symbol="Y",
    color=(255, 100, 255),
    description="Pauli-Y: bit and phase flip"
)

PAULI_Z = QuantumGate(
    name="Z",
    matrix=[[1, 0], [0, -1]],
    num_qubits=1,
    symbol="Z",
    color=(100, 100, 255),
    description="Pauli-Z: phase flip on |1⟩"
)

HADAMARD = QuantumGate(
    name="H",
    matrix=[[1, 1], [1, -1]] / np.sqrt(2),
    num_qubits=1,
    symbol="H",
    color=(100, 255, 100),
    description="Hadamard: creates equal superposition"
)

PHASE_S = QuantumGate(
    name="S",
    matrix=[[1, 0], [0, 1j]],
    num_qubits=1,
    symbol="S",
    color=(255, 200, 100),
    description="S gate: 90° phase rotation"
)

PHASE_T = QuantumGate(
    name="T",
    matrix=[[1, 0], [0, np.exp(1j * np.pi / 4)]],
    num_qubits=1,
    symbol="T",
    color=(255, 150, 100),
    description="T gate: 45° phase rotation"
)


# Two-qubit gates
CNOT = QuantumGate(
    name="CNOT",
    matrix=[[1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1],
            [0, 0, 1, 0]],
    num_qubits=2,
    symbol="⊕",
    color=(255, 150, 150),
    description="Controlled-NOT: flips target when control is |1⟩"
)

CZ = QuantumGate(
    name="CZ",
    matrix=[[1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, -1]],
    num_qubits=2,
    symbol="CZ",
    color=(150, 150, 255),
    description="Controlled-Z: phase flip when both qubits are |1⟩"
)

SWAP = QuantumGate(
    name="SWAP",
    matrix=[[1, 0, 0, 0],
            [0, 0, 1, 0],
            [0, 1, 0, 0],
            [0, 0, 0, 1]],
    num_qubits=2,
    symbol="SWAP",
    color=(200, 200, 100),
    description="SWAP: exchanges two qubits"
)


# Rotation gates
def rotation_gate(axis: str, angle: float) -> QuantumGate:
    """Create a rotation gate (RX, RY, RZ) with specified angle."""
    if axis == 'X':
        matrix = [[np.cos(angle/2), -1j*np.sin(angle/2)],
                  [-1j*np.sin(angle/2), np.cos(angle/2)]]
    elif axis == 'Y':
        matrix = [[np.cos(angle/2), -np.sin(angle/2)],
                  [np.sin(angle/2), np.cos(angle/2)]]
    elif axis == 'Z':
        matrix = [[np.exp(-1j*angle/2), 0],
                  [0, np.exp(1j*angle/2)]]
    else:
        raise ValueError(f"Unknown axis: {axis}")
    
    return QuantumGate(
        name=f"R{axis}",
        matrix=matrix,
        num_qubits=1,
        symbol=f"R{axis}",
        color=(150, 255, 255)
    )


# Gate registry
GATE_REGISTRY = {
    'I': IDENTITY,
    'X': PAULI_X,
    'Y': PAULI_Y,
    'Z': PAULI_Z,
    'H': HADAMARD,
    'S': PHASE_S,
    'T': PHASE_T,
    'CNOT': CNOT,
    'CZ': CZ,
    'SWAP': SWAP,
}


def get_gate(name: str) -> Optional[QuantumGate]:
    """Get a gate by name from the registry."""
    return GATE_REGISTRY.get(name.upper())


def get_all_gates() -> list:
    """Get all available gates."""
    return list(GATE_REGISTRY.values())