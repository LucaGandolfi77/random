from cat_translator.phrases import get_phrase


def test_get_phrase_high_confidence():
    p = get_phrase("food", 0.85)
    assert isinstance(p, str)
    assert len(p) > 0


def test_get_phrase_low_confidence():
    p = get_phrase("food", 0.2)
    assert isinstance(p, str)


def test_get_phrase_brushing():
    p = get_phrase("brushing", 0.9)
    assert isinstance(p, str)
    assert len(p) > 0


def test_get_phrase_isolation():
    p = get_phrase("isolation", 0.7)
    assert isinstance(p, str)
    assert len(p) > 0
