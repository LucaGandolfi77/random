#!/usr/bin/env bash
# Non-destructive tests for init_project.py (stdlib Python only).
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
INIT="$ROOT_DIR/scripts/init_project.py"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
FAILURES=0

check() { # description, expected_exit, actual_exit
  if [ "$2" -eq "$3" ]; then
    echo "PASS: $1"
  else
    echo "FAIL: $1 (expected exit $2, got $3)"
    FAILURES=$((FAILURES + 1))
  fi
}

# 1. help exits 0 and prints usage
python3 "$INIT" --help >/dev/null 2>&1; check "help exits 0" 0 $?

# 2. missing project name fails (argparse error, exit 2)
python3 "$INIT" >/dev/null 2>&1; check "missing project name rejected" 2 $?

# 3. dry-run creates nothing
cd "$WORK"
python3 "$INIT" dry-proj --dry-run >/dev/null 2>&1; check "dry-run exit 0" 0 $?
[ ! -e "$WORK/dry-proj" ] && echo "PASS: dry-run created no directory" || { echo "FAIL: dry-run created directory"; FAILURES=$((FAILURES+1)); }

# 4. real run creates seven files and updates Project field
python3 "$INIT" demo-proj --prefix MYPJ >/dev/null 2>&1; check "init exit 0" 0 $?
COUNT=$(find "$WORK/demo-proj" -maxdepth 1 -name '*.md' | wc -l)
[ "$COUNT" -eq 7 ] && echo "PASS: exactly 7 templates copied" || { echo "FAIL: expected 7 files, got $COUNT"; FAILURES=$((FAILURES+1)); }
grep -q "| Project | demo-proj |" "$WORK/demo-proj/PROJECT_CHARTER.md" && echo "PASS: Project placeholder updated" || { echo "FAIL: Project placeholder not updated"; FAILURES=$((FAILURES+1)); }
grep -q "MYPJ-REQ-F-001" "$WORK/demo-proj/PROJECT_CHARTER.md" && echo "PASS: identifier prefix applied" || { echo "FAIL: prefix not applied"; FAILURES=$((FAILURES+1)); }

# 5. non-destructive: second run refuses and leaves content untouched
BEFORE=$(sha256sum "$WORK/demo-proj/MODEL_CARD.md" | cut -d' ' -f1)
python3 "$INIT" demo-proj --prefix OTHER >/dev/null 2>&1; RC=$?
check "second run refused (exit 2)" 2 $RC
AFTER=$(sha256sum "$WORK/demo-proj/MODEL_CARD.md" | cut -d' ' -f1)
[ "$BEFORE" = "$AFTER" ] && echo "PASS: existing files unchanged" || { echo "FAIL: existing file was modified"; FAILURES=$((FAILURES+1)); }

# 6. all seven files are non-empty and have H1 + Document Control
for f in PROJECT_CHARTER OPERATIONAL_DESIGN_DOMAIN DATA_READINESS_REVIEW MODEL_CARD TEST_PLAN FMEA ASSURANCE_CASE; do
  file="$WORK/demo-proj/$f.md"
  [ -s "$file" ] && head -1 "$file" | grep -q '^# ' || { echo "FAIL: $f missing H1"; FAILURES=$((FAILURES+1)); }
  grep -q '| Document ID |' "$file" && grep -q '| Project |' "$file" || { echo "FAIL: $f missing Document Control"; FAILURES=$((FAILURES+1)); }
done
echo "PASS: all templates non-empty with H1 and Document Control"

if [ "$FAILURES" -eq 0 ]; then
  echo "ALL INIT TESTS PASSED"
else
  echo "$FAILURES INIT TEST(S) FAILED"
  exit 1
fi
