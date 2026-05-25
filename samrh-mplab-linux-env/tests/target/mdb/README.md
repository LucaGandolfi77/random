# MDB Templates

The `.mdb.in` files in this directory are conservative starting points for Linux automation.

Important assumptions:

1. The local `mdb.sh` accepts the commands `device`, `hwtool`, `program`, `reset`, `run`, `wait`, `halt`, `print`, and `quit`.
2. The exact behaviour of `wait` and symbol inspection can vary with MPLAB X version, device pack, and selected backend.
3. If the local installation behaves differently, keep the repository runner and replace the template or pass `--mdb-script` with a locally verified command file.

Verification step:

Run a dry execution against a known ELF and inspect the resulting log file before relying on the flow for CI or acceptance evidence.