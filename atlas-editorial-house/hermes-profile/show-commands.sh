#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'EOF'
Usage: ./hermes-profile/show-commands.sh [section]

Print recommended Hermes commands for The Atlas Editorial House profile.

Sections:
  install         Show only installation commands
  startup         Show startup and profile commands
  books           Show autonomous book-production commands
  personalities   Show personality switch commands
  skills          Show skill usage examples
  all             Show the full cheat sheet (default)
EOF
}

print_install() {
    cat <<'EOF'
== Install ==

Preview the install:
  ./hermes-profile/install-profile.sh --dry-run

Install into the default Hermes home:
  ./hermes-profile/install-profile.sh

Install into a custom target directory:
  ./hermes-profile/install-profile.sh --target-dir /tmp/atlas-editorial-house-profile

Replace an existing installed profile safely:
  ./hermes-profile/install-profile.sh --force
EOF
}

print_startup() {
    cat <<'EOF'
== Startup ==

Start Hermes normally:
  hermes

Preferred local wrapper:
  ./hermes-profile/run-local-hermes.sh

One-shot local query through the wrapper:
  ./hermes-profile/run-local-hermes.sh --chat-query "Use the atlas-editorial-house skill and draft a release note."

If your Hermes setup supports profile commands, create or switch to a profile named atlas-editorial-house before chatting.

Once the profile is installed, keep the default SOUL persona active for newsroom-level behavior and use personality overlays only when you want a specific writer-agent.
EOF
}

print_books() {
    cat <<'EOF'
== Books ==

Write a full book with one command:
  ./write-book.sh --title "Red Inheritance" --theme "Political power, family betrayal, institutional decline"

Preview the exact prompt and Hermes invocation without running the model:
  ./write-book.sh --title "Red Inheritance" --theme "Political power, family betrayal, institutional decline" --dry-run

Resume an interrupted production run:
  ./write-book.sh --title "Red Inheritance" --theme "Political power, family betrayal, institutional decline" --resume

Add stronger production constraints and an Italian translation pass:
  ./write-book.sh --title "Red Inheritance" --theme "Political power, family betrayal, institutional decline" --chapters 20 --min-words 3000 --italian
EOF
}

print_personalities() {
    cat <<'EOF'
== Personalities ==

Switch to a named Atlas overlay:
  /personality shakespeare
  /personality austen
  /personality dickens
  /personality dostoevsky
  /personality shelley
  /personality poe
  /personality tolstoy
  /personality woolf
  /personality kafka
  /personality borges
  /personality hemingway
  /personality dante
  /personality cervantes
  /personality bulgakov
  /personality allende
  /personality garcia_marquez
  /personality cortazar
  /personality lispector
  /personality bolano
  /personality morrison
  /personality le_guin
  /personality achebe
  /personality oe
  /personality alexievich
  /personality tokarczuk
  /personality ferrante
  /personality roy
  /personality gurnah
  /personality han_kang

Operational overlays:
  /personality fact_prosecutor
  /personality defense_editor
  /personality trial_judge
  /personality copy_chief
  /personality legal_reviewer
  /personality audience_editor
  /personality continuity_archivist

Clear the active overlay and return to the newsroom default:
  /personality none
EOF
}

print_skills() {
    cat <<'EOF'
== Skills ==

Use the Atlas newsroom skill when you want general routing and strong output behavior:
  Use the atlas-editorial-house skill and write a 1200-word feature about urban logistics.

Use the imprint skill when you want a house line selected before drafting:
  Use the atlas-imprints skill and route this as Atlas Noir for an investigative novella about a municipal records bureau.

Use the writers' room skill when you want explicit lead, reviewer, handoff, and arbitration planning:
  Use the atlas-writers-room skill to plan a hybrid narrative-plus-code project about predictive infrastructure.

Use the final review skill when you want severity triage and a ship/no-ship decision:
  Use the atlas-final-review skill to review this documentation set and decide whether it should ship.

Use the trial skill when you want an adversarial publication hearing before release:
  Use the atlas-trial-mode skill to put this corruption feature through prosecution, defense, legal review, and verdict.

Use the canon skill when you want a living ledger of stable facts and a cemetery for cut material:
  Use the atlas-canon-memory skill to audit a serialized project, update canon, and archive discarded but reusable pages.

Example combined flows:
  /personality shelley
  Use the atlas-writers-room skill to route a software tool project and assign lead, reviewer, critic, and finisher.

  /personality hemingway
  Use the atlas-final-review skill to review this release note and code summary for ship readiness.

  /personality woolf
  Use the atlas-editorial-house skill to draft humane developer documentation for a command-line tool.

Quick launcher examples:
  ./hermes-profile/launch-example.sh novel
  ./hermes-profile/launch-example.sh family-saga
  ./hermes-profile/launch-example.sh psychological-novel
  ./hermes-profile/launch-example.sh article
  ./hermes-profile/launch-example.sh institutional-satire
  ./hermes-profile/launch-example.sh investigative-nonfiction
  ./hermes-profile/launch-example.sh trial-review
  ./hermes-profile/launch-example.sh canon-audit
  ./hermes-profile/launch-example.sh testimony-dossier
  ./hermes-profile/launch-example.sh migration-novel
  ./hermes-profile/launch-example.sh essay
  ./hermes-profile/launch-example.sh docs
  ./hermes-profile/launch-example.sh code
  ./hermes-profile/launch-example.sh hybrid
  ./hermes-profile/launch-example.sh novel --translate-it

Preferred guarded execution:
  ./hermes-profile/run-local-hermes.sh
  ./hermes-profile/launch-example.sh novel --run
EOF
}

section="${1:-all}"

case "$section" in
    install)
        print_install
        ;;
    startup)
        print_startup
        ;;
  books)
    print_books
    ;;
    personalities)
        print_personalities
        ;;
    skills)
        print_skills
        ;;
    all)
        print_install
        printf '\n'
        print_startup
        printf '\n'
      print_books
      printf '\n'
        print_personalities
        printf '\n'
        print_skills
        ;;
    --help|-h|help)
        usage
        ;;
    *)
        printf '[ERROR] Unknown section: %s\n' "$section" >&2
        usage >&2
        exit 1
        ;;
esac