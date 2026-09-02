PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test run clean
test:
	$(PY) tests/test_benchmark.py
run:
	$(PY) -c "from qml.benchmark import run_experiment, save_experiment; from pathlib import Path; r=run_experiment(); save_experiment(r, Path('experiments/run_latest.json')); print(r)"
clean:
	rm -rf __pycache__ qml/__pycache__ tests/__pycache__
