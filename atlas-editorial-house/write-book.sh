#!/usr/bin/env bash
# write-book.sh — single-command entrypoint for autonomous Atlas book production.
#
# Usage:
#   ./write-book.sh [options]
#   ./write-book.sh --title "A River Runs Between Us" --theme "Migration, memory, belonging" --chapters 20
#   ./write-book.sh --title "Red Council" --theme "Political power, family betrayal" --italian
#
# Options:
#   --title <text>        Book title. Required.
#   --theme <text>        Core themes, comma-separated. Required.
#   --genre <text>        Genre or literary style. Default: literary novel
#   --chapters <n>        Number of chapters. Default: 20
#   --min-words <n>       Minimum words per chapter. Default: 3000
#   --slug <text>         Output directory slug under local-output/books/. Default: derived from title.
#   --italian             Translate the completed English manuscript into Italian.
#   --language <code>     Translate into a language other than Italian. Example: fr, de, es.
#   --model <id>          OpenRouter model. Default: openai/gpt-4.1-mini
#   --provider <name>     Hermes provider. Default: openrouter
#   --imprint <name>      Atlas imprint: noir, civic, lab, heresy, sunday-review. Default: auto.
#   --resume              Resume an interrupted production run from the last completed file.
#   --dry-run             Print the resolved prompt and command without running Hermes.
#   --help                Show this help text.
#
# Notes:
#   - This script always passes --allow-tools to enable file writes through Hermes.
#   - The Director agent orchestrates the full pipeline without needing human input between stages.
#   - Output lands under local-output/books/<slug>/.
set -euo pipefail

log_info() {
    printf '[INFO] %s\n' "$*"
}

die() {
    printf '[ERROR] %s\n' "$*" >&2
    exit 1
}

usage() {
    sed -n '3,30p' "${BASH_SOURCE[0]}"
}

