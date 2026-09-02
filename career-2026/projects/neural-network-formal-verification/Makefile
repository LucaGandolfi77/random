PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test verify clean

test:
	$(PY) tests/test_verifier.py

verify:
	$(PY) -m nnfv.cli

clean:
	rm -rf evidence results __pycache__ nnfv/__pycache__ tests/__pycache__
