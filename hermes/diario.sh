#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
exec python3 - "$@" <<'PYEOF'
import sys, json, subprocess, os, datetime, pathlib

HERMES_DIR = pathlib.Path(__file__).resolve().parent if "__file__" in dir() else pathlib.Path(".")
os.chdir(HERMES_DIR)

entry = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
if not entry:
    entry = sys.stdin.read().strip()
if not entry:
    print("Utilizzo: ./diario.sh <voce del diario>")
    print("    oppure: echo 'voce' | ./diario.sh")
    sys.exit(1)

now = datetime.datetime.now()
date_str = now.strftime("%Y-%m-%d %H:%M")
date_short = now.strftime("%Y-%m-%d")

# 1. Append raw entry to log
log_file = pathlib.Path("diario_di_bordo.md")
with open(log_file, "a") as f:
    f.write(f"- [{date_str}] {entry}\n")
print(f"[diario] Nota salvata in {log_file}")

# 2. Dispatch to profeta via hermes
task = (
    "Trasforma questa voce di diario in un paragrafo visionario per il libro. "
    "ATTENZIONE: rispondi SOLO con il paragrafo, nient'altro. "
    "Niente Analysis, niente Proposed action, niente Risks, niente preamboli. "
    f"Solo il paragrafo. Voce: {entry}"
)
cmd = [
    "./run-local-hermes.sh", "dispatch", task,
    "--agent", "profeta", "--live", "--json"
]

print(f"[diario] Invoco il Profeta in Delirio (hermes live)...", flush=True)
try:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
except subprocess.TimeoutExpired:
    print("[diario] ERRORE: timeout (300s)", file=sys.stderr)
    sys.exit(1)

if result.returncode != 0:
    print(f"[diario] ERRORE: hermes fallito (exit {result.returncode})", file=sys.stderr)
    err = (result.stderr or result.stdout or "").strip()
    if err:
        print(err, file=sys.stderr)
    sys.exit(1)

# 3. Parse JSON output
try:
    data = json.loads(result.stdout)
except json.JSONDecodeError as e:
    print(f"[diario] ERRORE: JSON non valido: {e}", file=sys.stderr)
    print("[stdout]", result.stdout[:800], file=sys.stderr)
    sys.exit(1)

outputs = data.get("results", [])
if not outputs:
    print("[diario] ERRORE: nessun risultato nel JSON", file=sys.stderr)
    sys.exit(1)

first = outputs[0]
status = first.get("status")
if status != "completed":
    print(f"[diario] ERRORE: status = {status}", file=sys.stderr)
    err = first.get("error") or ""
    if err:
        print(err, file=sys.stderr)
    sys.exit(1)

paragraph = (first.get("output") or "").strip()
if not paragraph:
    print("[diario] ERRORE: output vuoto", file=sys.stderr)
    sys.exit(1)

# 4. Append paragraph to book
book_file = pathlib.Path("il_diario_del_profeta.md")
if not book_file.exists():
    with open(book_file, "w") as f:
        f.write("# IL DIARIO DEL PROFETA IN DELIRIO\n\n")
        f.write("> *Apocalisse quotidiana trascritta da un testimone febbrile.*\n\n---\n\n")

content = book_file.read_text() if book_file.exists() else ""
entry_num = content.count("\n### Voce ") + 1

with open(book_file, "a") as f:
    f.write(f"\n### Voce {entry_num} — {date_short}\n\n")
    f.write(f"> *{entry}*\n\n")
    f.write(f"{paragraph}\n\n")
    f.write("---\n")

print(f"[diario] Paragrafo salvato in {book_file} (Voce {entry_num})")
print()
print("=" * 64)
print(paragraph)
print("=" * 64)
PYEOF
