from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Parameter:
    name: str = ""
    type_name: str = ""
    is_pointer: bool = False
    is_array: bool = False


@dataclass
class FunctionInfo:
    name: str = ""
    return_type: str = ""
    parameters: list[Parameter] = field(default_factory=list)
    is_static: bool = False
    is_extern: bool = False
    file_path: str = ""
    line: int = 0
    body_start_line: int = 0
    body_end_line: int = 0
    calls: list[str] = field(default_factory=list)
    calls_detail: list["CallSite"] = field(default_factory=list)


@dataclass
class CallSite:
    function_name: str = ""
    line: int = 0
    is_external: bool = False


@dataclass
class VariableInfo:
    name: str = ""
    type_name: str = ""
    is_global: bool = False
    is_static: bool = False
    is_extern: bool = False
    file_path: str = ""
    line: int = 0


@dataclass
class IncludeInfo:
    path: str = ""
    is_system: bool = False
    line: int = 0


@dataclass
class SourceUnit:
    file_path: str
    functions: list[FunctionInfo] = field(default_factory=list)
    globals: list[VariableInfo] = field(default_factory=list)
    includes: list[IncludeInfo] = field(default_factory=list)
    typedefs: list[str] = field(default_factory=list)
    structs: list[str] = field(default_factory=list)
