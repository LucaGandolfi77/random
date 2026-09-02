PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test demo clean
test:
	$(PY) tests/test_thread.py
demo:
	$(PY) mbse/thread.py
clean:
	rm -rf __pycache__ mbse/__pycache__ tests/__pycache__
