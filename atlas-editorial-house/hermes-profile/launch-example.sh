#!/usr/bin/env bash
set -euo pipefail

log_error() {
    printf '[ERROR] %s\n' "$*" >&2
}

die() {
    log_error "$*"
    exit 1
}

usage() {
    cat <<'EOF'
Usage: ./hermes-profile/launch-example.sh <scenario> [options]

Scenarios:
  novel     Literary novel planning and first-pass routing
    family-saga            Political family saga planning and routing
    psychological-novel    Psychological novel planning and routing
  article   Newspaper or magazine feature drafting
    institutional-satire   Institutional satire planning and routing
    investigative-nonfiction  Investigative literary nonfiction planning and routing
    trial-review           Adversarial publication trial and verdict routing
    canon-audit            Canon ledger and cemetery update routing
    testimony-dossier      Polyphonic testimony and witness-structure routing
    migration-novel        Migration memory novel planning and routing
    essay     Philosophical or analytical essay drafting
  docs      Technical documentation drafting
  code      Software tool design and implementation
    hybrid    Hybrid narrative-plus-code project routing

Options:
  --profile <name>   Hermes profile name. Default: atlas-editorial-house
    --run              Execute through run-local-hermes.sh instead of printing the command
    --translate-it     Add a final faithful Italian translation step in modern language
  --prompt-only      Print only the prompt text
  --command-only     Print only the suggested Hermes command
  --help             Show this help text

Notes:
  - Default behavior is preview-only.
    - Direct execution uses the local wrapper under ./hermes-profile/run-local-hermes.sh.
    - Italian translation is opt-in and appended as the final delivery step.
EOF
}

escape_single_quotes() {
    printf "%s" "$1" | sed "s/'/'\\''/g"
}

append_translation_step() {
    prompt_text="$prompt_text After completing the main deliverable in English, add a final section titled Italian Translation. Translate the full result into contemporary Italian with professional translation and interpreting judgment: preserve meaning, structure, tone, technical nuance, and rhetorical force; avoid literal calques, omissions, and embellishment. Prefer precise, natural, modern Italian."
}

build_scenario() {
    local scenario

    scenario="$1"

    case "$scenario" in
        novel)
            scenario_title="Literary Novel"
            recommended_personality="tolstoy"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route this as a serious literary novel project for The Atlas Editorial House. Develop a chapter-by-chapter plan for a literary novel about political inheritance, family obligation, and institutional decline. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, and produce an outline, voice guidance, and revision strategy in English."
            ;;
        family-saga)
            scenario_title="Political Family Saga"
            recommended_personality="allende"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route this as a political family saga for The Atlas Editorial House. Develop a multigenerational novel plan about land reform, exile, inheritance, and the collapse of a reformist coalition. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, and produce a family map, chapter architecture, voice guidance, and revision strategy in English."
            ;;
        psychological-novel)
            scenario_title="Psychological Novel"
            recommended_personality="dostoevsky"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route this as a psychological novel project for The Atlas Editorial House. Develop a novel plan about a public defender whose debt, ideological certainty, and fear of disgrace begin to distort every major decision. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, and produce the conflict map, chapter sequence, character pressure notes, and revision strategy in English."
            ;;
        article)
            scenario_title="Feature Article"
            recommended_personality="dickens"
            recommended_skill="atlas-editorial-house"
            prompt_text="Use the atlas-editorial-house skill. Write a 1500-word feature on the hidden labor behind modern logistics infrastructure. Make it accessible, grounded, and suitable for a serious general-interest publication. Before drafting, state the recommended route, including lead, reviewer, and finisher, then produce the article in English."
            ;;
        institutional-satire)
            scenario_title="Institutional Satire"
            recommended_personality="bulgakov"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route this as an institutional satire project for The Atlas Editorial House. Build a satirical fiction plan about a metropolitan licensing authority that keeps expanding its own rules until nobody can legally comply. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, and produce the premise, cast dynamics, escalation logic, and scene architecture in English."
            ;;
        investigative-nonfiction)
            scenario_title="Investigative Literary Nonfiction"
            recommended_personality="bolano"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route this as an investigative literary nonfiction project for The Atlas Editorial House. Build a reporting and narrative plan about private crisis-management firms that quietly shape public scandals behind the scenes. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, and produce the reporting structure, source-risk notes, narrative arc, and verification priorities in English."
            ;;
        trial-review)
            scenario_title="Publication Trial"
            recommended_personality="fact_prosecutor"
            recommended_skill="atlas-trial-mode"
            prompt_text="Use the atlas-trial-mode skill. Put a high-stakes investigative feature about a public procurement scandal through a publication trial. Name the prosecutor, defender, judge, legal reviewer, and finisher. Present the prosecution case, the defense case, the legal-risk notes, the judge's verdict, and the smallest fix set that would change the ruling. Write everything in English."
            ;;
        canon-audit)
            scenario_title="Canon Audit"
            recommended_personality="continuity_archivist"
            recommended_skill="atlas-canon-memory"
            prompt_text="Use the atlas-canon-memory skill. Audit a serialized civic-speculative project about a city reputation engine. Build a canon ledger for stable facts, timelines, institutions, and named entities; identify contradictions across prior drafts; and write cemetery notes for two cut scenes that should remain searchable but not canonical. Name the lead, reviewer, and finisher, and write everything in English."
            ;;
        testimony-dossier)
            scenario_title="Polyphonic Testimony Dossier"
            recommended_personality="alexievich"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route this as a polyphonic testimony dossier for The Atlas Editorial House. Build a reporting package about a poisoned industrial town ten years after the official cleanup. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, and produce witness classes, ethical interview constraints, structural sequencing, and verification priorities in English."
            ;;
        migration-novel)
            scenario_title="Migration Memory Novel"
            recommended_personality="gurnah"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route this as a migration memory novel for The Atlas Editorial House. Develop a literary novel plan about siblings separated by an Indian Ocean migration route and reunited inside a rapidly transforming port city. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, and produce the memory structure, class tensions, chapter architecture, and continuity risks in English."
            ;;
        essay)
            scenario_title="Philosophical Essay"
            recommended_personality="borges"
            recommended_skill="atlas-editorial-house"
            prompt_text="Use the atlas-editorial-house skill. Draft a philosophical essay on whether memory should be treated as an archive, a narrative, or a negotiation. Distinguish argument, evidence, and implication clearly. Before drafting, state the recommended route, including lead, reviewer, and finisher, then write the essay in English."
            ;;
        docs)
            scenario_title="Technical Documentation"
            recommended_personality="hemingway"
            recommended_skill="atlas-editorial-house"
            prompt_text="Use the atlas-editorial-house skill. Produce developer documentation for a command-line tool that provisions project templates, validates input, and writes audit logs. Include setup, usage examples, failure modes, extension points, and a concise route statement naming the recommended lead and finisher. Write everything in English."
            ;;
        code)
            scenario_title="Software Tool"
            recommended_personality="shelley"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route and begin a software tool project for The Atlas Editorial House. Design and implement a small tool that compares configuration files, highlights semantic differences, and outputs both a human-readable report and machine-readable JSON. State the lead, reviewer, critic, and finisher first, then provide the architecture, implementation plan, and initial code in English."
            ;;
        hybrid)
            scenario_title="Hybrid Narrative Plus Code"
            recommended_personality="shelley"
            recommended_skill="atlas-writers-room"
            prompt_text="Use the atlas-writers-room skill. Route a hybrid narrative-plus-code project for The Atlas Editorial House. Create a short narrative about a city-run predictive system and a functioning prototype that models risk categories and appeal workflows. Name the lead, reviewer, critic, and finisher, explain the handoff sequence, then provide the project architecture, narrative direction, and initial implementation plan in English."
            ;;
        *)
            die "Unknown scenario: $scenario"
            ;;
    esac
}

