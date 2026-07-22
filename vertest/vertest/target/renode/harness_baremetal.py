from __future__ import annotations

from pathlib import Path

from vertest.analysis.types import FunctionInfo, SourceUnit


CORTEX_M_STARTUP = r"""/* VeriTest bare-metal startup for ARM Cortex-M.
 * Provides vector table, _start, and semihosting output. */
#define SEMIHOSTING_SYS_WRITEC 0x03
#define SEMIHOSTING_SYS_WRITE0 0x04
#define SEMIHOSTING_SYS_WRITE  0x05

static int vertest_sh_call(int reason, void *arg) {
    register int r0 __asm("r0") = reason;
    register void *r1 __asm("r1") = arg;
    __asm volatile("bkpt #0xAB" : "+r"(r0) : "r"(r1) : "memory");
    return r0;
}

static void vertest_sh_write_string(const char *s) {
    vertest_sh_call(SEMIHOSTING_SYS_WRITE0, (void *)s);
}

/* Bare-metal _write: called by minimal printf-like code */
int vertest_putchar(int c) {
    struct { int x; } arg = { c & 0xFF };
    vertest_sh_call(SEMIHOSTING_SYS_WRITEC, &arg);
    return c;
}

void vertest_print(const char *s) {
    while (*s) vertest_putchar(*s++);
}

void vertest_print_int(int val) {
    char buf[16];
    int i = 0, neg = 0;
    if (val < 0) { neg = 1; val = -val; }
    if (val == 0) { vertest_putchar('0'); return; }
    while (val > 0) { buf[i++] = '0' + (val % 10); val /= 10; }
    if (neg) vertest_putchar('-');
    while (i > 0) vertest_putchar(buf[--i]);
}

void vertest_print_ln(const char *s) {
    vertest_print(s);
    vertest_putchar('\n');
}

/* Exception handlers */
void Default_Handler(void) { while (1); }

/* Weak aliases for all interrupts */
#define WEAK_ALIAS(name) \
    void __attribute__((weak, alias("Default_Handler"))) name(void)

WEAK_ALIAS(NMI_Handler);
WEAK_ALIAS(HardFault_Handler);
WEAK_ALIAS(MemManage_Handler);
WEAK_ALIAS(BusFault_Handler);
WEAK_ALIAS(UsageFault_Handler);
WEAK_ALIAS(SVC_Handler);
WEAK_ALIAS(DebugMon_Handler);
WEAK_ALIAS(PendSV_Handler);
WEAK_ALIAS(SysTick_Handler);

extern int main(void);

void Reset_Handler(void) {
    extern unsigned int _sdata, _edata, _sbss, _ebss, _sidata;
    unsigned int *src = &_sidata;
    unsigned int *dst;

    /* Copy .data from flash to RAM */
    for (dst = &_sdata; dst < &_edata; ) *dst++ = *src++;

    /* Zero .bss */
    for (dst = &_sbss; dst < &_ebss; ) *dst++ = 0;

    vertest_print("VeriTest Bare-Metal Test Runner\\n");
    vertest_print("================================\\n");

    main();

    vertest_print("\\n================================\\n");
    vertest_print("Test complete\\n");

    while (1);
}

/* Vector table */
__attribute__((section(".isr_vector")))
void (* const vector_table[16])(void) = {
    (void (*)(void))0x20001000,  /* initial SP */
    Reset_Handler,
    NMI_Handler,
    HardFault_Handler,
    MemManage_Handler,
    BusFault_Handler,
    UsageFault_Handler,
    0, 0, 0, 0,                 /* reserved */
    SVC_Handler,
    DebugMon_Handler,
    0,                          /* reserved */
    PendSV_Handler,
    SysTick_Handler,
};
"""

# Template for bare-metal test drivers (no stdio dependency)
BARE_METAL_DRIVER_HEADER = """
/* VeriTest bare-metal test driver - no stdio required.
 * Output via semihosting. */
extern void vertest_print(const char *s);
extern void vertest_print_int(int val);
extern void vertest_print_ln(const char *s);
extern int vertest_putchar(int c);

static int vertest_pass_count = 0;
static int vertest_fail_count = 0;
static int vertest_test_index = 0;

#define VERTEST_ASSERT(cond, msg) do { \\
    vertest_test_index++; \\
    if (!(cond)) { \\
        vertest_print("FAIL ["); \\
        vertest_print_int(vertest_test_index); \\
        vertest_print("] "); \\
        vertest_print_ln(msg); \\
        vertest_fail_count++; \\
    } else { \\
        vertest_print("PASS ["); \\
        vertest_print_int(vertest_test_index); \\
        vertest_print("] "); \\
        vertest_print_ln(msg); \\
        vertest_pass_count++; \\
    } \\
} while(0)

#define VERTEST_ASSERT_EQ(actual, expected, msg) \\
    VERTEST_ASSERT((actual) == (expected), msg)
#define VERTEST_ASSERT_TRUE(cond, msg) \\
    VERTEST_ASSERT((cond), msg)
"""