slugify() {
    local value

    value="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
    value="$(printf '%s' "$value" | tr -cs 'a-z0-9' '-')"
    value="${value#-}"
    value="${value%-}"

    if [[ -z "$value" ]]; then
        value="atlas-book"
    fi

    printf '%s\n' "$value"
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
wrapper="$script_dir/hermes-profile/run-local-hermes.sh"
allowed_output_root="$script_dir/local-output"

title=""
theme=""
genre="literary novel"
chapters=20
min_words=3000
slug=""
translation_lang=""
model="${ATLAS_WRITE_BOOK_MODEL:-openai/gpt-4.1-mini}"
provider="${ATLAS_HERMES_PROVIDER:-openrouter}"
imprint="auto"
resume=0
dry_run=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --title)
            [[ $# -ge 2 ]] || die "Missing value for --title"
            title="$2"
            shift 2
            ;;
        --theme)
            [[ $# -ge 2 ]] || die "Missing value for --theme"
            theme="$2"
            shift 2
            ;;
        --genre)
            [[ $# -ge 2 ]] || die "Missing value for --genre"
            genre="$2"
            shift 2
            ;;
        --chapters)
            [[ $# -ge 2 ]] || die "Missing value for --chapters"
            chapters="$2"
            shift 2
            ;;
        --min-words)
            [[ $# -ge 2 ]] || die "Missing value for --min-words"
            min_words="$2"
            shift 2
            ;;
        --slug)
            [[ $# -ge 2 ]] || die "Missing value for --slug"
            slug="$2"
            shift 2
            ;;
        --italian)
            translation_lang="it"
            shift
            ;;
        --language)
            [[ $# -ge 2 ]] || die "Missing value for --language"
            translation_lang="$2"
            shift 2
            ;;
        --model)
            [[ $# -ge 2 ]] || die "Missing value for --model"
            model="$2"
            shift 2
            ;;
        --provider)
            [[ $# -ge 2 ]] || die "Missing value for --provider"
            provider="$2"
            shift 2
            ;;
        --imprint)
            [[ $# -ge 2 ]] || die "Missing value for --imprint"
            imprint="$2"
            shift 2
            ;;
        --resume)
            resume=1
            shift
            ;;
        --dry-run)
            dry_run=1
            shift
            ;;
        --help|-h|help)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1. Run --help for usage."
            ;;
    esac
done

[[ -n "$title" ]] || die "--title is required"
[[ -n "$theme" ]] || die "--theme is required"

if [[ -z "$slug" ]]; then
    slug="$(slugify "$title")"
fi

output_dir="$allowed_output_root/books/$slug"

translation_block=""
if [[ -n "$translation_lang" ]]; then
    case "$translation_lang" in
        it|italian)
            translation_block="After the English manuscript is complete, translate every chapter into Italian. Write each Italian chapter to local-output/books/${slug}/it/chapter<NN>.it.md. Write translation notes (key decisions for political language, family register, and emotionally charged passages) to local-output/books/${slug}/98_translation_notes.md."
            ;;
        *)
            translation_block="After the English manuscript is complete, translate every chapter into ${translation_lang}. Write each translated chapter to local-output/books/${slug}/${translation_lang}/chapter<NN>.${translation_lang}.md. Write translation notes to local-output/books/${slug}/98_translation_notes.md."
            ;;
    esac
fi

imprint_block=""
if [[ "$imprint" != "auto" ]]; then
    imprint_block="Apply the ${imprint} editorial imprint from the Atlas house imprint manifest when choosing tone, routing, and publication posture."
fi

resume_block=""
if [[ "$resume" -eq 1 ]]; then
    resume_block="Before starting, scan local-output/books/${slug}/ for any existing files. If chapter files already exist and are non-empty, treat them as complete and resume from the next missing chapter. Do not re-draft chapters that already exist."
fi

build_prompt() {
    printf 'Use the atlas-book-factory skill and the Director agent.\n'
    printf '\n'
    printf 'Project brief:\n'
    printf '- Title: %s\n' "$title"
    printf '- Theme: %s\n' "$theme"
    printf '- Genre: %s\n' "$genre"
    printf '- Chapters: %d\n' "$chapters"
    printf '- Minimum words per chapter (English): %d\n' "$min_words"
    printf '- Output directory: local-output/books/%s/\n' "$slug"

    if [[ -n "$translation_block" ]]; then
        printf '- Translation required: yes\n'
    else
        printf '- Translation required: no\n'
    fi

    if [[ -n "$imprint_block" ]]; then
        printf '\n%s\n' "$imprint_block"
    fi

    if [[ -n "$resume_block" ]]; then
        printf '\n%s\n' "$resume_block"
    fi

    printf '\nRequired files:\n'
    printf '  local-output/books/%s/00_work_order.md\n' "$slug"
    printf '  local-output/books/%s/01_outline.md\n' "$slug"
    printf '  local-output/books/%s/02_voice_guide.md\n' "$slug"
    printf '  local-output/books/%s/03_character_bible.md\n' "$slug"
    printf '  local-output/books/%s/04_revision_strategy.md\n' "$slug"

    local n
    for (( n=1; n<=chapters; n++ )); do
        printf '  local-output/books/%s/chapter%02d.md\n' "$slug" "$n"
    done

    if [[ -n "$translation_lang" ]]; then
        for (( n=1; n<=chapters; n++ )); do
            printf '  local-output/books/%s/%s/chapter%02d.%s.md\n' \
                "$slug" "$translation_lang" "$n" "$translation_lang"
        done
        printf '  local-output/books/%s/98_translation_notes.md\n' "$slug"
    fi

    printf '  local-output/books/%s/99_manifest.md\n' "$slug"

    if [[ -n "$translation_block" ]]; then
        printf '\nTranslation instructions:\n%s\n' "$translation_block"
    fi

    printf '\nAutonomy contract:\n'
    printf '- Assemble the team. Write 00_work_order.md with the team, route, and definition of done.\n'
    printf '- Produce all four planning documents before drafting chapter 01.\n'
    printf '- Draft, review, critique, refine, and finish each chapter before moving to the next.\n'
    printf '- Write each completed chapter to its file immediately. Do not hold content in memory.\n'
    printf '- Update 03_character_bible.md whenever names, institutions, or relationships change.\n'
    printf '- Do not stop to ask for confirmation between stages.\n'
    printf '- Do not return only a plan. Write the files.\n'
    printf '- Only stop when 99_manifest.md records every required file as complete.\n'
    printf '\nQuality rules:\n'
    printf '- Every English chapter must be at least %d words before it is recorded as complete.\n' "$min_words"
    printf '- The critic must name at least one specific risk per chapter before sign-off.\n'
    printf '- The finisher must normalize terminology and remove padding before sign-off.\n'
    printf '- The book must feel like one coherent novel, not a series of disconnected episodes.\n'
    printf '- Maintain continuity of character names, timelines, institutions, and symbolic motifs.\n'
}

session_name="book-$(slugify "$title")-$(date -u +%Y%m%dT%H%M%SZ)"
prompt="$(build_prompt)"

if [[ "$dry_run" -eq 1 ]]; then
    log_info "Dry run — resolved parameters:"
    log_info "  Title     : $title"
    log_info "  Theme     : $theme"
    log_info "  Genre     : $genre"
    log_info "  Chapters  : $chapters"
    log_info "  Min words : $min_words"
    log_info "  Slug      : $slug"
    log_info "  Output    : $output_dir"
    log_info "  Language  : ${translation_lang:-none}"
    log_info "  Imprint   : $imprint"
    log_info "  Model     : $model"
    log_info "  Provider  : $provider"
    log_info "  Resume    : $resume"
    printf '\n--- PROMPT ---\n%s\n--- END PROMPT ---\n' "$prompt"
    printf '\nCommand:\n'
    printf '  %q' "$wrapper" \
        --profile atlas-editorial-house \
        --provider "$provider" \
        --model "$model" \
        --allow-tools \
        --session-name "$session_name" \
        --chat-query "$prompt"
    printf '\n'
    exit 0
fi

log_info "Starting autonomous book production"
log_info "  Title    : $title"
log_info "  Theme    : $theme"
log_info "  Chapters : $chapters (min ${min_words} words each)"
log_info "  Output   : $output_dir"
if [[ -n "$translation_lang" ]]; then
    log_info "  Language : English + ${translation_lang}"
fi
log_info "  Model    : $model"

exec "$wrapper" \
    --profile atlas-editorial-house \
    --provider "$provider" \
    --model "$model" \
    --allow-tools \
    --session-name "$session_name" \
    --chat-query "$prompt"
