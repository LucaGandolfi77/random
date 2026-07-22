from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich.tree import Tree

from vertest import __version__
from vertest.analysis.parser import SourceParser
from vertest.analysis.symbol_table import SymbolTable
from vertest.analysis.call_graph import CallGraph
from vertest.harness.stub_gen import StubGenerator
from vertest.harness.driver_gen import TestDriverGenerator
from vertest.test.executor import TestExecutor
from vertest.test.model import TestCase, TestStatus
from vertest.test.result import ResultParser
from vertest.test.regression import RegressionManager
from vertest.coverage.analyzer import CoverageAnalyzer
from vertest.coverage.report import CoverageReport
from vertest.util.compiler import detect_compiler
from vertest.target.cross_compile import TARGETS, list_available_targets, list_all_targets

console = Console()


@click.group()
@click.version_option(version=__version__, prog_name="vertest")
def cli():
    """VeriTest - VectorCAST-inspired unit testing platform for C/C++

    Automates test harness generation, stub/mock creation, test execution,
    code coverage analysis, and requirements traceability.
    """
    pass


@cli.command()
@click.argument("path", type=click.Path(exists=True), default=".")
@click.option("--recursive", "-r", is_flag=True, default=False, help="Scan recursively")
@click.option("--json", "-j", "json_output", is_flag=True, help="Output as JSON")
def analyze(path, recursive, json_output):
    """Parse C/C++ source files and display function information."""
    parser = SourceParser()
    path_obj = Path(path)
    if path_obj.is_file():
        units = [parser.parse_file(str(path_obj))]
    elif recursive:
        units = parser.parse_project(path_obj)
    else:
        units = []
        for p in sorted(path_obj.iterdir()):
            if p.suffix in (".c", ".cpp", ".cxx", ".cc", ".h", ".hpp"):
                u = parser.parse_file(str(p))
                if u:
                    units.append(u)

    if json_output:
        output = []
        for unit in units:
            for func in unit.functions:
                output.append({
                    "file": unit.file_path,
                    "function": func.name,
                    "return_type": func.return_type,
                    "params": [(p.name, p.type_name) for p in func.parameters],
                    "calls": func.calls,
                    "line": func.line,
                })
        console.print_json(data=output)
    else:
        table = Table(title="Analyzed Functions", title_style="bold cyan")
        table.add_column("Function", style="bold green")
        table.add_column("Return Type", style="yellow")
        table.add_column("Parameters", style="white")
        table.add_column("Calls", style="blue")
        table.add_column("File", style="dim")
        table.add_column("Line")

        for unit in units:
            for func in unit.functions:
                params = ", ".join(
                    f"{p.type_name} {'*' if p.is_pointer else ''}{p.name}"
                    for p in func.parameters
                ) or "void"
                calls = ", ".join(sorted(set(func.calls))) or "none"
                table.add_row(
                    func.name,
                    func.return_type or "void",
                    params,
                    calls,
                    os.path.relpath(unit.file_path),
                    str(func.line),
                )

        console.print(table)

        # Show external dependencies
        sym_table = SymbolTable()
        sym_table.add_units(units)
        all_ext = set()
        for unit in units:
            all_ext.update(sym_table.external_calls(unit))
        if all_ext:
            console.print(f"\n[bold]External Dependencies:[/bold] {', '.join(sorted(all_ext))}")


