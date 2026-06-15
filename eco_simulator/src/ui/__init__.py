"""UI package for eco_simulator.

This package provides very small placeholder implementations of the UI
components required by ``main.py``.  The real project would contain a full
feature‑rich board and dashboard, but for the purpose of getting the
application to start we only need the classes to exist and expose the
methods that ``main.py`` calls.

The classes are deliberately lightweight – they draw a plain background
and expose ``draw``, ``handle_event`` and ``update_plot`` methods that do
nothing more than keep the program running without raising errors.
"""

# Export the public classes so they can be imported as
# ``from ui.board import IslandBoard`` etc.
from .board import IslandBoard  # noqa: F401
from .dashboard import LiveDashboard  # noqa: F401
