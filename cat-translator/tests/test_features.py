import numpy as np

from cat_translator.features import (
    pre_emphasis,
    framing,
    hamming_window,
    mel_filterbank,
    mfcc_per_frame,
    extract_aggregated,
)


def test_pre_emphasis_shape():
    sig = np.ones(100)
    out = pre_emphasis(sig)
    assert out.shape == (100,)


def test_framing_shape():
    sig = np.ones(22050)
    frames = framing(sig, 22050)
    # 1 second at 22050, 25ms frame, 10ms hop
    assert frames.shape[1] == int(22050 * 25 / 1000)
    # Should be ~100 frames
    n_frames_expected = 1 + (len(sig) - frames.shape[1]) // int(22050 * 10 / 1000)
    assert frames.shape[0] == n_frames_expected


def test_hamming_window():
    w = hamming_window(256)
    assert w.shape == (256,)
    assert np.allclose(w[0], 0.08, atol=0.01)
    assert np.allclose(w[128], 1.0, atol=0.01)


def test_mel_filterbank_shape():
    fb = mel_filterbank(40, 512, 22050)
    assert fb.shape == (40, 257)
    assert np.all(fb >= 0)


def test_mfcc_per_frame_sine():
    sr = 22050
    t = np.linspace(0, 1, sr, endpoint=False)
    sig = np.sin(2 * np.pi * 440 * t)
    m = mfcc_per_frame(sig, sr)
    assert m.shape[1] == 20
    assert m.shape[0] > 0


def test_extract_aggregated_sine():
    import soundfile as sf
    import tempfile, os

    sr = 22050
    t = np.linspace(0, 1, sr, endpoint=False)
    sig = np.sin(2 * np.pi * 440 * t)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        sf.write(f.name, sig, sr)
        tmp = f.name
    try:
        feats = extract_aggregated(tmp)
        # 20 MFCC + 20 delta + 20 delta2 = 60, mean+std = 120, + centroid(2) + spread(2) + rms(2) = 126
        assert feats.ndim == 1
        assert feats.shape[0] == 126
        assert np.all(np.isfinite(feats))
    finally:
        os.unlink(tmp)
