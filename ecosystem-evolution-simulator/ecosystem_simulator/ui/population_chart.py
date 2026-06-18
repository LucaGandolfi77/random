"""Population chart widget using matplotlib for real-time visualization."""

from PyQt6.QtWidgets import QWidget, QVBoxLayout
from PyQt6.QtCore import Qt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
from matplotlib.figure import Figure
from typing import Dict


class PopulationChart(QWidget):
    """Live updating population chart using matplotlib."""

    def __init__(self):
        super().__init__()
        self.history: Dict[str, list] = {}
        self.max_points = 500

        # Create matplotlib figure
        self.figure = Figure(figsize=(5, 3), dpi=100)
        self.canvas = FigureCanvasQTAgg(self.figure)
        self.axes = self.figure.add_subplot(111)

        layout = QVBoxLayout()
        layout.addWidget(self.canvas)
        self.setLayout(layout)

    def update_data(self, population_data: Dict[str, int]) -> None:
        """Update chart with new population data."""
        # Store history
        for species, pop in population_data.items():
            if species not in self.history:
                self.history[species] = []
            self.history[species].append(pop)
            if len(self.history[species]) > self.max_points:
                self.history[species].pop(0)

        # Clear and redraw
        self.axes.clear()
        for species, values in self.history.items():
            self.axes.plot(values, label=species)

        self.axes.set_xlabel("Time Step")
        self.axes.set_ylabel("Population")
        self.axes.set_title("Population Dynamics")
        self.axes.legend(loc="upper right")
        self.axes.grid(True, alpha=0.3)

        self.canvas.draw()