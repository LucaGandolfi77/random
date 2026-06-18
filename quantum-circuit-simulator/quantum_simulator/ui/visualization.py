"""Pygame visualization for quantum circuits."""

import pygame
import numpy as np
from typing import Optional, Tuple, List
from ..core.circuit import QuantumCircuit, CircuitLayer
from ..core.gates import QuantumGate


class QuantumCircuitVisualizer:
    """Visualizes quantum circuits using Pygame."""
    
    # Colors
    BACKGROUND = (20, 20, 30)
    GRID = (40, 40, 50)
    QUBIT_LINE = (80, 80, 100)
    GATE_BG = (50, 50, 60)
    TEXT = (240, 240, 250)
    STATE_BG = (30, 30, 40)
    
    def __init__(self, circuit: QuantumCircuit, width: int = 1000, height: int = 600):
        self.circuit = circuit
        self.width = width
        self.height = height
        self.cell_size = 60
        self.margin_left = 100
        self.margin_top = 50
        self.margin_bottom = 100
        
        # State display
        self.state_amps: Optional[np.ndarray] = None
        self.show_state = True
        self.gate_rects = []
        
        # Animation
        self.animation_progress = 0.0
        self.animating = False
        
    def draw(self, surface: pygame.Surface):
        """Draw the circuit visualization."""
        # Update dimensions based on surface
        self.width = surface.get_width()
        self.height = surface.get_height()
        self.gate_rects.clear()
        
        surface.fill(self.BACKGROUND)
        
        # Draw grid background
        self._draw_grid(surface)
        
        # Draw qubit lines
        self._draw_qubit_lines(surface)
        
        # Draw gates
        self._draw_gates(surface)
        
        # Draw state vector
        if self.show_state:
            self._draw_state_vector(surface)
    
    def _draw_grid(self, surface: pygame.Surface):
        """Draw the grid background."""
        for x in range(0, self.width, self.cell_size):
            pygame.draw.line(surface, self.GRID, (x, 0), (x, self.height), 1)
        
        for y in range(0, self.height - self.margin_bottom, self.cell_size):
            pygame.draw.line(surface, self.GRID, (0, y), (self.width, y), 1)
    
    def _draw_qubit_lines(self, surface: pygame.Surface):
        """Draw horizontal qubit lines."""
        for i in range(self.circuit.num_qubits):
            y = self.margin_top + i * self.cell_size
            pygame.draw.line(
                surface, 
                self.QUBIT_LINE, 
                (self.margin_left, y), 
                (self.width, y), 
                2
            )
            
            # Draw qubit label
            font = pygame.font.Font(None, 28)
            text = font.render(f"q{i}", True, self.TEXT)
            surface.blit(text, (10, y - 10))
    
    def _draw_gates(self, surface: pygame.Surface):
        """Draw all gates in the circuit."""
        font = pygame.font.Font(None, 36)
        
        for layer_idx, layer in enumerate(self.circuit.layers):
            x = self.margin_left + layer_idx * self.cell_size
            
            for qubit, gate in layer.gates:
                y = self.margin_top + qubit * self.cell_size
                
                # Draw gate box
                rect = pygame.Rect(
                    x - self.cell_size // 2 + 5,
                    y - self.cell_size // 2 + 5,
                    self.cell_size - 10,
                    self.cell_size - 10
                )
                self.gate_rects.append((rect, layer_idx, qubit))
                pygame.draw.rect(surface, gate.color, rect, border_radius=5)
                pygame.draw.rect(surface, self.GATE_BG, rect, 2, border_radius=5)
                
                # Draw gate symbol
                symbol = font.render(gate.symbol, True, (20, 20, 20))
                symbol_rect = symbol.get_rect(center=rect.center)
                surface.blit(symbol, symbol_rect)
    
    def _draw_state_vector(self, surface: pygame.Surface):
        """Draw the quantum state vector visualization."""
        if self.state_amps is None:
            self.state_amps = self.circuit.simulate()
        
        # State vector display area
        state_height = self.margin_bottom - 20
        state_y = self.height - state_height
        
        # Background
        pygame.draw.rect(surface, self.STATE_BG, (0, state_y, self.width, state_height))
        
        # Draw bars for each basis state
        num_states = len(self.state_amps)
        bar_width = (self.width - 20) // num_states
        
        max_amp = max(np.abs(self.state_amps)) if len(self.state_amps) > 0 else 1
        
        for i, amp in enumerate(self.state_amps):
            prob = np.abs(amp) ** 2
            phase = np.angle(amp)
            
            # Height based on probability
            height = int(prob * max_amp * state_height * 0.8)
            
            # Color based on phase
            hue = int((phase + np.pi) / (2 * np.pi) * 255)
            color = (hue, 200, 255 - hue // 2)
            
            x = 10 + i * bar_width
            y = state_y + state_height - height
            
            pygame.draw.rect(surface, color, (x, y, bar_width - 2, height))
            
            # Draw state label
            font = pygame.font.Font(None, 20)
            label = font.render(f"|{i:0{self.circuit.num_qubits}b}⟩", True, self.TEXT)
            label_rect = label.get_rect(center=(x + bar_width // 2, state_y + state_height - 5))
            surface.blit(label, label_rect)
    
    def update_state(self):
        """Update the state vector for visualization."""
        self.state_amps = self.circuit.simulate()
    
    def toggle_state_display(self):
        """Toggle the state vector display."""
        self.show_state = not self.show_state
    
    def handle_click(self, pos: Tuple[int, int]) -> Optional[Tuple[int, int]]:
        """Handle mouse click to add gate. Returns (layer_idx, qubit) or None."""
        x, y = pos
        
        if x < self.margin_left or y < self.margin_top:
            return None
        
        layer_idx = (x - self.margin_left) // self.cell_size
        qubit = (y - self.margin_top) // self.cell_size
        
        if 0 <= qubit < self.circuit.num_qubits:
            return (layer_idx, qubit)
        return None
    
    def get_bounds(self) -> Tuple[int, int]:
        """Get the required surface bounds."""
        width = self.margin_left + len(self.circuit) * self.cell_size + 100
        height = self.height
        return (width, height)