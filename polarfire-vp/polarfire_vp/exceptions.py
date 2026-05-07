"""Common exceptions used across the virtual platform."""


class PolarFireVPError(Exception):
    """Base exception for the project."""


class ConfigurationError(PolarFireVPError):
    """Raised when a board description is invalid."""


class MemoryAccessError(PolarFireVPError):
    """Raised when code accesses an invalid or protected region."""


class CpuExecutionError(PolarFireVPError):
    """Raised when the CPU backend cannot execute an instruction."""


class DebugProtocolError(PolarFireVPError):
    """Raised for malformed remote-debug traffic."""
