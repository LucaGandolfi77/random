#!/usr/bin/env bash

mdb_helpers_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=./log.sh
source "$mdb_helpers_dir/log.sh"
# shellcheck source=./tool_discovery.sh
source "$mdb_helpers_dir/tool_discovery.sh"

select_mdb_template() {
    local repo_root
    local family
    local mode
    local template_path

    repo_root="${1:?repo root is required}"
    family="${2:?family is required}"
    mode="${3:?mode is required}"
    template_path="$repo_root/tests/target/mdb/templates/${family}-${mode}.mdb.in"

    [[ -r "$template_path" ]] || die "MDB template not found: $template_path"
    printf '%s\n' "$template_path"
}

render_mdb_template() {
    local template_path
    local output_path
    local device
    local elf_path
    local hwtool
    local run_seconds
    local line

    template_path="${1:?template path is required}"
    output_path="${2:?output path is required}"
    device="${3:?device is required}"
    elf_path="${4:?elf path is required}"
    hwtool="${5:?hwtool is required}"
    run_seconds="${6:?run seconds is required}"

    [[ -r "$template_path" ]] || die "MDB template is not readable: $template_path"
    mkdir -p "$(dirname "$output_path")"
    : > "$output_path"

    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line//@DEVICE@/$device}"
        line="${line//@ELF@/$elf_path}"
        line="${line//@HWTOOL@/$hwtool}"
        line="${line//@RUN_SECONDS@/$run_seconds}"
        printf '%s\n' "$line" >> "$output_path"
    done < "$template_path"
}

extract_symbol_value() {
    local log_file
    local symbol_name
    local line
    local value

    log_file="${1:?log file is required}"
    symbol_name="${2:?symbol name is required}"

    [[ -f "$log_file" ]] || die "MDB log file not found: $log_file"

    line="$(grep -i "$symbol_name" "$log_file" | tail -n 1 || true)"
    [[ -n "$line" ]] || return 1

    value="$(printf '%s\n' "$line" | grep -Eo -- '-?[0-9]+' | tail -n 1 || true)"
    [[ -n "$value" ]] || return 1

    printf '%s\n' "$value"
}