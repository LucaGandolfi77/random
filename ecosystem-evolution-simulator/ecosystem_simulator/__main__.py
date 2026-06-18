#!/usr/bin/env python3
"""Allow running as module: python -m ecosystem_simulator"""

import sys
from .main import main

if __name__ == "__main__":
    sys.exit(main())