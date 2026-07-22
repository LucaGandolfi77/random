import os
from pathlib import Path

import tree_sitter_c as tsc
import tree_sitter_cpp as tscpp
from tree_sitter import Language, Parser, Node

from vertest.analysis.types import (
    CallSite,
    FunctionInfo,
    IncludeInfo,
    Parameter,
    SourceUnit,
    VariableInfo,
)

C_LANGUAGE = Language(tsc.language())
CPP_LANGUAGE = Language(tscpp.language())
EXTENSION_MAP: dict[str, Language] = {
    ".c": C_LANGUAGE,
    ".h": C_LANGUAGE,
    ".cpp": CPP_LANGUAGE,
    ".cxx": CPP_LANGUAGE,
    ".cc": CPP_LANGUAGE,
    ".hpp": CPP_LANGUAGE,
    ".hxx": CPP_LANGUAGE,
}


class SourceParser:
    """Parses C/C++ source files using tree-sitter and extracts
    a structured representation (SourceUnit) containing all
    functions, globals, includes, and call sites."""

    def __init__(self, source_root: str | Path = "."):
        self.source_root = Path(source_root).resolve()
        self._parsers: dict[str, Parser] = {}

    def _get_parser(self, file_path: str) -> Parser:
        ext = Path(file_path).suffix.lower()
        lang = EXTENSION_MAP.get(ext, C_LANGUAGE)
        if lang not in self._parsers:
            p = Parser(lang)
            self._parsers[lang] = p
        return self._parsers[lang]

    def parse_file(self, file_path: str | Path) -> SourceUnit | None:
        file_path = str(Path(file_path).resolve())
        if not os.path.isfile(file_path):
            return None
        with open(file_path, "rb") as f:
            code = f.read()
        parser = self._get_parser(file_path)
        tree = parser.parse(code)
        unit = SourceUnit(file_path=file_path)
        self._visit(tree.root_node, unit, code)
        return unit

    def parse_project(self, source_root: str | Path | None = None) -> list[SourceUnit]:
        root = Path(source_root) if source_root else self.source_root
        units: list[SourceUnit] = []
        for ext in EXTENSION_MAP:
            for fpath in root.rglob(f"*{ext}"):
                if not self._is_source(str(fpath)):
                    continue
                unit = self.parse_file(fpath)
                if unit:
                    units.append(unit)
        return units

    @staticmethod
    def _is_source(path: str) -> bool:
        base = os.path.basename(path)
        return not base.startswith(".") and not base.startswith("_test")

    def _visit(self, node: Node, unit: SourceUnit, code: bytes):
        for child in node.children:
            self._visit_node(child, unit, code)

    def _visit_node(self, node: Node, unit: SourceUnit, code: bytes):
        match node.type:
            case "function_definition":
                self._extract_function(node, unit, code)
            case "declaration":
                self._extract_declaration(node, unit, code)
            case "preproc_include":
                self._extract_include(node, unit, code)
            case "type_definition":
                self._extract_typedef(node, unit, code)
            case "struct_specifier":
                self._extract_struct(node, unit, code)

        for child in node.children:
            self._visit_node(child, unit, code)

    def _extract_function(self, node: Node, unit: SourceUnit, code: bytes):
        func = FunctionInfo(file_path=unit.file_path, line=node.start_point[0] + 1)
        func.body_start_line = node.end_point[0] + 1
        func.body_end_line = node.end_point[0] + 1

        for child in node.children:
            if child.type == "primitive_type" or child.type == "type_identifier" or child.type == "sized_type_specifier":
                func.return_type = self._node_text(child, code)
            elif child.type == "function_declarator":
                self._extract_function_declarator(child, func, code)
            elif child.type == "compound_statement":
                func.body_start_line = child.start_point[0] + 1
                func.body_end_line = child.end_point[0] + 1
                self._extract_calls(child, func, code)

        unit.functions.append(func)

    def _extract_function_declarator(self, node: Node, func: FunctionInfo, code: bytes):
        for child in node.children:
            if child.type == "identifier":
                func.name = self._node_text(child, code)
            elif child.type == "parameter_list":
                self._extract_parameters(child, func, code)

    def _extract_parameters(self, node: Node, func: FunctionInfo, code: bytes):
        for child in node.children:
            if child.type == "parameter_declaration":
                param = Parameter(name="", type_name="")
                for pchild in child.children:
                    if pchild.type in ("primitive_type", "type_identifier", "sized_type_specifier"):
                        param.type_name = self._node_text(pchild, code)
                        decl = child
                        for sibling in child.children:
                            if sibling.type == "pointer_declarator":
                                param.is_pointer = True
                            elif sibling.type == "array_declarator":
                                param.is_array = True
                    elif pchild.type == "identifier":
                        param.name = self._node_text(pchild, code)
                    elif pchild.type == "pointer_declarator":
                        param.is_pointer = True
                        for pp in pchild.children:
                            if pp.type == "identifier":
                                param.name = self._node_text(pp, code)
                    elif pchild.type == "array_declarator":
                        param.is_array = True
                        for pp in pchild.children:
                            if pp.type == "identifier":
                                param.name = self._node_text(pp, code)
                if param.type_name != "void" or param.name:
                    func.parameters.append(param)

    def _extract_calls(self, node: Node, func: FunctionInfo, code: bytes):
        for child in node.children:
            self._extract_calls(child, func, code)
            if child.type == "call_expression":
                call_name = self._get_call_name(child, code)
                if call_name:
                    cs = CallSite(
                        function_name=call_name,
                        line=child.start_point[0] + 1,
                        is_external=True,
                    )
                    func.calls.append(call_name)
                    func.calls_detail.append(cs)

    @staticmethod
    def _get_call_name(node: Node, code: bytes) -> str | None:
        for child in node.children:
            if child.type == "identifier":
                return SourceParser._node_text(child, code)
            if child.type == "field_expression":
                return SourceParser._node_text(child, code)
        return None

    def _extract_declaration(self, node: Node, unit: SourceUnit, code: bytes):
        var = VariableInfo(file_path=unit.file_path, line=node.start_point[0] + 1)
        is_global = not self._is_inside_function(node)
        var.is_global = is_global

        for child in node.children:
            if child.type in ("primitive_type", "type_identifier", "sized_type_specifier"):
                var.type_name = self._node_text(child, code)
            elif child.type in ("init_declarator", "identifier"):
                if child.type == "identifier":
                    var.name = self._node_text(child, code)
                else:
                    for dc in child.children:
                        if dc.type == "identifier":
                            var.name = self._node_text(dc, code)

        if var.name and is_global:
            unit.globals.append(var)

    def _extract_include(self, node: Node, unit: SourceUnit, code: bytes):
        inc = IncludeInfo(line=node.start_point[0] + 1)
        for child in node.children:
            if child.type == "string_literal":
                inc.path = self._node_text(child, code).strip('"')
                inc.is_system = False
            elif child.type == "system_lib_string":
                inc.path = self._node_text(child, code)
                inc.is_system = True
        unit.includes.append(inc)

    def _extract_typedef(self, node: Node, unit: SourceUnit, code: bytes):
        unit.typedefs.append(self._node_text(node, code))

    def _extract_struct(self, node: Node, unit: SourceUnit, code: bytes):
        unit.structs.append(self._node_text(node, code))

    @staticmethod
    def _is_inside_function(node: Node) -> bool:
        parent = node.parent
        while parent:
            if parent.type == "function_definition":
                return True
            parent = parent.parent
        return False

    @staticmethod
    def _node_text(node: Node, code: bytes) -> str:
        return code[node.start_byte:node.end_byte].decode("utf-8", errors="replace")
