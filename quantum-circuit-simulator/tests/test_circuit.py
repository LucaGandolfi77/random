"""Tests for quantum circuit simulator."""

import pytest
import numpy as np
from quantum_simulator import (
    QuantumCircuit, CircuitLayer,
    QuantumGate,
    IDENTITY, PAULI_X, PAULI_Y, PAULI_Z,
    HADAMARD, PHASE_S, PHASE_T,
    CNOT, CZ, SWAP,
    get_gate, get_all_gates, rotation_gate
)


def test_circuit_creation():
    """Test basic circuit creation."""
    circuit = QuantumCircuit(2)
    assert circuit.num_qubits == 2
    assert len(circuit.layers) == 0


def test_add_gate():
    """Test adding gates to circuit."""
    circuit = QuantumCircuit(2)
    circuit.add_gate(0, HADAMARD)
    assert len(circuit.layers) == 1
    assert len(circuit.layers[0].gates) == 1


def test_hadamard_on_single_qubit():
    """Test Hadamard gate creates superposition."""
    circuit = QuantumCircuit(1)
    circuit.add_gate(0, HADAMARD)
    state = circuit.simulate()
    expected = np.array([1, 1]) / np.sqrt(2)
    np.testing.assert_array_almost_equal(state, expected)


def test_pauli_x_flips_qubit():
    """Test Pauli-X gate flips |0⟩ to |1⟩."""
    circuit = QuantumCircuit(1)
    circuit.add_gate(0, PAULI_X)
    state = circuit.simulate()
    expected = np.array([0, 1])
    np.testing.assert_array_almost_equal(state, expected)


def test_cnot_creates_entanglement():
    """Test CNOT gate creates Bell state."""
    circuit = QuantumCircuit(2)
    circuit.add_gate(0, HADAMARD)
    circuit.add_layer()
    circuit.add_gate(0, CNOT)
    
    state = circuit.simulate()
    probs = circuit.get_probabilities()
    
    # Should have 50% |00⟩ and 50% |11⟩
    assert abs(probs[0] - 0.5) < 0.01
    assert abs(probs[3] - 0.5) < 0.01


def test_get_gate():
    """Test gate registry lookup."""
    assert get_gate('X') == PAULI_X
    assert get_gate('H') == HADAMARD
    assert get_gate('invalid') is None


def test_rotation_gate():
    """Test rotation gate creation."""
    rx = rotation_gate('X', np.pi/2)
    assert rx.name == 'RX'
    assert rx.num_qubits == 1


def test_measurement():
    """Test circuit measurement."""
    circuit = QuantumCircuit(1)
    circuit.add_gate(0, HADAMARD)
    
    counts = circuit.measure(shots=1000)
    assert len(counts) == 2
    # Should be roughly 50/50
    assert 400 < counts[0] < 600
    assert 400 < counts[1] < 600


if __name__ == "__main__":
    pytest.main([__file__, "-v"])