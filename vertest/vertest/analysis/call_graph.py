from typing import Optional

from vertest.analysis.symbol_table import SymbolTable
from vertest.analysis.types import SourceUnit


class CallGraph:
    """Builds a directed call graph from parsed source units.
    Nodes are function names; edges represent 'calls' relationships."""

    def __init__(self, symbol_table: SymbolTable):
        self.symbol_table = symbol_table
        self.graph: dict[str, set[str]] = {}
        self._built = False

    def build(self, units: list[SourceUnit]):
        self.graph.clear()
        for unit in units:
            for func in unit.functions:
                if func.name not in self.graph:
                    self.graph[func.name] = set()
                for callee in func.calls:
                    self.graph[func.name].add(callee)
        self._built = True

    def callers_of(self, function_name: str) -> set[str]:
        return {fn for fn, callees in self.graph.items() if function_name in callees}

    def callees_of(self, function_name: str) -> set[str]:
        return self.graph.get(function_name, set())

    def external_dependencies(self, function_name: str) -> set[str]:
        defined = self.symbol_table.all_function_names()
        callees = self.callees_of(function_name)
        return {c for c in callees if c not in defined}

    def fan_in(self, function_name: str) -> int:
        return len(self.callers_of(function_name))

    def fan_out(self, function_name: str) -> int:
        return len(self.callees_of(function_name))

    def to_dot(self) -> str:
        lines = ["digraph CallGraph {"]
        for caller, callees in self.graph.items():
            for callee in callees:
                lines.append(f'  "{caller}" -> "{callee}";')
        lines.append("}")
        return "\n".join(lines)