@cli.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--function", "-f", required=True, help="Function to generate harness for")
@click.option("--output", "-o", default="./vertest_output", help="Output directory")
@click.option("--compiler", "-c", default=None, help="Compiler to use")
@click.option("--run", is_flag=True, help="Compile and run after generation")
def harness(source, function, output, compiler, run):
    """Generate a test harness for the specified function.

    SOURCE is the C/C++ source file containing the function under test.
    """
    output_dir = Path(output)
    output_dir.mkdir(parents=True, exist_ok=True)

    parser = SourceParser()
    unit = parser.parse_file(source)
    if not unit:
        console.print(f"[red]Error:[/red] Could not parse {source}")
        sys.exit(1)

    sym_table = SymbolTable()
    sym_table.add_units([unit])

    # Find the target function
    func_info = None
    for f in unit.functions:
        if f.name == function:
            func_info = f
            break

    if not func_info:
        console.print(f"[red]Error:[/red] Function '{function}' not found in {source}")
        sys.exit(1)

    # Identify external dependencies (functions to stub)
    external_calls = sym_table.external_calls(unit)

    console.print(f"[bold]Target:[/bold] {function}")
    console.print(f"[bold]External deps:[/bold] {', '.join(sorted(external_calls)) or 'none'}")

    # Generate stubs
    stub_info_list = []
    if external_calls:
        for call_name in external_calls:
            sf = type("StubFunc", (), {
                "name": call_name,
                "return_type": "int",
                "parameters": [],
                "is_static": False, "is_extern": True,
                "file_path": "", "line": 0,
                "calls": [], "calls_detail": [],
                "body_start_line": 0, "body_end_line": 0,
            })()
            stub_info_list.append(sf)
        stub_gen = StubGenerator(output_dir)
        stub_gen.generate(stub_info_list)
        console.print(f"[green]Generated stubs for:[/green] {', '.join(sorted(external_calls))}")

    # Generate test driver with default test case
    default_case = {
        "name": f"test_{function}_default",
        "args": {},
        "expected": {},
        "stubs": {name: [0] for name in external_calls},
    }

    driver_gen = TestDriverGenerator(output_dir)
    driver_path = driver_gen.generate(unit, function, [default_case], stub_info_list)
    console.print(f"[green]Generated test driver:[/green] {driver_path}")

    if run:
        executor = TestExecutor(
            build_dir=output_dir / "build",
            compiler=compiler or detect_compiler(),
        )
        test_cases = [
            TestCase(
                name=f"test_{function}_default",
                function_name=function,
                stubs={name: [0] for name in external_calls},
            )
        ]
        run_result = executor.execute_suite(unit, function, test_cases, stub_info_list)
        for r in run_result.results:
            status_icon = "[green]PASS[/green]" if r.status == TestStatus.PASSED else "[red]FAIL[/red]"
            console.print(f"  {status_icon} {r.test_name}: {r.message}")
        console.print(f"\n[bold]Results:[/bold] {run_result.passed_count()} passed, {run_result.failed_count()} failed")

        # Generate JUnit report
        from vertest.util.report import generate_junit_xml
        report_path = output_dir / "junit_report.xml"
        generate_junit_xml(run_result, report_path)
        console.print(f"[green]Report:[/green] {report_path}")


@cli.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--function", "-f", required=True, help="Function to test")
@click.option("--output", "-o", default="./vertest_output", help="Output directory")
@click.option("--compiler", "-c", default=None, help="Compiler to use")
@click.option("--junit", is_flag=True, help="Generate JUnit XML report")
@click.option("--html", is_flag=True, help="Generate HTML report")
def run(source, function, output, compiler, junit, html):
    """Compile and execute unit tests for a function."""
    output_dir = Path(output)
    output_dir.mkdir(parents=True, exist_ok=True)

    parser = SourceParser()
    unit = parser.parse_file(source)
    if not unit:
        console.print(f"[red]Error:[/red] Could not parse {source}")
        sys.exit(1)

    sbt = SymbolTable()
    sbt.add_units([unit])
    external_calls = sbt.external_calls(unit)

    stub_funcs = []
    for call_name in external_calls:
        sf = type("StubFunc", (), {
            "name": call_name,
            "return_type": "int",
            "parameters": [],
            "is_static": False, "is_extern": True,
            "file_path": "", "line": 0,
            "calls": [], "calls_detail": [],
            "body_start_line": 0, "body_end_line": 0,
        })()
        stub_funcs.append(sf)

    test_cases = [
        TestCase(
            name=f"test_{function}_default",
            function_name=function,
            stubs={name: [0] for name in external_calls},
        )
    ]

    executor = TestExecutor(
        build_dir=output_dir / "build",
        compiler=compiler or detect_compiler(),
    )
    run_result = executor.execute_suite(unit, function, test_cases, stub_funcs)

    for r in run_result.results:
        status_icon = "[green]PASS[/green]" if r.status == TestStatus.PASSED else "[red]FAIL[/red]"
        console.print(f"  {status_icon} {r.test_name}")
        if r.message:
            console.print(f"         {r.message}")
        if r.stderr:
            console.print(f"         stderr: {r.stderr[:200]}")

    console.print(f"\n[bold]Results:[/bold] {run_result.passed_count()} passed, {run_result.failed_count()} failed")
    console.print(f"Duration: {run_result.total_duration_ms:.1f}ms")

    if junit:
        from vertest.util.report import generate_junit_xml
        junit_path = output_dir / "junit_report.xml"
        generate_junit_xml(run_result, junit_path)
        console.print(f"[green]JUnit report:[/green] {junit_path}")

    if html:
        from vertest.util.report import generate_html_report
        html_path = output_dir / "test_report.html"
        generate_html_report(run_result, html_path)
        console.print(f"[green]HTML report:[/green] {html_path}")


