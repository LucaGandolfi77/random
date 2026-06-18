"""Quantum circuit representation and simulation."""

import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from .gates import QuantumGate, get_gate


@dataclass
class CircuitLayer:
    """Represents a layer of gates in the circuit."""
    gates: List[Tuple[int, QuantumGate]] = field(default_factory=list)
    
    def add_gate(self, qubit: int, gate: QuantumGate):
        """Add a gate to this layer."""
        self.gates.append((qubit, gate))


@dataclass
class QuantumCircuit:
    """Represents a quantum circuit with multiple qubits."""
    num_qubits: int
    layers: List[CircuitLayer] = field(default_factory=list)
    qubits: List[int] = field(default_factory=list)
    
    def __post_init__(self):
        self.qubits = list(range(self.num_qubits))
    
    def add_layer(self) -> CircuitLayer:
        """Add a new empty layer to the circuit."""
        layer = CircuitLayer()
        self.layers.append(layer)
        return layer
    
    def add_gate(self, qubit: int, gate: QuantumGate):
        """Add a gate to the circuit (creates new layer if needed)."""
        if not self.layers:
            self.add_layer()
        self.layers[-1].add_gate(qubit, gate)
    
    def add_gate_at(self, layer_idx: int, qubit: int, gate: QuantumGate):
        """Add a gate at a specific layer, creating empty layers if needed."""
        while len(self.layers) <= layer_idx:
            self.add_layer()
        self.layers[layer_idx].add_gate(qubit, gate)
    
    def add_gate_by_name(self, qubit: int, gate_name: str):
        """Add a gate by name to the circuit."""
        gate = get_gate(gate_name)
        if gate:
            self.add_gate(qubit, gate)
    
    def remove_gate(self, layer_idx: int, qubit: int):
        """Remove a gate from a specific layer and qubit if present."""
        if 0 <= layer_idx < len(self.layers):
            self.layers[layer_idx].gates = [
                (gate_qubit, gate)
                for gate_qubit, gate in self.layers[layer_idx].gates
                if gate_qubit != qubit
            ]
            if not self.layers[layer_idx].gates:
                self.layers.pop(layer_idx)
    
    def simulate(self) -> np.ndarray:
        """Simulate the circuit and return final state vector."""
        # Start with |0...0⟩ state
        state = np.zeros(2 ** self.num_qubits, dtype=complex)
        state[0] = 1.0
        
        for layer in self.layers:
            for qubit, gate in layer.gates:
                state = self._apply_gate(state, gate, qubit)
        
        return state
    
    def _apply_gate(self, state: np.ndarray, gate: QuantumGate, target_qubit: int) -> np.ndarray:
        """Apply a gate to the state vector."""
        if gate.num_qubits == 1:
            return self._apply_single_qubit_gate(state, gate, target_qubit)
        elif gate.num_qubits == 2:
            return self._apply_two_qubit_gate(state, gate, target_qubit)
        return state
    
    def _apply_single_qubit_gate(self, state: np.ndarray, gate: QuantumGate, target_qubit: int) -> np.ndarray:
        """Apply a single-qubit gate."""
        result = np.zeros_like(state)
        for i, amp in enumerate(state):
            # Get the bit at target position
            bit = (i >> target_qubit) & 1
            # Get the other bits
            mask = ((1 << target_qubit) - 1)
            other_bits = i & mask
            upper_bits = i >> (target_qubit + 1)
            
            # Apply gate matrix
            for j in range(2):
                new_bit = j
                new_amp = gate.matrix[j, bit] * amp
                # Reconstruct the index
                new_index = (upper_bits << (target_qubit + 1)) | (new_bit << target_qubit) | other_bits
                result[new_index] += new_amp
        
        return result
    
    def _apply_two_qubit_gate(self, state: np.ndarray, gate: QuantumGate, control_qubit: int) -> np.ndarray:
        """Apply a two-qubit gate (control on control_qubit, target on control_qubit+1)."""
        target_qubit = control_qubit + 1
        result = np.zeros_like(state)
        
        for i, amp in enumerate(state):
            # Get the two bits
            bits = ((i >> control_qubit) & 1) * 2 + ((i >> target_qubit) & 1)
            # Get the other bits
            upper_bits = i >> (target_qubit + 1)
            lower_mask = (1 << target_qubit) - 1
            other_bits = i & lower_mask
            
            # Apply gate matrix
            for j in range(4):
                new_bits = j
                new_amp = gate.matrix[j, bits] * amp
                # Reconstruct the index
                new_index = (upper_bits << (target_qubit + 1)) | (new_bits << control_qubit) | other_bits
                result[new_index] += new_amp
        
        return result
    
    def get_probabilities(self) -> np.ndarray:
        """Get measurement probabilities for each basis state."""
        state = self.simulate()
        return np.abs(state) ** 2
    
    def measure(self, shots: int = 1024) -> List[int]:
        """Simulate measurements and return counts."""
        probs = self.get_probabilities()
        outcomes = np.random.choice(len(probs), size=shots, p=probs)
        counts = {}
        for outcome in outcomes:
            counts[outcome] = counts.get(outcome, 0) + 1
        return [counts.get(i, 0) for i in range(len(probs))]
    
    def clear(self):
        """Clear all gates from the circuit."""
        self.layers.clear()
    
    def __len__(self) -> int:
        """Return number of layers."""
        return len(self.layers)