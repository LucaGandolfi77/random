PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test compare clean
test:
	$(PY) tests/test_shielded_rl.py
compare:
	$(PY) -c "from rl.shielded_rl import compare_policies; import json; print(json.dumps(compare_policies(), indent=2))"
clean:
	rm -rf __pycache__ rl/__pycache__ tests/__pycache__
