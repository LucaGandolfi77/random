PY ?= /workspaces/random/career-2026/ecss-ml-assurance-workbench/backend/.venv/bin/python
.PHONY: test bench demo demo-faults clean

test:
	$(PY) tests/test_gnc.py

bench:
	$(PY) -m gnc_safety_cage.run_demo --fault none

demo:
	$(PY) -m gnc_safety_cage.run_demo

demo-faults:
	for f in bias stuck ml_bias ml_stale ml_nan ml_ood cov; do \
	  echo "== $$f =="; $(PY) -m gnc_safety_cage.run_demo --fault $$f | $(PY) -c "import sys,json;m=json.load(sys.stdin)['metrics'];print(m['fallback_samples'],'fallbacks',m['reason_codes'])"; done

clean:
	rm -rf __pycache__ gnc_safety_cage/__pycache__ tests/__pycache__
