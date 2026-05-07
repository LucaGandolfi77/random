"""Peripheral models."""

from .base import Peripheral
from .block import BlockDevicePeripheral
from .boot import BootControllerPeripheral
from .clint import CoreLocalInterruptController
from .demo_irq import DemoIrqPeripheral
from .gpio import GPIOPeripheral
from .interrupts import SimpleInterruptController
from .stub import StubPeripheral
from .timer import TimerPeripheral
from .uart import UARTPeripheral

__all__ = [
    "BlockDevicePeripheral",
    "BootControllerPeripheral",
    "CoreLocalInterruptController",
    "DemoIrqPeripheral",
    "GPIOPeripheral",
    "Peripheral",
    "SimpleInterruptController",
    "StubPeripheral",
    "TimerPeripheral",
    "UARTPeripheral",
]
