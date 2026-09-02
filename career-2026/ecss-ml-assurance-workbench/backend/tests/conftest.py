import pytest

from tests.helpers import TestEnv, make_client


@pytest.fixture()
def env(tmp_path) -> TestEnv:
    return TestEnv(storage_dir=tmp_path / "storage", db_path=tmp_path / "workbench.db")


@pytest.fixture()
def client(env: TestEnv):
    return make_client(env)


@pytest.fixture()
def restarted_client(env: TestEnv):
    """Second client over the same DB + storage, simulating an app restart."""
    return make_client(env)
