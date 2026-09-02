PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test demo clean
test:
	$(PY) tests/test_federated.py
demo:
	$(PY) -c "from fed.federated import simulate; import json; print(json.dumps(simulate(), indent=2))"
clean:
	rm -rf __pycache__ fed/__pycache__ tests/__pycache__
