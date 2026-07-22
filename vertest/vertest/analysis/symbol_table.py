from dataclasses import dataclass, field
from typing import Optional

from vertest.analysis.types import (
    FunctionInfo,
    SourceUnit,
    VariableInfo,
)


@dataclass
class FunctionSymbol:
    name: str
    return_type: str
    parameters: list
    is_defined: bool
    is_static: bool
    is_extern: bool
    file_path: str
    line: int


@dataclass
class VariableSymbol:
    name: str
    type_name: str
    is_global: bool
    is_static: bool
    is_extern: bool
    file_path: str
    line: int


@dataclass
class TypeSymbol:
    name: str
    definition: str
    file_path: str


class SymbolTable:
    """Aggregates all symbols across parsed source units."""

    def __init__(self):
        self.functions: dict[str, list[FunctionSymbol]] = {}
        self.globals: dict[str, VariableSymbol] = {}
        self.types: dict[str, TypeSymbol] = {}

    def add_units(self, units: list[SourceUnit]):
        for unit in units:
            for func in unit.functions:
                sym = FunctionSymbol(
                    name=func.name,
                    return_type=func.return_type,
                    parameters=func.parameters,
                    is_defined=True,
                    is_static=func.is_static,
                    is_extern=func.is_extern,
                    file_path=unit.file_path,
                    line=func.line,
                )
                self.functions.setdefault(func.name, []).append(sym)
            for var in unit.globals:
                vsym = VariableSymbol(
                    name=var.name,
                    type_name=var.type_name,
                    is_global=var.is_global,
                    is_static=var.is_static,
                    is_extern=var.is_extern,
                    file_path=unit.file_path,
                    line=var.line,
                )
                self.globals[var.name] = vsym

    def is_function_defined(self, name: str) -> bool:
        return name in self.functions

    def find_function(self, name: str) -> Optional[FunctionSymbol]:
        entries = self.functions.get(name)
        if entries:
            return entries[0]
        return None

    def find_global(self, name: str) -> Optional[VariableSymbol]:
        return self.globals.get(name)

    def all_function_names(self) -> set[str]:
        return set(self.functions.keys())

    def external_calls(self, unit: SourceUnit) -> set[str]:
        defined = self.all_function_names()
        externals: set[str] = set()
        for func in unit.functions:
            for call in func.calls:
                if call not in defined:
                    externals.add(call)
        return externals
