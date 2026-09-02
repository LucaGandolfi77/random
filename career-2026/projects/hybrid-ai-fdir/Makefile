PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test demo clean
test:
	$(PY) tests/test_fdir.py
demo:
	$(PY) -c "from fdir.assistant import eval_scenarios; import json; print(json.dumps(eval_scenarios(), indent=2))"
clean:
	rm -rf __pycache__ fdir/__pycache__ tests/__pycache__