# (Reset_Handler is defined in vertest_startup.c)


class BareMetalDriverGenerator:
    """Generates a bare-metal test driver suitable for ARM Cortex-M
    and other embedded targets that don't have stdio."""

    def __init__(self, output_dir: str | Path):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, unit: SourceUnit, target_function: str, test_cases: list[dict],
                 stub_functions: list | None = None) -> Path:
        driver_path = self.output_dir / f"test_{target_function}.c"
        startup_path = self.output_dir / "vertest_startup.c"

        func_info = self._find_function(unit, target_function)
        if not func_info:
            raise ValueError(f"Function '{target_function}' not found in {unit.file_path}")

        # Write startup code
        startup_path.write_text(CORTEX_M_STARTUP)

        # Build function declaration
        params_str = ", ".join(
            f"{p.type_name} {'*' if p.is_pointer else ''}{p.name or ''}"
            for p in func_info.parameters
        ) or "void"
        func_decl = f"{func_info.return_type or 'int'} {target_function}({params_str});"

        stub_decls = ""
        if stub_functions:
            decls = []
            for sf in stub_functions:
                decls.append(f"extern int stub_{sf.name}_configure(int return_value);")
                decls.append(f"extern int stub_{sf.name}_call_count_get(void);")
            stub_decls = "\n".join(decls)

        lines = [
            BARE_METAL_DRIVER_HEADER.strip(),
            "",
            func_decl,
            "",
            stub_decls,
            "",
        ]

        test_names = []
        for i, tc in enumerate(test_cases):
            tc_name = tc.get("name", f"test_{i+1}")
            test_names.append(tc_name)
            lines.extend(self._render_test_case(tc_name, target_function, func_info, tc, i))

        # Emit main() that calls all test cases
        lines.append("")
        lines.append("int main(void) {")
        for tn in test_names:
            lines.append(f"    run_{tn}();")
        lines.append("")
        lines.append("    vertest_print(\"Results: \");")
        lines.append("    vertest_print_int(vertest_pass_count);")
        lines.append("    vertest_print(\" passed, \");")
        lines.append("    vertest_print_int(vertest_fail_count);")
        lines.append("    vertest_print_ln(\" failed\");")
        lines.append("    return vertest_fail_count;")
        lines.append("}")
        lines.append("")

        driver_path.write_text("\n".join(lines))
        return driver_path

    def _render_test_case(self, name: str, target_function: str, func_info: FunctionInfo,
                          tc: dict, index: int) -> list[str]:
        lines = [
            "",
            f"static void run_{name}(void) {{",
            f"    /* Test: {name} */",
        ]

        stubs = tc.get("stubs", {})
        for stub_name, stub_config in stubs.items():
            vals = stub_config if isinstance(stub_config, list) else [stub_config]
            for val in vals:
                lines.append(f"    stub_{stub_name}_configure({val});")

        args = tc.get("args", {})
        arg_vals = []
        for param in func_info.parameters:
            if param.name in args:
                v = args[param.name]
                arg_vals.append(f'"{v}"' if isinstance(v, str) and not v.startswith("(") else str(v))
            else:
                arg_vals.append("0")

        return_type = func_info.return_type or "void"
        if return_type != "void":
            lines.append(f"    {return_type} result = {target_function}({', '.join(arg_vals)});")
        else:
            lines.append(f"    {target_function}({', '.join(arg_vals)});")

        assertions = tc.get("asserts", tc.get("expected", {}))
        for what, expected in assertions.items():
            if what == "return" and return_type != "void":
                lines.append(f'    VERTEST_ASSERT_EQ(result, {expected}, "{name}: return != {expected}");')

        lines.append("}")
        return lines

    @staticmethod
    def _find_function(unit: SourceUnit, name: str) -> FunctionInfo | None:
        for func in unit.functions:
            if func.name == name:
                return func
        return None