@cli.command()
@click.argument("source", type=click.Path(exists=True))
@click.argument("function")
@click.option("--name", "-n", required=True, help="Test case name")
@click.option("--args", "-a", default="{}", help="JSON object of arguments")
@click.option("--expect", "-e", default="{}", help="JSON object of expected values")
@click.option("--stubs", "-s", default="{}", help="JSON object of stub return values")
@click.option("--output", "-o", default="./vertest_output", help="Output directory")
@click.option("--db", default=None, help="Database path (SQLite)")
def case(source, function, name, args, expect, stubs, output, db):
    """Add a test case for a function."""
    try:
        args_dict = json.loads(args) if isinstance(args, str) else args
        expect_dict = json.loads(expect) if isinstance(expect, str) else expect
        stubs_dict = json.loads(stubs) if isinstance(stubs, str) else stubs
    except json.JSONDecodeError as e:
        console.print(f"[red]Invalid JSON:[/red] {e}")
        sys.exit(1)

    tc = TestCase(
        name=name,
        function_name=function,
        args=args_dict,
        expected=expect_dict,
        stubs=stubs_dict,
    )

    output_dir = Path(output)
    output_dir.mkdir(parents=True, exist_ok=True)

    cases_file = output_dir / "test_cases.json"
    existing = []
    if cases_file.exists():
        existing = json.loads(cases_file.read_text())
    existing.append({
        "name": tc.name,
        "function_name": tc.function_name,
        "args": tc.args,
        "expected": tc.expected,
        "stubs": tc.stubs,
    })
    cases_file.write_text(json.dumps(existing, indent=2))
    console.print(f"[green]Added test case '{name}' for {function}[/green]")
    console.print(f"  Stored in: {cases_file}")
    console.print(f"  Run with: vertest run {source} -f {function}")