profile_name="atlas-editorial-house"
run_mode=0
translate_italian=0
prompt_only=0
command_only=0
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
wrapper_path="$script_dir/run-local-hermes.sh"

if [[ $# -lt 1 ]]; then
    usage >&2
    exit 1
fi

scenario="$1"
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)
            [[ $# -ge 2 ]] || die "Missing value for --profile"
            profile_name="$2"
            shift 2
            ;;
        --run)
            run_mode=1
            shift
            ;;
        --translate-it)
            translate_italian=1
            shift
            ;;
        --prompt-only)
            prompt_only=1
            shift
            ;;
        --command-only)
            command_only=1
            shift
            ;;
        --help|-h|help)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1"
            ;;
    esac
done

if [[ "$prompt_only" -eq 1 && "$command_only" -eq 1 ]]; then
    die "--prompt-only and --command-only cannot be used together"
fi

build_scenario "$scenario"

if [[ "$translate_italian" -eq 1 ]]; then
    append_translation_step
fi

escaped_prompt="$(escape_single_quotes "$prompt_text")"
hermes_command="./hermes-profile/run-local-hermes.sh --profile '$profile_name' --chat-query '$escaped_prompt'"

if [[ "$run_mode" -eq 1 ]]; then
    [[ -x "$wrapper_path" ]] || die "Wrapper not found or not executable: $wrapper_path"
    exec "$wrapper_path" --profile "$profile_name" --chat-query "$prompt_text"
fi

if [[ "$prompt_only" -eq 1 ]]; then
    printf '%s\n' "$prompt_text"
    exit 0
fi

if [[ "$command_only" -eq 1 ]]; then
    printf '%s\n' "$hermes_command"
    exit 0
fi

cat <<EOF
== Scenario ==

Name: $scenario_title
Recommended personality: /personality $recommended_personality
Recommended skill: $recommended_skill
Profile: $profile_name
Optional Italian translation: $(if [[ "$translate_italian" -eq 1 ]]; then printf 'enabled'; else printf 'disabled'; fi)

== Prompt ==

$prompt_text

== Suggested Command ==

$hermes_command
EOF