"""Main Pygame application for quantum circuit simulator."""

import pygame
import sys
import json
import math
import copy
import numpy as np
from typing import Optional, List, Tuple, Dict, Any
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog
except ImportError:
    tk = None
    filedialog = None

from ..core.circuit import QuantumCircuit
from ..core.gates import get_all_gates, get_gate, QuantumGate
from .visualization import QuantumCircuitVisualizer


class QuantumCircuitApp:
    """Main application class for the quantum circuit simulator."""
    
    def __init__(self, num_qubits: int = 2):
        pygame.init()
        
        self.controls_height = 120
        self.circuit = QuantumCircuit(num_qubits)
        self.visualizer = QuantumCircuitVisualizer(self.circuit)
        self.visualizer.margin_bottom = max(self.visualizer.margin_bottom, self.controls_height + 20)
        
        # Calculate window size
        width, height = self.visualizer.get_bounds()
        width = max(width, 980)
        height = max(height, 700)
        self.screen = pygame.display.set_mode((width, height), pygame.RESIZABLE)
        pygame.display.set_caption("Quantum Circuit Simulator")
        
        self._base_width = width
        self._base_height = height
        
        self.clock = pygame.time.Clock()
        self.running = True
        
        # UI state
        self.selected_gate: Optional[QuantumGate] = None
        self.gates = get_all_gates()
        self.selected_gate = self.gates[4] if len(self.gates) > 4 else None
        self.show_controls = True
        self.shots_options = [128, 1024, 4096, 16384]
        self.shots_index = 1
        self.shots = self.shots_options[self.shots_index]
        self.results: List[str] = []
        self.status_message = "Ready"
        self.undo_stack: List[QuantumCircuit] = []
        self.redo_stack: List[QuantumCircuit] = []
        self.dragging_gate = False
        self.drag_gate: Optional[QuantumGate] = None
        self.drag_pos: Optional[Tuple[int, int]] = None
        self.hovered_gate_name = ""
        self.hovered_circuit_gate: Optional[Tuple[int, int]] = None
        self.hovered_control_gate: Optional[QuantumGate] = None
        self.selected_bloch_qubit = 0
        self.bloch_panel = pygame.Rect(420, 10, 190, 190)
        self.bloch_dragging = False
        self.bloch_drag_offset = pygame.Vector2(0, 0)
        self.bloch_center = pygame.Vector2(self.bloch_panel.centerx, self.bloch_panel.centery)
        self.bloch_radius = 70
        self.results_panel = pygame.Rect(10, 10, 380, 240)
        self.results_dragging = False
        self.results_drag_offset = pygame.Vector2(0, 0)
        self.gate_button_rects: List[pygame.Rect] = []
        self.action_button_rects: Dict[str, pygame.Rect] = {}
        self.shot_button_rects: List[pygame.Rect] = []
        self.preset_button_rects: List[pygame.Rect] = []
        self.preset_names = ["Bell", "GHZ", "Teleport", "Phase Kickback"]
        self.export_path = Path("circuit_export.json")
        self.load_path = Path("circuit_export.json")
        
        # Button geometry
        self._update_button_positions()
        self.show_results_panel = False
        self._update_button_positions()
        
        # Font cache
        self.font = pygame.font.Font(None, 28)
        self.small_font = pygame.font.Font(None, 20)
        self.button_font = pygame.font.Font(None, 24)
    
    def run(self):
        """Run the main application loop."""
        while self.running:
            self._handle_events()
            self.visualizer.update_state()
            self.visualizer.draw(self.screen)
            self._draw_bloch_sphere()
            self._draw_results_panel()
            self._draw_status()
            self._draw_controls()
            self._draw_hover_tooltip()
            pygame.display.flip()
            self.clock.tick(60)
        
        pygame.quit()
        sys.exit()
    
    def _handle_events(self):
        """Handle pygame events."""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            
            elif event.type == pygame.VIDEORESIZE:
                self.screen = pygame.display.set_mode((event.w, event.h), pygame.RESIZABLE)
                self._update_button_positions()
            
            elif event.type == pygame.KEYDOWN:
                self._handle_key(event.key)
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    self._handle_mouse_click(event.pos)
                elif event.button == 3:
                    self._handle_right_click(event.pos)
            
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1:
                    self._handle_mouse_up(event.pos)
            
            elif event.type == pygame.MOUSEMOTION:
                self._handle_mouse_motion(event.pos)
    
    def _handle_key(self, key: int):
        """Handle keyboard input."""
        if key == pygame.K_ESCAPE:
            self.running = False
        elif key == pygame.K_SPACE:
            self._push_undo()
            self.circuit.clear()
            self.results = []
            self.show_results_panel = False
            self.status_message = "Circuit cleared"
        elif key == pygame.K_s:
            self.visualizer.toggle_state_display()
        elif key == pygame.K_r:
            self.show_results_panel = not self.show_results_panel
        elif key == pygame.K_RETURN:
            self._simulate_circuit()
            self.show_results_panel = True
        elif key == pygame.K_z and pygame.key.get_mods() & pygame.KMOD_CTRL:
            self._undo()
        elif key == pygame.K_y and pygame.key.get_mods() & pygame.KMOD_CTRL:
            self._redo()
        elif key == pygame.K_q:
            self._cycle_bloch_qubit(-1)
        elif key == pygame.K_w:
            self._cycle_bloch_qubit(1)
        elif key == pygame.K_e:
            self._export_circuit()
        elif key == pygame.K_l:
            self._load_circuit()
        elif key == pygame.K_PLUS or key == pygame.K_KP_PLUS:
            self._add_qubit()
        elif key == pygame.K_MINUS or key == pygame.K_KP_MINUS:
            self._remove_qubit()
    
    def _handle_mouse_click(self, pos):
        """Handle mouse click to select gates and run actions."""
        if self._start_panel_drag(pos):
            return
        
        if self._handle_action_click(pos):
            return
        
        if self._handle_preset_click(pos):
            return
        
        if self._handle_shot_click(pos):
            return
        
        if self.bloch_panel.collidepoint(pos):
            self._cycle_bloch_qubit(1)
            return
        
        gate = self._get_gate_from_controls(pos)
        if gate:
            self.selected_gate = gate
            self.dragging_gate = True
            self.drag_gate = gate
            self.drag_pos = pos
            self.status_message = f"Drag {gate.name} to the circuit, or release to select"
            return
        
        self._handle_circuit_click(pos)
    
    def _handle_mouse_up(self, pos):
        """Handle left mouse release."""
        if self.results_dragging:
            self._clamp_panel(self.results_panel)
            self.results_dragging = False
            return
        
        if self.bloch_dragging:
            self._clamp_panel(self.bloch_panel)
            self.bloch_dragging = False
            return
        
        if self.dragging_gate and self.drag_gate:
            result = self.visualizer.handle_click(pos)
            if result:
                layer_idx, qubit = result
                self._push_undo()
                self.circuit.add_gate_at(layer_idx, qubit, self.drag_gate)
                self.selected_gate = self.drag_gate
                self.results = []
                self.show_results_panel = False
                self.status_message = f"Placed {self.drag_gate.name} at layer {layer_idx}, q{qubit}"
            else:
                self.status_message = f"Selected {self.drag_gate.name}"
        
        self.dragging_gate = False
        self.drag_gate = None
        self.drag_pos = None
    
    def _handle_mouse_motion(self, pos):
        """Handle mouse movement and draggable panels."""
        if self.results_dragging:
            self.results_panel.x = pos[0] - self.results_drag_offset.x
            self.results_panel.y = pos[1] - self.results_drag_offset.y
            return
        
        if self.bloch_dragging:
            self.bloch_panel.x = pos[0] - self.bloch_drag_offset.x
            self.bloch_panel.y = pos[1] - self.bloch_drag_offset.y
            self.bloch_center = pygame.Vector2(self.bloch_panel.centerx, self.bloch_panel.centery)
            return
        
        self._update_hover(pos)
    
    def _start_panel_drag(self, pos) -> bool:
        """Start dragging a floating panel from its title bar."""
        if self.results_panel.collidepoint(pos):
            self.results_dragging = True
            self.results_drag_offset = pygame.Vector2(pos[0] - self.results_panel.x, pos[1] - self.results_panel.y)
            self.status_message = "Dragging results panel"
            return True
        
        if self.bloch_panel.collidepoint(pos):
            self.bloch_dragging = True
            self.bloch_drag_offset = pygame.Vector2(pos[0] - self.bloch_panel.x, pos[1] - self.bloch_panel.y)
            self.status_message = "Dragging Bloch sphere panel"
            return True
        
        return False
    
    def _clamp_panel(self, rect: pygame.Rect):
        """Keep a draggable panel inside the window."""
        rect.x = max(0, min(rect.x, self.screen.get_width() - rect.width))
        rect.y = max(0, min(rect.y, self.screen.get_height() - rect.height - self.controls_height))
    
    def _handle_right_click(self, pos):
        """Handle right mouse click to delete a gate."""
        gate_location = self._get_gate_at_position(pos)
        if gate_location:
            layer_idx, qubit = gate_location
            self._push_undo()
            self.circuit.remove_gate(layer_idx, qubit)
            self.results = []
            self.show_results_panel = False
            self.status_message = f"Removed gate at layer {layer_idx}, q{qubit}"
    
    def _handle_action_click(self, pos) -> bool:
        """Handle clicks on action buttons."""
        if self.simulate_button.collidepoint(pos):
            self._simulate_circuit()
            self.show_results_panel = True
            return True
        
        if self.results_button.collidepoint(pos):
            self.show_results_panel = not self.show_results_panel
            return True
        
        if self.action_button_rects.get("UNDO").collidepoint(pos):
            self._undo()
            return True
        
        if self.action_button_rects.get("REDO").collidepoint(pos):
            self._redo()
            return True
        
        if self.action_button_rects.get("EXPORT").collidepoint(pos):
            self._export_circuit()
            return True
        
        if self.action_button_rects.get("LOAD").collidepoint(pos):
            self._load_circuit()
            return True
        
        return False
    
    def _handle_shot_click(self, pos) -> bool:
        """Handle shot-count button clicks."""
        for i, rect in enumerate(self.shot_button_rects):
            if rect.collidepoint(pos):
                self.shots_index = i
                self.shots = self.shots_options[i]
                self.status_message = f"Shots set to {self.shots}"
                return True
        return False
    
    def _handle_preset_click(self, pos) -> bool:
        """Handle preset button clicks."""
        for i, rect in enumerate(self.preset_button_rects):
            if rect.collidepoint(pos):
                self._load_preset(self.preset_names[i])
                return True
        return False
    
    def _handle_circuit_click(self, pos):
        """Handle mouse click to place gates."""
        result = self.visualizer.handle_click(pos)
        if result and self.selected_gate:
            layer_idx, qubit = result
            
            # Ensure we have enough layers
            while len(self.circuit.layers) <= layer_idx:
                self.circuit.add_layer()
            
            self._push_undo()
            self.circuit.add_gate(qubit, self.selected_gate)
            self.results = []
            self.show_results_panel = False
            self.status_message = f"Placed {self.selected_gate.name} at layer {layer_idx}, q{qubit}"
    
    def _get_gate_at_position(self, pos) -> Optional[Tuple[int, int]]:
        """Return circuit gate location under mouse position."""
        for rect, layer_idx, qubit in self.visualizer.gate_rects:
            if rect.collidepoint(pos):
                return (layer_idx, qubit)
        return None
    
    def _simulate_circuit(self):
        """Run circuit simulation and store readable results."""
        probs = self.circuit.get_probabilities()
        counts = self.circuit.measure(self.shots)
        
        self.results = []
        self.results.append(f"Qubits: {self.circuit.num_qubits} | Layers: {len(self.circuit)} | Shots: {self.shots}")
        self.results.append("")
        
        for i, (prob, count) in enumerate(zip(probs, counts)):
            state = format(i, f"0{self.circuit.num_qubits}b")
            self.results.append(f"|{state}⟩  {prob:.2%}  ({count}/{self.shots})")
        
        self.results.append("")
        self.results.append("Most likely: " + self.results[2] if len(self.results) > 2 else "Most likely: -")
        self.status_message = f"Simulation complete with {self.shots} shots"
    
    def _add_qubit(self):
        """Add a qubit to the circuit."""
        self._push_undo()
        self.circuit.num_qubits += 1
        self.circuit.qubits.append(self.circuit.num_qubits - 1)
        self.visualizer = QuantumCircuitVisualizer(self.circuit)
        self.visualizer.margin_bottom = max(self.visualizer.margin_bottom, self.controls_height + 20)
        self.status_message = f"Added qubit q{self.circuit.num_qubits - 1}"
    
    def _remove_qubit(self):
        """Remove a qubit from the circuit."""
        if self.circuit.num_qubits > 1:
            self._push_undo()
            self.circuit.num_qubits -= 1
            self.circuit.qubits.pop()
            self.visualizer = QuantumCircuitVisualizer(self.circuit)
            self.visualizer.margin_bottom = max(self.visualizer.margin_bottom, self.controls_height + 20)
            self.selected_bloch_qubit = min(self.selected_bloch_qubit, self.circuit.num_qubits - 1)
            self.status_message = f"Removed qubit q{self.circuit.num_qubits}"
    
    def _push_undo(self):
        """Save current circuit state for undo."""
        self.undo_stack.append(copy.deepcopy(self.circuit))
        if len(self.undo_stack) > 50:
            self.undo_stack.pop(0)
        self.redo_stack.clear()
    
    def _undo(self):
        """Undo the last circuit change."""
        if not self.undo_stack:
            self.status_message = "Nothing to undo"
            return
        
        self.redo_stack.append(copy.deepcopy(self.circuit))
        self.circuit = self.undo_stack.pop()
        self.visualizer = QuantumCircuitVisualizer(self.circuit)
        self.visualizer.margin_bottom = max(self.visualizer.margin_bottom, self.controls_height + 20)
        self.results = []
        self.show_results_panel = False
        self.status_message = "Undo"
    
    def _redo(self):
        """Redo the last undone circuit change."""
        if not self.redo_stack:
            self.status_message = "Nothing to redo"
            return
        
        self.undo_stack.append(copy.deepcopy(self.circuit))
        self.circuit = self.redo_stack.pop()
        self.visualizer = QuantumCircuitVisualizer(self.circuit)
        self.visualizer.margin_bottom = max(self.visualizer.margin_bottom, self.controls_height + 20)
        self.results = []
        self.show_results_panel = False
        self.status_message = "Redo"
    
    def _update_button_positions(self):
        """Recalculate control button positions after resize."""
        y = self.screen.get_height() - self.controls_height + 10
        x = 10
        self.gate_button_rects = []
        for _ in self.gates[:8]:
            self.gate_button_rects.append(pygame.Rect(x, y, 50, 50))
            x += 60
        
        action_x = x + 10
        self.simulate_button = pygame.Rect(action_x, y, 90, 50)
        self.results_button = pygame.Rect(self.simulate_button.right + 8, y, 90, 50)
        self.action_button_rects = {
            "UNDO": pygame.Rect(self.results_button.right + 8, y, 55, 50),
            "REDO": pygame.Rect(self.results_button.right + 71, y, 55, 50),
            "EXPORT": pygame.Rect(self.results_button.right + 134, y, 70, 50),
            "LOAD": pygame.Rect(self.results_button.right + 212, y, 55, 50),
        }
        
        # Shot buttons
        shot_y = y + 58
        shot_x = 10
        self.shot_button_rects = []
        for _ in self.shots_options:
            self.shot_button_rects.append(pygame.Rect(shot_x, shot_y, 70, 28))
            shot_x += 80
        
        # Preset buttons
        preset_y = y + 58
        preset_x = 340
        self.preset_button_rects = []
        for name in self.preset_names:
            width = 100 if name != "Phase Kickback" else 140
            self.preset_button_rects.append(pygame.Rect(preset_x, preset_y, width, 28))
            preset_x += width + 8
    
    def _draw_results_panel(self):
        """Draw the simulation results panel."""
        pygame.draw.rect(self.screen, (35, 35, 45), self.results_panel, border_radius=8)
        pygame.draw.rect(self.screen, (120, 120, 140), self.results_panel, 2, border_radius=8)
        
        # Title bar for dragging
        title_bar = pygame.Rect(self.results_panel.x, self.results_panel.y, self.results_panel.width, 28)
        pygame.draw.rect(self.screen, (55, 55, 70), title_bar, border_radius=8)
        pygame.draw.rect(self.screen, (120, 120, 140), title_bar, 2, border_radius=8)
        
        title = self.font.render("Simulation Results", True, (240, 240, 250))
        self.screen.blit(title, (self.results_panel.x + 12, self.results_panel.y + 6))
        
        if not self.show_results_panel or not self.results:
            placeholder = self.small_font.render("Click SIMULATE or press Enter", True, (200, 200, 200))
            self.screen.blit(placeholder, (self.results_panel.x + 12, self.results_panel.y + 42))
            return
        
        for i, line in enumerate(self.results[:9]):
            text = self.small_font.render(line[:62], True, (240, 240, 250))
            self.screen.blit(text, (self.results_panel.x + 12, self.results_panel.y + 42 + i * 22))
    
    def _draw_status(self):
        """Draw status message."""
        text = self.small_font.render(self.status_message, True, (220, 220, 230))
        self.screen.blit(text, (10, self.screen.get_height() - 48))
    
    def _draw_controls(self):
        """Draw the control panel."""
        if not self.show_controls:
            return
        
        # Controls background
        pygame.draw.rect(
            self.screen, 
            (40, 40, 50), 
            (0, self.screen.get_height() - self.controls_height, self.screen.get_width(), self.controls_height)
        )
        
        # Gate selection buttons
        for i, gate in enumerate(self.gates[:8]):
            rect = self.gate_button_rects[i]
            color = gate.color if self.selected_gate != gate else (255, 255, 100)
            if self.hovered_control_gate == gate:
                color = (255, 220, 100)
            pygame.draw.rect(self.screen, color, rect, border_radius=5)
            pygame.draw.rect(self.screen, (200, 200, 200), rect, 2, border_radius=5)
            
            symbol = self.font.render(gate.symbol, True, (20, 20, 20))
            symbol_rect = symbol.get_rect(center=rect.center)
            self.screen.blit(symbol, symbol_rect)
        
        # Action buttons
        self._draw_action_button("SIMULATE", self.simulate_button, (80, 200, 120))
        self._draw_action_button("RESULTS", self.results_button, (120, 160, 220))
        self._draw_action_button("UNDO", self.action_button_rects["UNDO"], (200, 120, 120))
        self._draw_action_button("REDO", self.action_button_rects["REDO"], (200, 120, 120))
        self._draw_action_button("EXPORT", self.action_button_rects["EXPORT"], (180, 160, 220))
        self._draw_action_button("LOAD", self.action_button_rects["LOAD"], (180, 160, 220))
        
        # Shot count buttons
        shot_label = self.small_font.render("Shots:", True, (240, 240, 250))
        self.screen.blit(shot_label, (10, self.screen.get_height() - 54))
        for i, rect in enumerate(self.shot_button_rects):
            color = (255, 220, 100) if i == self.shots_index else (70, 70, 90)
            pygame.draw.rect(self.screen, color, rect, border_radius=4)
            pygame.draw.rect(self.screen, (200, 200, 200), rect, 1, border_radius=4)
            text = self.small_font.render(str(self.shots_options[i]), True, (240, 240, 250))
            text_rect = text.get_rect(center=rect.center)
            self.screen.blit(text, text_rect)
        
        # Preset buttons
        preset_label = self.small_font.render("Presets:", True, (240, 240, 250))
        self.screen.blit(preset_label, (340, self.screen.get_height() - 54))
        for i, rect in enumerate(self.preset_button_rects):
            color = (120, 160, 220)
            pygame.draw.rect(self.screen, color, rect, border_radius=4)
            pygame.draw.rect(self.screen, (200, 200, 200), rect, 1, border_radius=4)
            text = self.small_font.render(self.preset_names[i], True, (240, 240, 250))
            text_rect = text.get_rect(center=rect.center)
            self.screen.blit(text, text_rect)
        
        # Instructions
        instr = self.small_font.render(
            "Ctrl+Z undo | Ctrl+Y redo | Right-click gate to delete | E export | L load",
            True, (200, 200, 200)
        )
        self.screen.blit(instr, (10, self.screen.get_height() - 25))
    
    def _draw_action_button(self, label: str, rect: pygame.Rect, color: Tuple[int, int, int]):
        """Draw a generic action button."""
        pygame.draw.rect(self.screen, color, rect, border_radius=8)
        pygame.draw.rect(self.screen, (220, 220, 220), rect, 2, border_radius=8)
        text = self.button_font.render(label, True, (20, 20, 20))
        text_rect = text.get_rect(center=rect.center)
        self.screen.blit(text, text_rect)
    
    def _update_hover(self, pos):
        """Update hover state for tooltips."""
        self.hovered_control_gate = self._get_gate_from_controls(pos)
        self.hovered_gate_name = self.hovered_control_gate.name if self.hovered_control_gate else ""
        self.hovered_circuit_gate = self._get_gate_at_position(pos)
    
    def _draw_hover_tooltip(self):
        """Draw tooltip for hovered gate."""
        tooltip = ""
        if self.hovered_control_gate:
            tooltip = f"{self.hovered_control_gate.name}: {self.hovered_control_gate.description}"
        elif self.hovered_circuit_gate:
            layer_idx, qubit = self.hovered_circuit_gate
            gate = self._get_gate_from_circuit(layer_idx, qubit)
            if gate:
                tooltip = f"Layer {layer_idx}, q{qubit}: {gate.name}"
        
        if not tooltip:
            return
        
        pos = pygame.mouse.get_pos()
        surface = self.small_font.render(tooltip, True, (20, 20, 20))
        padding = 8
        rect = pygame.Rect(pos[0] + 15, pos[1] + 15, surface.get_width() + padding * 2, surface.get_height() + padding * 2)
        if rect.right > self.screen.get_width():
            rect.x = self.screen.get_width() - rect.width - 10
        if rect.bottom > self.screen.get_height():
            rect.y = self.screen.get_height() - rect.height - 10
        
        pygame.draw.rect(self.screen, (240, 240, 220), rect, border_radius=5)
        pygame.draw.rect(self.screen, (20, 20, 20), rect, 2, border_radius=5)
        self.screen.blit(surface, (rect.x + padding, rect.y + padding))
    
    def _draw_bloch_sphere(self):
        """Draw Bloch sphere for selected qubit."""
        rect = self.bloch_panel
        pygame.draw.rect(self.screen, (35, 35, 45), rect, border_radius=8)
        pygame.draw.rect(self.screen, (120, 120, 140), rect, 2, border_radius=8)
        
        # Title bar for dragging
        title_bar = pygame.Rect(rect.x, rect.y, rect.width, 28)
        pygame.draw.rect(self.screen, (55, 55, 70), title_bar, border_radius=8)
        pygame.draw.rect(self.screen, (120, 120, 140), title_bar, 2, border_radius=8)
        
        title = self.small_font.render(f"Bloch q{self.selected_bloch_qubit}", True, (240, 240, 250))
        self.screen.blit(title, (rect.x + 10, rect.y + 6))
        
        center = pygame.Vector2(rect.centerx, rect.y + 90)
        radius = 58
        pygame.draw.circle(self.screen, (240, 240, 250), (int(center.x), int(center.y)), radius, 2)
        pygame.draw.line(self.screen, (100, 100, 120), (center.x - radius, center.y), (center.x + radius, center.y), 1)
        pygame.draw.line(self.screen, (100, 100, 120), (center.x, center.y - radius), (center.x, center.y + radius), 1)
        
        # Axis labels
        self.screen.blit(self.small_font.render("+Z", True, (240, 240, 250)), (center.x + 5, center.y - radius - 18))
        self.screen.blit(self.small_font.render("+X", True, (240, 240, 250)), (center.x + radius + 8, center.y - 8))
        
        vector = self._get_bloch_vector(self.selected_bloch_qubit)
        if vector is not None:
            end = center + vector * radius
            pygame.draw.line(self.screen, (80, 220, 255), (int(center.x), int(center.y)), (int(end.x), int(end.y)), 3)
            pygame.draw.circle(self.screen, (80, 220, 255), (int(end.x), int(end.y)), 5)
    
    def _get_bloch_vector(self, qubit: int) -> Optional[pygame.Vector2]:
        """Get 2D Bloch vector for a qubit."""
        density = self._get_reduced_density_matrix(qubit)
        if density is None:
            return None
        
        x = float(2 * np.real(density[0, 1]))
        z = float(np.real(density[0, 0] - density[1, 1]))
        return pygame.Vector2(x, -z)
    
    def _get_reduced_density_matrix(self, target_qubit: int) -> Optional[np.ndarray]:
        """Compute reduced 2x2 density matrix for one qubit."""
        try:
            state = self.circuit.simulate()
        except Exception:
            return None
        
        n = self.circuit.num_qubits
        if n <= 0 or target_qubit < 0 or target_qubit >= n:
            return None
        
        rho = np.zeros((2, 2), dtype=complex)
        dim = len(state)
        for i in range(dim):
            for j in range(dim):
                bit_i = (i >> target_qubit) & 1
                bit_j = (j >> target_qubit) & 1
                if bit_i != bit_j:
                    continue
                
                match = True
                for q in range(n):
                    if q == target_qubit:
                        continue
                    if ((i >> q) & 1) != ((j >> q) & 1):
                        match = False
                        break
                if match:
                    rho[bit_i, bit_j] += state[i] * np.conj(state[j])
        
        return rho
    
    def _cycle_bloch_qubit(self, delta: int):
        """Cycle selected qubit for Bloch sphere."""
        if self.circuit.num_qubits > 0:
            self.selected_bloch_qubit = (self.selected_bloch_qubit + delta) % self.circuit.num_qubits
            self.status_message = f"Bloch view: q{self.selected_bloch_qubit}"
    
    def _get_gate_from_controls(self, pos):
        """Return the gate clicked in the controls panel, if any."""
        x, y = pos
        
        # Controls area at bottom of window
        if y < self.screen.get_height() - self.controls_height:
            return None
        
        for i, rect in enumerate(self.gate_button_rects):
            if rect.collidepoint(x, y):
                return self.gates[i]
        
        return None
    
    def _get_gate_from_circuit(self, layer_idx: int, qubit: int) -> Optional[QuantumGate]:
        """Return a gate at a circuit location."""
        if 0 <= layer_idx < len(self.circuit.layers):
            for gate_qubit, gate in self.circuit.layers[layer_idx].gates:
                if gate_qubit == qubit:
                    return gate
        return None
    
    def _export_circuit(self):
        """Export circuit to JSON."""
        path = self.export_path
        if filedialog is not None:
            root = tk.Tk()
            root.withdraw()
            path = Path(filedialog.asksaveasfilename(
                defaultextension=".json",
                initialfile="circuit_export.json",
                filetypes=[("JSON files", "*.json")]
            ))
            root.destroy()
        
        if not str(path):
            self.status_message = "Export cancelled"
            return
        
        data = self._serialize_circuit()
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        self.export_path = path
        self.status_message = f"Exported circuit to {path.name}"
    
    def _load_circuit(self):
        """Load circuit from JSON."""
        path = self.load_path
        if filedialog is not None:
            root = tk.Tk()
            root.withdraw()
            chosen = filedialog.askopenfilename(
                defaultextension=".json",
                initialfile="circuit_export.json",
                filetypes=[("JSON files", "*.json")]
            )
            root.destroy()
            if chosen:
                path = Path(chosen)
        
        if not path.exists():
            self.status_message = "No circuit file found"
            return
        
        try:
            self._push_undo()
            self._deserialize_circuit(json.loads(path.read_text(encoding="utf-8")))
            self.load_path = path
            self.results = []
            self.show_results_panel = False
            self.status_message = f"Loaded circuit from {path.name}"
        except Exception as exc:
            self.status_message = f"Load failed: {exc}"
    
    def _serialize_circuit(self) -> Dict[str, Any]:
        """Serialize circuit to JSON-compatible dict."""
        return {
            "num_qubits": self.circuit.num_qubits,
            "layers": [
                [
                    {"qubit": qubit, "gate": gate.name}
                    for qubit, gate in layer.gates
                ]
                for layer in self.circuit.layers
            ]
        }
    
    def _deserialize_circuit(self, data: Dict[str, Any]):
        """Deserialize circuit from JSON-compatible dict."""
        num_qubits = int(data.get("num_qubits", 2))
        self.circuit = QuantumCircuit(num_qubits)
        self.visualizer = QuantumCircuitVisualizer(self.circuit)
        self.visualizer.margin_bottom = max(self.visualizer.margin_bottom, self.controls_height + 20)
        self.selected_bloch_qubit = min(self.selected_bloch_qubit, self.circuit.num_qubits - 1)
        
        for layer_data in data.get("layers", []):
            layer = self.circuit.add_layer()
            for item in layer_data:
                gate = get_gate(item["gate"])
                if gate:
                    layer.add_gate(int(item["qubit"]), gate)
    
    def _load_preset(self, name: str):
        """Load a predefined circuit preset."""
        self._push_undo()
        
        if name == "Bell":
            self.circuit = QuantumCircuit(2)
            self.circuit.add_gate(0, get_gate("H"))
            self.circuit.add_layer()
            self.circuit.add_gate(0, get_gate("CNOT"))
        elif name == "GHZ":
            self.circuit = QuantumCircuit(3)
            self.circuit.add_gate(0, get_gate("H"))
            self.circuit.add_layer()
            self.circuit.add_gate(0, get_gate("CNOT"))
            self.circuit.add_gate(1, get_gate("CNOT"))
        elif name == "Teleport":
            self.circuit = QuantumCircuit(3)
            self.circuit.add_gate(0, get_gate("X"))
            self.circuit.add_layer()
            self.circuit.add_gate(1, get_gate("H"))
            self.circuit.add_gate(1, get_gate("CNOT"))
            self.circuit.add_layer()
            self.circuit.add_gate(0, get_gate("CNOT"))
            self.circuit.add_gate(1, get_gate("H"))
        elif name == "Phase Kickback":
            self.circuit = QuantumCircuit(2)
            self.circuit.add_gate(1, get_gate("X"))
            self.circuit.add_gate(1, get_gate("H"))
            self.circuit.add_layer()
            self.circuit.add_gate(0, get_gate("H"))
            self.circuit.add_gate(0, get_gate("CNOT"))
            self.circuit.add_layer()
            self.circuit.add_gate(0, get_gate("H"))
        else:
            self.circuit = QuantumCircuit(2)
        
        self.visualizer = QuantumCircuitVisualizer(self.circuit)
        self.visualizer.margin_bottom = max(self.visualizer.margin_bottom, self.controls_height + 20)
        self.results = []
        self.show_results_panel = False
        self.status_message = f"Loaded preset: {name}"


def main():
    """Entry point for the application."""
    app = QuantumCircuitApp(num_qubits=2)
    app.run()


if __name__ == "__main__":
    main()