@cli.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--function", "-f", required=True, help="Function to test")
@click.option("--output", "-o", default="./vertest_output", help="Output directory")
@click.option("--compiler", "-c", default=None, help="Compiler to use")
@click.option("--html", is_flag=True, help="Generate HTML coverage report")
def cover(source, function, output, compiler, html):
    """Run tests with code coverage analysis."""
    output_dir = Path(output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    source_path = str(Path(source).resolve())

    # First generate and run the test with coverage flags
    parser = SourceParser()
    unit = parser.parse_file(source)
    if not unit:
        console.print(f"[red]Error:[/red] Could not parse {source}")
        sys.exit(1)

    sbt = SymbolTable()
    sbt.add_units([unit])
    external_calls = sbt.external_calls(unit)

    stub_funcs = []
    for call_name in external_calls:
        sf = type("StubFunc", (), {
            "name": call_name,
            "return_type": "int",
            "parameters": [],
            "is_static": False, "is_extern": True,
            "file_path": "", "line": 0,
            "calls": [], "calls_detail": [],
            "body_start_line": 0, "body_end_line": 0,
        })()
        stub_funcs.append(sf)

    # Run test
    build_dir = (output_dir / "build").resolve()
    executor = TestExecutor(
        build_dir=build_dir,
        compiler=compiler or detect_compiler(),
        compiler_flags=["-g", "-O0", "--coverage", "-fprofile-arcs", "-ftest-coverage", "-lm"],
    )

    test_cases = [
        TestCase(
            name=f"test_{function}",
            function_name=function,
            stubs={name: [0] for name in external_calls},
        )
    ]
    run_result = executor.execute_suite(unit, function, test_cases, stub_funcs)

    # Parse coverage data
    cov = CoverageAnalyzer(build_dir=build_dir)
    gcno_files = list(build_dir.rglob("*.gcno"))
    gcda_files = list(build_dir.rglob("*.gcda"))

    if gcda_files:
        cov_data = cov.parse_gcov(source_path)
        if cov_data and cov_data.get("lines_executed", 0) > 0:
            console.print(CoverageReport.generate_text_summary(cov_data))
            if html:
                html_path = output_dir / "coverage_report.html"
                CoverageReport.generate_html(cov_data, [source], html_path)
                console.print(f"[green]Coverage report:[/green] {html_path}")
        else:
            console.print("[yellow]Coverage data found but gcov output incomplete.[/yellow]")
    else:
        console.print("[yellow]No coverage data (.gcda files) generated. Ensure the test binary ran successfully.[/yellow]")

    # Show test results
    for r in run_result.results:
        status_icon = "[green]PASS[/green]" if r.status == TestStatus.PASSED else "[red]FAIL[/red]"
        console.print(f"  {status_icon} {r.test_name}")
    console.print(f"\n[bold]Test Results:[/bold] {run_result.passed_count()} passed, {run_result.failed_count()} failed")


@cli.command()
@click.argument("output_dir", type=click.Path(), default="./vertest_output")
@click.option("--type", "report_type", default="html", help="Report type: html, junit, text")
def report(output_dir, report_type):
    """Generate reports from test results."""
    output_dir = Path(output_dir)
    results_file = output_dir / "results.json"

    if results_file.exists():
        data = json.loads(results_file.read_text())
        from vertest.test.model import TestRun, TestResult, TestStatus
        run = TestRun(suite_name=data.get("suite", "unknown"))
        for r in data.get("results", []):
            run.results.append(TestResult(
                test_name=r["test_name"],
                status=TestStatus(r["status"]),
                message=r.get("message", ""),
            ))

        if report_type == "html":
            from vertest.util.report import generate_html_report
            path = output_dir / "test_report.html"
            generate_html_report(run, path)
            console.print(f"[green]HTML report:[/green] {path}")
        elif report_type == "junit":
            from vertest.util.report import generate_junit_xml
            path = output_dir / "junit_report.xml"
            generate_junit_xml(run, path)
            console.print(f"[green]JUnit report:[/green] {path}")
        else:
            console.print(f"Results: {run.passed_count()} passed, {run.failed_count()} failed")
    else:
        console.print(f"[yellow]No results found at {results_file}[/yellow]")
        console.print("Run 'vertest run' first to generate test results.")


@cli.command()
@click.argument("source", type=click.Path(exists=True))
def info(source):
    """Display detailed information about a source file."""
    parser = SourceParser()
    unit = parser.parse_file(source)
    if not unit:
        console.print(f"[red]Error:[/red] Could not parse {source}")
        sys.exit(1)

    console.print(f"[bold]File:[/bold] {unit.file_path}")
    console.print(f"[bold]Functions:[/bold] {len(unit.functions)}")
    console.print(f"[bold]Globals:[/bold] {len(unit.globals)}")
    console.print(f"[bold]Includes:[/bold] {len(unit.includes)}")

    if unit.functions:
        console.print("\n[bold]Functions:[/bold]")
        table = Table()
        table.add_column("Name", style="green")
        table.add_column("Return Type")
        table.add_column("Parameters")
        table.add_column("Calls")
        for func in unit.functions:
            params = ", ".join(f"{p.type_name} {p.name}" for p in func.parameters) or "void"
            calls = ", ".join(func.calls) or "—"
            table.add_row(func.name, func.return_type or "void", params, calls)
        console.print(table)

    if unit.globals:
        console.print("\n[bold]Global Variables:[/bold]")
        for var in unit.globals:
            console.print(f"  {var.type_name} {var.name} (line {var.line})")

    if unit.includes:
        console.print("\n[bold]Includes:[/bold]")
        for inc in unit.includes:
            marker = "<" if inc.is_system else '"'
            closer = ">" if inc.is_system else '"'
            console.print(f"  #include {marker}{inc.path}{closer}")


@cli.command()
@click.option("--compiler", "-c", default=None, help="Compiler to check")
def check(compiler):
    """Check system configuration and dependencies."""
    console.print("[bold]VeriTest System Check[/bold]\n")

    # Python
    console.print(f"Python: {sys.version.split()[0]}")

    # Compiler
    try:
        cc = detect_compiler(compiler)
        console.print(f"Compiler: {cc} [green]✓[/green]")
    except RuntimeError as e:
        console.print(f"Compiler: [red]✗[/red] {e}")

    # Tree-sitter
    try:
        import tree_sitter_c as tsc
        from tree_sitter import Language
        _ = Language(tsc.language())
        console.print("C parser (tree-sitter): [green]✓[/green]")
    except Exception as e:
        console.print(f"C parser (tree-sitter): [red]✗[/red] {e}")

    try:
        import tree_sitter_cpp as tscpp
        from tree_sitter import Language
        _ = Language(tscpp.language())
        console.print("C++ parser (tree-sitter): [green]✓[/green]")
    except Exception:
        console.print("C++ parser (tree-sitter): [yellow]not installed[/yellow]")

    # SQLite
    try:
        import sqlite3
        console.print(f"SQLite: {sqlite3.sqlite_version} [green]✓[/green]")
    except Exception as e:
        console.print(f"SQLite: [red]✗[/red] {e}")

    # gcov
    import shutil
    if shutil.which("gcov"):
        console.print("gcov: [green]✓[/green]")
    else:
        console.print("gcov: [yellow]not found[/yellow] (coverage limited)")

    # Cross-compilers
    available = list_available_targets()
    if available:
        console.print(f"Cross-compilers: [green]{', '.join(available)}[/green]")
    else:
        console.print("Cross-compilers: [yellow]none found[/yellow] (arm-none-eabi-gcc, xc32-gcc, etc.)")

    # Renode
    from vertest.target.renode.executor import RenodeExecutor
    rnode = RenodeExecutor._find_renode()
    console.print(f"Renode: {'[green]✓[/green]' if rnode else '[yellow]not found[/yellow]'}")

    # MPLAB X
    from vertest.target.mplabx.executor import MplabxExecutor
    mx = MplabxExecutor._find_mplabx()
    console.print(f"MPLAB X: {'[green]✓[/green]' if mx else '[yellow]not found[/yellow]'}")


@cli.group()
def target():
    """Cross-compile and run tests on embedded targets.
    Supports Renode simulation (cortex-m, riscv) and
    MPLAB X IDE (PIC32, PIC24, PIC16)."""
    pass


@target.command("list")
def target_list():
    """List all available target platforms."""
    table = Table(title="Target Platforms")
    table.add_column("Target", style="bold cyan")
    table.add_column("Architecture")
    table.add_column("Compiler")
    table.add_column("Devices")
    table.add_column("Status")

    for name, cfg in sorted(TARGETS.items()):
        compiler_found = shutil.which(cfg.compiler) is not None
        status = "[green]✓ ready[/green]" if compiler_found else "[yellow]compiler missing[/yellow]"
        table.add_row(
            name,
            cfg.architecture,
            cfg.compiler,
            cfg.mplabx_device or cfg.renode_platform,
            status,
        )

    console.print(table)
    console.print(f"\n[bold]{len(TARGETS)}[/bold] targets configured")


@target.command()
@click.option("--target", "-t", "target_name", default="cortex-m3",
              help=f"Target platform: {', '.join(list_all_targets())}")
@click.option("--timeout", default=30, help="Simulation timeout in seconds")
@click.option("--output", "-o", default="./vertest_target_out", help="Output directory")
def check(target_name, timeout, output):
    """Check target toolchain and simulation environment."""
    if target_name not in TARGETS:
        console.print(f"[red]Unknown target: {target_name}[/red]")
        console.print(f"Available: {', '.join(list_all_targets())}")
        return

    cfg = TARGETS[target_name]
    output_dir = Path(output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    console.print(f"[bold]Target:[/bold] {target_name} ({cfg.name})")
    console.print(f"  Architecture: {cfg.architecture}")
    console.print(f"  Compiler:     {cfg.compiler}")

    cc = shutil.which(cfg.compiler)
    if cc:
        result = subprocess.run([cc, "--version"], capture_output=True, text=True, timeout=10)
        first_line = result.stdout.split("\n")[0] if result.stdout else result.stderr.split("\n")[0]
        console.print(f"  Compiler:     [green]✓[/green] {first_line}")
    else:
        console.print(f"  Compiler:     [red]✗[/red] not found")

    # Check simulator
    from vertest.target.renode.executor import RenodeExecutor as RE
    rnode = RE._find_renode()
    if rnode:
        console.print(f"  Renode:       [green]✓[/green] ({rnode})")
    else:
        console.print(f"  Renode:       [yellow]not found[/yellow] (required for simulation)")

    from vertest.target.mplabx.executor import MplabxExecutor as ME
    mx = ME._find_mplabx()
    if mx:
        console.print(f"  MPLAB X:      [green]✓[/green] ({mx})")
    else:
        console.print(f"  MPLAB X:      [yellow]not found[/yellow]")

    # Quick compile test
    if cc:
        test_src = output_dir / "_test_compile.c"
        test_src.write_text("int _vertest_compile_check(int x) { return x + 1; }")
        test_bin = output_dir / "_test_compile.elf"
        cmd = [cc, str(test_src), "-o", str(test_bin)] + cfg.cflags + cfg.linker_flags
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            console.print(f"  Compile test: [green]✓[/green] ELF generated")
            test_bin.unlink(missing_ok=True)
        else:
            console.print(f"  Compile test: [red]✗[/red]\n{result.stderr[:300]}")
        test_src.unlink(missing_ok=True)

    console.print(f"\nOutput: {output_dir}")


@target.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--function", "-f", required=True, help="Function to test")
@click.option("--target", "-t", "target_name", default="cortex-m3",
              help=f"Target: {', '.join(list_all_targets())}")
@click.option("--timeout", default=30, help="Simulation timeout (s)")
@click.option("--output", "-o", default="./vertest_target_out", help="Output directory")
@click.option("--junit", is_flag=True, help="Generate JUnit XML report")
def renode(source, function, target_name, timeout, output, junit):
    """Cross-compile and run tests in Renode simulation."""
    if target_name not in TARGETS:
        console.print(f"[red]Unknown target: {target_name}[/red]")
        return

    output_dir = Path(output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # Parse source
    parser = SourceParser()
    unit = parser.parse_file(source)
    if not unit:
        console.print(f"[red]Error:[/red] Could not parse {source}")
        sys.exit(1)

    # Detect externals
    sbt = SymbolTable()
    sbt.add_units([unit])
    external_calls = sbt.external_calls(unit)

    stub_funcs = []
    for call_name in external_calls:
        sf = type("StubFunc", (), {
            "name": call_name, "return_type": "int", "parameters": [],
            "is_static": False, "is_extern": True,
            "file_path": "", "line": 0, "calls": [], "calls_detail": [],
            "body_start_line": 0, "body_end_line": 0,
        })()
        stub_funcs.append(sf)

    test_cases = [
        TestCase(
            name=f"test_{function}",
            function_name=function,
            stubs={name: [0] for name in external_calls},
        )
    ]

    console.print(f"[bold]Target:[/bold] {target_name} ({TARGETS[target_name].name})")
    console.print(f"[bold]Function:[/bold] {function}")
    console.print(f"[bold]External deps:[/bold] {', '.join(sorted(external_calls)) or 'none'}")

    # Execute in Renode
    try:
        executor = RenodeExecutor(
            target=target_name,
            build_dir=output_dir / "build",
        )
    except (ValueError, RuntimeError) as e:
        console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)

    run_result = executor.execute_suite(unit, function, test_cases, stub_funcs, timeout_s=timeout)

    for r in run_result.results:
        status_icon = "[green]PASS[/green]" if r.status == TestStatus.PASSED else "[red]FAIL[/red]"
        console.print(f"  {status_icon} {r.test_name}")
        if r.message:
            console.print(f"         {r.message[:200]}")
        if r.stdout:
            for line in r.stdout.split("\n")[:5]:
                console.print(f"         {line}")

    console.print(f"\n[bold]Results:[/bold] {run_result.passed_count()} passed, {run_result.failed_count()} failed")

    if junit:
        from vertest.util.report import generate_junit_xml
        xml_path = output_dir / "junit_report.xml"
        generate_junit_xml(run_result, xml_path)
        console.print(f"[green]JUnit report:[/green] {xml_path}")


@target.command()
@click.argument("source", type=click.Path(exists=True))
@click.option("--function", "-f", required=True, help="Function to test")
@click.option("--target", "-t", "target_name", default="pic32mx",
              help=f"Target: {', '.join(list_all_targets())}")
@click.option("--output", "-o", default="./vertest_target_out", help="Output directory")
def mplabx(source, function, target_name, output):
    """Generate MPLAB X project and build for PIC/simulation."""
    if target_name not in TARGETS:
        console.print(f"[red]Unknown target: {target_name}[/red]")
        return

    output_dir = Path(output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    parser = SourceParser()
    unit = parser.parse_file(source)
    if not unit:
        console.print(f"[red]Error:[/red] Could not parse {source}")
        sys.exit(1)

    sbt = SymbolTable()
    sbt.add_units([unit])
    external_calls = sbt.external_calls(unit)

    stub_funcs = []
    for call_name in external_calls:
        sf = type("StubFunc", (), {
            "name": call_name, "return_type": "int", "parameters": [],
            "is_static": False, "is_extern": True,
            "file_path": "", "line": 0, "calls": [], "calls_detail": [],
            "body_start_line": 0, "body_end_line": 0,
        })()
        stub_funcs.append(sf)

    test_cases = [
        TestCase(
            name=f"test_{function}",
            function_name=function,
            stubs={name: [0] for name in external_calls},
        )
    ]

    console.print(f"[bold]Target:[/bold] {target_name} ({TARGETS[target_name].name})")
    console.print(f"[bold]Device:[/bold] {TARGETS[target_name].mplabx_device}")
    console.print(f"[bold]Compiler:[/bold] {TARGETS[target_name].compiler}")

    try:
        executor = MplabxExecutor(
            target=target_name,
            build_dir=output_dir / "build",
        )
    except (ValueError, RuntimeError) as e:
        console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)

    run_result = executor.execute_suite(unit, function, test_cases, stub_funcs)

    for r in run_result.results:
        status_icon = "[green]PASS[/green]" if r.status == TestStatus.PASSED else "[red]FAIL[/red]"
        console.print(f"  {status_icon} {r.test_name}")

    console.print(f"\n[bold]Results:[/bold] {run_result.passed_count()} passed, {run_result.failed_count()} failed")
    console.print(f"MPLAB X project: {output_dir / 'build'}")


if __name__ == "__main__":
    cli()
