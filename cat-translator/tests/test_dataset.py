from cat_translator.dataset import parse_filename


def test_parse_valid_filename():
    meta = parse_filename("B_ANI01_MC_FN_SIM01_101.wav")
    assert meta == {
        "context": "brushing",
        "cat_id": "ANI01",
        "breed": "MC",
        "sex": "FN",
        "owner": "SIM01",
        "counter": "101",
    }


def test_parse_food():
    meta = parse_filename("F_BAC01_EU_MI_GIA01_201.wav")
    assert meta["context"] == "food"


def test_parse_isolation():
    meta = parse_filename("I_WHO01_MC_FN_SIM01_103.wav")
    assert meta["context"] == "isolation"


def test_parse_invalid():
    assert parse_filename("not_a_cat.wav") is None
    assert parse_filename("") is None
