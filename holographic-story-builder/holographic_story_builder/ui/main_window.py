"""
Main Window - Qt6 application main window
"""
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QTextEdit, QListWidget, QSplitter,
    QMenuBar, QMenu, QToolBar, QStatusBar
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QAction


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Holographic Story Builder")
        self.resize(1200, 800)
        self.setup_ui()

    def setup_ui(self):
        """Create main UI layout"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        main_layout = QHBoxLayout(central_widget)

        # Left panel - Story nodes list
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_layout.addWidget(QPushButton("Add Node"))
        left_layout.addWidget(QPushButton("Remove Node"))
        self.node_list = QListWidget()
        left_layout.addWidget(self.node_list)

        # Center panel - 3D viewport placeholder
        center_panel = QWidget()
        center_layout = QVBoxLayout(center_panel)
        center_layout.addWidget(QPushButton("3D Viewport (Panda3D Embedded)"))
        self.dialogue_display = QTextEdit()
        self.dialogue_display.setReadOnly(True)
        center_layout.addWidget(self.dialogue_display)

        # Right panel - Character editor
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.addWidget(QPushButton("Character Editor"))
        right_layout.addWidget(QPushButton("Emotion Controls"))

        # Splitter for resizable panels
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(left_panel)
        splitter.addWidget(center_panel)
        splitter.addWidget(right_panel)
        splitter.setSizes([200, 600, 200])

        main_layout.addWidget(splitter)

        # Menu bar
        self.setup_menu()

        # Status bar
        self.setStatusBar(QStatusBar())
        self.statusBar().showMessage("Ready")

    def setup_menu(self):
        """Create menu bar"""
        menubar = QMenuBar()
        self.setMenuBar(menubar)

        file_menu = menubar.addMenu("File")
        file_menu.addAction(QAction("New Story", self))
        file_menu.addAction(QAction("Load Story", self))
        file_menu.addAction(QAction("Save Story", self))
        file_menu.addSeparator()
        file_menu.addAction(QAction("Exit", self))

        edit_menu = menubar.addMenu("Edit")
        edit_menu.addAction(QAction("Preferences", self))

        view_menu = menubar.addMenu("View")
        view_menu.addAction(QAction("Toggle Dark Mode", self))