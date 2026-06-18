"""Genetic lineage tree visualization using NetworkX and matplotlib."""

from PyQt6.QtWidgets import QWidget, QVBoxLayout
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
from matplotlib.figure import Figure
import networkx as nx
from typing import Dict


class GeneticLineageTree(QWidget):
    """Interactive genetic lineage tree using NetworkX."""

    def __init__(self):
        super().__init__()
        self.graph: nx.DiGraph = nx.DiGraph()

        # Create matplotlib figure
        self.figure = Figure(figsize=(5, 3), dpi=100)
        self.canvas = FigureCanvasQTAgg(self.figure)
        self.axes = self.figure.add_subplot(111)

        layout = QVBoxLayout()
        layout.addWidget(self.canvas)
        self.setLayout(layout)

    def update_tree(self, tree_data: Dict) -> None:
        """Update tree visualization with new genetic data."""
        self.graph.clear()

        # Add nodes
        for node in tree_data.get("nodes", []):
            self.graph.add_node(
                node["id"],
                label=node["label"],
                generation=node.get("generation", 0),
                population=node.get("population", 0),
            )

        # Add edges
        for edge in tree_data.get("edges", []):
            self.graph.add_edge(edge["source"], edge["target"], weight=edge.get("weight", 1.0))

        # Draw
        self.axes.clear()
        if self.graph.number_of_nodes() > 0:
            pos = nx.spring_layout(self.graph, seed=42)
            labels = nx.get_node_attributes(self.graph, "label")

            # Color nodes by generation
            generations = [self.graph.nodes[n].get("generation", 0) for n in self.graph.nodes()]
            if generations:
                max_gen = max(generations)
                colors = [gen / max(max_gen, 1) for gen in generations]
            else:
                colors = [0.5] * len(self.graph.nodes())

            nx.draw(
                self.graph,
                pos,
                ax=self.axes,
                labels=labels,
                node_color=colors,
                cmap="viridis",
                with_labels=True,
                node_size=500,
                font_size=8,
            )

        self.axes.set_title("Genetic Lineage Tree")
        self.axes.axis("off")
        self.canvas.draw()