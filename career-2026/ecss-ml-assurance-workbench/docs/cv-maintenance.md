# CV maintenance

- Content source: `frontend/src/content/profile.json` → page `/cv`.
- Update `version` and `lastUpdated` in the profile on each change.
- Print CV: button calls `window.print()`; the print stylesheet renders a white A4 document without
  navigation. For PDF, use the browser's "Save as PDF" destination (documented on the button); no
  obsolete committed PDF is kept without a regeneration procedure.
- Rules: no arbitrary percentage bars; every competency maps to a portfolio project; claims match
  repository artefacts; synthetic/simulated metrics are labelled.
