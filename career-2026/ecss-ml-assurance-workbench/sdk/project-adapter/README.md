# Project Adapter SDK (contract)

Add a new assurance project by providing a manifest JSON with: meta (id/name/version/model_version/
dataset_version), requirements[], tests[] (case+result), evidence[], risks[], fmea[], limitations[],
deployment_decisions[], monitoring/odd/model_card/data_quality objects. IDs follow stable conventions
(REQ-*, TEST-*, EVID-*, RISK-*, FM-*, LIM-*). Validation: python -m app.scripts.validate_project
<path> --dry-run. Fixture example in example/manifest.json is synthetic (syntheticDemoData: true).
