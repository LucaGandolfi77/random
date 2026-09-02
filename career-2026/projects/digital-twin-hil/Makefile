PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test run clean
test:
	$(PY) tests/test_bench.py
run:
	$(PY) -c "from twinlab.bench import TestBench, export_evidence; from pathlib import Path; b=TestBench(); print(b.run(steps=100)); print(export_evidence(b, Path('evidences')))"
clean:
	rm -rf __pycache__ twinlab/__pycache__ tests/__pycache__
