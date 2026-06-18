#!/usr/bin/env python3
"""Main entry point for Ecosystem Evolution Simulator."""

import sys
from PyQt6.QtWidgets import QApplication
from .ui.main_window import MainWindow


def main():
    """Start the ecosystem evolution simulator."""
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())