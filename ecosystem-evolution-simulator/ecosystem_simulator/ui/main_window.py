"""Main application window for ecosystem evolution simulator."""

from PyQt6.QtWidgets import (
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QSlider,
    QLabel,
    QDockWidget,
)
from PyQt6.QtCore import Qt, QTimer
from ..core.ecosystem import Ecosystem
from ..core.simulation import SimulationEngine
from .population_chart import PopulationChart
from .genetic_tree import GeneticLineageTree


class MainWindow(QMainWindow):
    """Main window with population chart and genetic tree visualization."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Ecosystem Evolution Simulator")
        self.resize(1200, 800)

        # Initialize ecosystem and simulation
        self.ecosystem = Ecosystem()
        self.simulation = SimulationEngine(self.ecosystem)

        # Setup UI
        self._setup_ui()
        self._setup_simulation()

    def _setup_ui(self):
        """Create the main UI layout."""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)

        # Top: Population chart
        self.population_chart = PopulationChart()
        layout.addWidget(self.population_chart, 2)

        # Bottom: Genetic lineage tree
        self.genetic_tree = GeneticLineageTree()
        layout.addWidget(self.genetic_tree, 1)

        # Control dock
        self._create_control_dock()

    def _create_control_dock(self):
        """Create the control panel dock widget."""
        dock = QDockWidget("Controls", self)
        dock.setAllowedAreas(Qt.DockWidgetArea.RightDockWidgetArea | Qt.DockWidgetArea.LeftDockWidgetArea)

        control_widget = QWidget()
        control_layout = QVBoxLayout(control_widget)

        # Speed control
        control_layout.addWidget(QLabel("Simulation Speed"))
        self.speed_slider = QSlider(Qt.Orientation.Horizontal)
        self.speed_slider.setRange(1, 100)
        self.speed_slider.setValue(50)
        control_layout.addWidget(self.speed_slider)

        # Control buttons
        self.play_button = QPushButton("Play")
        self.play_button.clicked.connect(self._toggle_simulation)
        control_layout.addWidget(self.play_button)

        self.step_button = QPushButton("Step")
        self.step_button.clicked.connect(self._step_simulation)
        control_layout.addWidget(self.step_button)

        control_layout.addStretch()

        dock.setWidget(control_widget)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, dock)

    def _setup_simulation(self):
        """Setup simulation timer and initial state."""
        self.timer = QTimer()
        self.timer.timeout.connect(self._update_simulation)
        self.timer.start(100)  # 10 FPS UI updates

        # Add initial species
        from ..core.species import Species, Trait
        herbivore = Species(
            name="Herbivore",
            population=50,
            carrying_capacity=200,
        )
        herbivore.add_trait(Trait("speed", 0.5, 0.0, 1.0))
        herbivore.add_trait(Trait("metabolism", 0.7, 0.1, 1.0))
        self.ecosystem.add_species(herbivore)

        carnivore = Species(
            name="Carnivore",
            population=20,
            carrying_capacity=100,
        )
        carnivore.add_trait(Trait("speed", 0.8, 0.0, 1.0))
        carnivore.add_trait(Trait("metabolism", 0.9, 0.1, 1.0))
        carnivore.prey = ["Herbivore"]
        self.ecosystem.add_species(carnivore)

    def _toggle_simulation(self):
        """Toggle simulation play/pause."""
        if self.simulation.running:
            self.simulation.stop()
            self.play_button.setText("Play")
        else:
            self.simulation.start()
            self.play_button.setText("Pause")

    def _step_simulation(self):
        """Advance simulation by one step."""
        self.simulation.step()
        self._update_ui()

    def _update_simulation(self):
        """Update simulation and UI."""
        self.simulation.step(0.1)
        self._update_ui()

    def _update_ui(self):
        """Update all visualizations."""
        self.population_chart.update_data(self.ecosystem.get_population_data())
        self.genetic_tree.update_tree(self.ecosystem.get_genetic_tree())
        self.statusBar().showMessage(
            f"Time: {self.ecosystem.time:.1f} | Species: {len(self.ecosystem.species)}"
        )