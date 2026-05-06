from __future__ import annotations

from graveyard_chorus.config import RuntimeSettings
from graveyard_chorus.engine import SimulationEngine
from graveyard_chorus.exporters import export_bundle


def test_export_bundle_writes_expected_artifacts(tmp_path) -> None:
    settings = RuntimeSettings(openrouter_api_key=None, offline_mode=True)
    engine = SimulationEngine.from_seed(
        settings=settings,
        years=6,
        llm_enabled=False,
        offline_mode=True,
    )
    state = engine.run(6)

    paths = export_bundle(state, tmp_path)

    assert paths["anthology"].exists()
    assert paths["state"].exists()
    assert paths["biographies"].exists()
    assert paths["family_trees"].exists()
    assert paths["town_chronicle"].exists()
    assert paths["explorer"].exists()
    assert paths["report"].exists()
    assert paths["manifest"].exists()
    assert paths["service_worker"].exists()
    assert (tmp_path / "app.js").exists()
    assert (tmp_path / "styles.css").exists()
    assert (tmp_path / "icon-192.svg").exists()
    assert (tmp_path / "icon-512.svg").exists()
    assert "Graveyard Chorus of Morrowfield" in paths["anthology"].read_text(encoding="utf-8")
    assert "manifest.webmanifest" in paths["explorer"].read_text(encoding="utf-8")
    assert "serviceWorker.register('./sw.js')" in (tmp_path / "app.js").read_text(encoding="utf-8")
    assert "Morrowfield Chorus" in paths["manifest"].read_text(encoding="utf-8")
    assert "<html" in paths["report"].read_text(encoding="utf-8")