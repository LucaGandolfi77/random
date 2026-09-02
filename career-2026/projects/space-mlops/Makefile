PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test demo clean
test:
	$(PY) tests/test_registry.py
demo:
	$(PY) -c "from mlops.registry import demo_flow; print(demo_flow())"
clean:
	rm -rf __pycache__ mlops/__pycache__ tests/__pycache__
