#!/usr/bin/env bash
set -euo pipefail

log_info() {
    printf '[INFO] %s\n' "$*"
}

log_error() {
    printf '[ERROR] %s\n' "$*" >&2
}

die() {
    log_error "$*"
    exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

command -v python3 >/dev/null 2>&1 || die "python3 is required"

log_info "Running Atlas manifest and roster checks"
python3 - "$script_dir" <<'PY'
from pathlib import Path
import sys

try:
    import yaml
except ImportError as exc:
    raise SystemExit(f"PyYAML is required for smoke-test.sh: {exc}")

root = Path(sys.argv[1])
profile_root = root / "hermes-profile" / "atlas-editorial-house"
skills_root = profile_root / "skills" / "creative"

expected_skills = [
    "atlas-editorial-house",
    "atlas-canon-memory",
    "atlas-imprints",
    "atlas-writers-room",
    "atlas-trial-mode",
    "atlas-final-review",
]
expected_scenarios = [
    "novel",
    "family-saga",
    "psychological-novel",
    "article",
    "institutional-satire",
    "investigative-nonfiction",
    "trial-review",
    "canon-audit",
    "testimony-dossier",
    "migration-novel",
    "essay",
    "docs",
    "code",
    "hybrid",
]
expected_operational = [
    "fact_prosecutor",
    "defense_editor",
    "trial_judge",
    "copy_chief",
    "legal_reviewer",
    "audience_editor",
    "continuity_archivist",
]
expected_contemporary = [
    "alexievich",
    "tokarczuk",
    "ferrante",
    "roy",
    "gurnah",
    "han_kang",
]
expected_briefs = [
    "Publication trial brief",
    "Canon continuity audit brief",
    "Polyphonic testimony dossier brief",
    "Migration memory novel brief",
]
expected_routing_rules = [
    "publication_trial",
    "canon_audit",
    "polyphonic_testimony_project",
    "migration_memory_novel",
]

newsroom = yaml.safe_load((root / "newsroom.yaml").read_text())
imprints = yaml.safe_load((root / "imprints.yaml").read_text())
samples = yaml.safe_load((root / "sample_instructions.yaml").read_text())
config = yaml.safe_load((profile_root / "config.yaml").read_text())

assert len(imprints["imprints"]) == 5, f"expected 5 imprints, found {len(imprints['imprints'])}"
assert "canon_memory_protocol" in newsroom, "missing canon_memory_protocol"
assert "operational_roles" in newsroom, "missing operational_roles"

personalities = config["agent"]["personalities"]
agent_files = sorted(path.name for path in (root / "agents").glob("atlas_*.yaml"))
manifest_agent_files = newsroom["agent_files"]
skill_dirs = sorted(path.name for path in skills_root.iterdir() if path.is_dir())
sample_names = {item["name"] for item in samples["sample_instructions"]}

missing_personalities = sorted(
    name
    for name in expected_operational + expected_contemporary
    if name not in personalities
)
assert not missing_personalities, f"missing personalities: {missing_personalities}"

missing_rules = sorted(
    name for name in expected_routing_rules if name not in newsroom["task_routing_rules"]
)
assert not missing_rules, f"missing routing rules: {missing_rules}"

missing_briefs = sorted(name for name in expected_briefs if name not in sample_names)
assert not missing_briefs, f"missing sample briefs: {missing_briefs}"

assert len(personalities) == len(agent_files) == len(manifest_agent_files) == 36, (
    len(personalities),
    len(agent_files),
    len(manifest_agent_files),
)
assert skill_dirs == sorted(expected_skills), f"unexpected skill directories: {skill_dirs}"

readme = (root / "README.md").read_text()
profile_readme = (root / "hermes-profile" / "README.md").read_text()

for skill_name in expected_skills:
    readme_ref = f"skills/creative/{skill_name}/SKILL.md"
    profile_readme_ref = f"atlas-editorial-house/skills/creative/{skill_name}/SKILL.md"
    assert readme_ref in readme, f"missing {readme_ref} in top-level README"
    assert profile_readme_ref in profile_readme, f"missing {profile_readme_ref} in hermes-profile README"

for scenario in expected_scenarios:
    command_ref = f"launch-example.sh {scenario}"
    assert scenario in readme, f"missing scenario {scenario} in top-level README"
    assert command_ref in profile_readme, f"missing {command_ref} in hermes-profile README"

print(
    f"Validated {len(personalities)} personalities, {len(agent_files)} agent files, "
    f"{len(skill_dirs)} skills, and {len(expected_scenarios)} launcher scenarios."
)
PY

log_info "Checking shell syntax"
for script_path in \
    "$script_dir/hermes-profile/install-profile.sh" \
    "$script_dir/hermes-profile/run-local-hermes.sh" \
    "$script_dir/hermes-profile/show-commands.sh" \
    "$script_dir/hermes-profile/launch-example.sh" \
    "$script_dir/smoke-test.sh"
do
    bash -n "$script_path"
done

log_info "Checking dry-run commands"
"$script_dir/hermes-profile/install-profile.sh" \
    --dry-run \
    --target-dir "$tmp_dir/profile" \
    >/dev/null

"$script_dir/hermes-profile/run-local-hermes.sh" \
    --dry-run \
    --session-name atlas-smoke \
    --chat-query "Use the atlas-editorial-house skill and produce a smoke test acknowledgement." \
    >/dev/null

log_info "Checking launcher presets and command helper output"
declare -A scenario_skill=(
    [novel]="atlas-writers-room"
    [family-saga]="atlas-writers-room"
    [psychological-novel]="atlas-writers-room"
    [article]="atlas-editorial-house"
    [institutional-satire]="atlas-writers-room"
    [investigative-nonfiction]="atlas-writers-room"
    [trial-review]="atlas-trial-mode"
    [canon-audit]="atlas-canon-memory"
    [testimony-dossier]="atlas-writers-room"
    [migration-novel]="atlas-writers-room"
    [essay]="atlas-editorial-house"
    [docs]="atlas-editorial-house"
    [code]="atlas-writers-room"
    [hybrid]="atlas-writers-room"
)

scenario_order=(
    novel
    family-saga
    psychological-novel
    article
    institutional-satire
    investigative-nonfiction
    trial-review
    canon-audit
    testimony-dossier
    migration-novel
    essay
    docs
    code
    hybrid
)

helper_output="$("$script_dir/hermes-profile/show-commands.sh" skills)"
personality_output="$("$script_dir/hermes-profile/show-commands.sh" personalities)"

for scenario in "${scenario_order[@]}"; do
    prompt_output="$("$script_dir/hermes-profile/launch-example.sh" "$scenario" --prompt-only)"
    expected_skill="${scenario_skill[$scenario]}"

    grep -Fq "$expected_skill" <<<"$prompt_output" || die "Scenario $scenario does not route through $expected_skill"
    grep -Fq "./hermes-profile/launch-example.sh $scenario" <<<"$helper_output" || die "show-commands.sh is missing $scenario"
done

for overlay in \
    alexievich \
    tokarczuk \
    ferrante \
    roy \
    gurnah \
    han_kang \
    fact_prosecutor \
    defense_editor \
    trial_judge \
    copy_chief \
    legal_reviewer \
    audience_editor \
    continuity_archivist
do
    grep -Fq "/personality $overlay" <<<"$personality_output" || die "show-commands.sh is missing /personality $overlay"
done

log_info "Atlas smoke tests passed"