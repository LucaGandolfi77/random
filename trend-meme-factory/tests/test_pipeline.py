from pathlib import Path

from trend_meme_factory.pipeline import Config, TrendMemeFactory


def test_pipeline_generates_fallback_assets(tmp_path: Path) -> None:
    output_root = tmp_path / "outputs"
    config = Config(
        output_root=str(output_root),
        run_date="2026-06-10",
        enable_web_research=False,
        max_topics_to_approve=2,
        memes_per_topic=2,
        max_final_memes=4,
    )

    result = TrendMemeFactory(config).run()
    run_dir = output_root / "2026-06-10"

    assert result["counts"]["topics_approved"] == 2
    assert result["counts"]["meme_concepts"] == 4
    assert result["counts"]["images_generated"] == 4
    assert result["counts"]["final_memes_approved"] == 4
    assert (run_dir / "metadata" / "run_summary.json").exists()
    assert (run_dir / "metadata" / "approved_topics.json").exists()
    assert (run_dir / "metadata" / "final_review.json").exists()
    assert len(list((run_dir / "final").glob("*_final.png"))) == 4