from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional

from vertest.target.cross_compile import TargetConfig


class MplabxProjectGenerator:
    """Generates MPLAB X IDE project files (.X directory structure)
    that contain the VeriTest harness, ready to build and simulate."""

    def __init__(self, output_dir: Path, target: TargetConfig):
        self.output_dir = output_dir
        self.target = target
        self.nbproject_dir = output_dir / "nbproject"

    def generate(self, harness_files: list[str], project_name: str = "vertest_test") -> Path:
        self.nbproject_dir.mkdir(parents=True, exist_ok=True)

        self._write_project_xml(project_name)
        self._write_configuration_xml()
        self._write_configuration_xml_debug()
        self._write_makefile_impl()
        self._write_project_properties()

        return self.output_dir

    def _write_project_xml(self, name: str):
        root = ET.Element("project", {"xmlns": "http://www.netbeans.org/ns/project/1"})
        root[:] = []

        # nbproject-project
        proj = ET.SubElement(root, "nbproject-project")
        proj_data = ET.SubElement(proj, "project-data")
        proj_name = ET.SubElement(proj_data, "project-name")
        proj_name.text = name
        proj_dir = ET.SubElement(proj_data, "project-dir")
        proj_dir.text = "."

        ET.ElementTree(root).write(
            str(self.nbproject_dir / "project.xml"),
            encoding="utf-8", xml_declaration=True,
        )

    def _write_configuration_xml(self):
        root = ET.Element("configurationDescriptor", {"version": "62"})
        logic = ET.SubElement(root, "logicalFolder", {"name": "root"})
        ET.SubElement(logic, "logicalFolder", {"name": "HeaderFiles"})
        ET.SubElement(logic, "logicalFolder", {"name": "LinkerScript"})

        source_folder = ET.SubElement(logic, "logicalFolder", {"name": "SourceFiles"})
        item = ET.SubElement(source_folder, "itemPath")
        item.text = "vertest_harness.c"

        ET.ElementTree(root).write(
            str(self.nbproject_dir / "configurations.xml"),
            encoding="utf-8", xml_declaration=True,
        )

    def _write_configuration_xml_debug(self):
        root = ET.Element("configurationDescriptor", {"version": "62"})
        conf = ET.SubElement(root, "conf", {
            "name": "default",
            "type": str(self._map_compiler_type()),
        })

        # Device selection
        device = ET.SubElement(conf, "device")
        device.text = self.target.mplabx_device

        # Compiler toolchain selection
        tools = ET.SubElement(conf, "toolsSet")
        dep = ET.SubElement(tools, "dependency")
        dep.set("from", "org.eclipse.cdt.managedbuilder.core.managedBuilder")
        ET.SubElement(tools, "toolchain", {
            "name": self.target.mplabx_compiler,
            "command": self.target.compiler,
        })

        # Pack selection
        pack = ET.SubElement(conf, "pack")
        pack.set("name", self.target.mplabx_pack)
        pack.set("version", "latest")

        # Simulator configuration
        sim = ET.SubElement(conf, "simulator")
        sim.set("name", "mplab_simulator")

        # UART configuration for test output
        uart = ET.SubElement(conf, "uart")
        uart.set("enabled", "true")
        uart.set("channel", "1")
        uart.set("baud", "115200")

        # Debugger
        dbg = ET.SubElement(conf, "debugger")
        dbg.set("name", "simulator")

        ET.ElementTree(root).write(
            str(self.nbproject_dir / "configurations.debug.xml"),
            encoding="utf-8", xml_declaration=True,
        )

    def _write_makefile_impl(self):
        content = f"""#
# Auto-generated MPLAB X Makefile by VeriTest
# Target: {self.target.name} ({self.target.mplabx_device})
#
.PHONY: all clean

CC = {self.target.compiler}
CFLAGS = {' '.join(self.target.cflags)}
LDFLAGS = {' '.join(self.target.linker_flags)}
TARGET = vertest_test.elf

SRCS = vertest_harness.c

all: $(TARGET)

$(TARGET): $(SRCS)
\t$(CC) $(CFLAGS) $(SRCS) -o $@ $(LDFLAGS)

clean:
\trm -f $(TARGET) *.o *.hex *.map

sim:
\tmplabx --simulator $(TARGET)

debug:
\tmplabx --debugger $(TARGET)
"""
        (self.nbproject_dir / "Makefile-impl.mk").write_text(content)

    def _write_project_properties(self):
        content = f"""#
# Auto-generated MPLAB X project properties by VeriTest
#
includeNb=true
projectType=app
conf.name=default
conf.device={self.target.mplabx_device}
conf.compiler={self.target.mplabx_compiler}
conf.pack={self.target.mplabx_pack}
conf.simulator=mplab_simulator
conf.debugger=simulator
"""
        (self.nbproject_dir / "project.properties").write_text(content)

    @staticmethod
    def _map_compiler_type() -> int:
        return 8  # XC32 type in MPLAB X
