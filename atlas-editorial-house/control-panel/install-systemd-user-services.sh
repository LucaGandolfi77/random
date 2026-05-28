#!/usr/bin/env bash
set -euo pipefail

log_info() {
    printf '[INFO] %s\n' "$*"
}

log_warn() {
    printf '[WARN] %s\n' "$*" >&2
}

die() {
    printf '[ERROR] %s\n' "$*" >&2
    exit 1
}

usage() {
    cat <<'EOF'
Usage: ./control-panel/install-systemd-user-services.sh <command> [options]

Commands:
  check              Validate the control scripts, environment file, and rendered user units.
  install            Install or refresh the user units under ~/.config/systemd/user/.
  start              Install, enable, and start the Atlas control server and Telegram bot.
  stop               Stop both user services.
  restart            Restart both user services after refreshing the unit files.
  status             Show systemd status for both user services.
  logs [server|bot]  Show recent journal lines. Default target: both services.
  uninstall          Stop, disable, and remove the user units. Keeps the env file.

Options:
  --env-file <path>  Environment file to load. Default: ./control-panel/telegram-control.env
  --log-lines <n>    Journal lines to print for the logs command. Default: 80
  --help             Show this help text.

Notes:
  - Copy ./control-panel/telegram-control.env.example to ./control-panel/telegram-control.env and fill in the Telegram values.
  - The generated user units reference the chosen env file by absolute path.
  - For restart-after-logout behavior on hosts that support it, enable lingering with:
      loginctl enable-linger "$USER"
EOF
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"
default_env_file="$script_dir/telegram-control.env"
example_env_file="$script_dir/telegram-control.env.example"
template_dir="$script_dir/systemd"
user_systemd_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
server_unit_name="atlas-control-server.service"
bot_unit_name="atlas-telegram-bot.service"
log_lines=80

command_name="${1:-}"
[[ -n "$command_name" ]] || {
    usage >&2
    exit 1
}
shift || true

log_target="both"
if [[ "$command_name" == "logs" ]]; then
    case "${1:-}" in
        server|bot)
            log_target="$1"
            shift
            ;;
        ""|--*)
            ;;
        *)
            die "Unknown logs target: $1"
            ;;
    esac
fi

env_file="$default_env_file"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)
            [[ $# -ge 2 ]] || die "Missing value for --env-file"
            env_file="$2"
            shift 2
            ;;
        --log-lines)
            [[ $# -ge 2 ]] || die "Missing value for --log-lines"
            log_lines="$2"
            shift 2
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

case "$command_name" in
    check|install|start|stop|restart|status|logs|uninstall)
        ;;
    *)
        die "Unknown command: $command_name"
        ;;
esac

if [[ "$env_file" != /* ]]; then
    env_file="$(pwd -P)/$env_file"
fi

command -v systemctl >/dev/null 2>&1 || die "systemctl is required"
command -v python3 >/dev/null 2>&1 || die "python3 is required"

escape_sed_replacement() {
    printf '%s' "$1" | sed -e 's/[|&]/\\&/g'
}

load_env_file() {
    [[ -f "$env_file" ]] || die "Environment file not found: $env_file"

    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a

    ATLAS_CONTROL_HOST="${ATLAS_CONTROL_HOST:-127.0.0.1}"
    ATLAS_CONTROL_PORT="${ATLAS_CONTROL_PORT:-8765}"
    ATLAS_CONTROL_PROFILE="${ATLAS_CONTROL_PROFILE:-atlas-editorial-house}"
    expected_control_server="http://${ATLAS_CONTROL_HOST}:${ATLAS_CONTROL_PORT}"

    if [[ -z "${ATLAS_CONTROL_SERVER:-}" ]]; then
        ATLAS_CONTROL_SERVER="$expected_control_server"
    elif [[ "$ATLAS_CONTROL_SERVER" != "$expected_control_server" ]]; then
        log_warn "ATLAS_CONTROL_SERVER is $ATLAS_CONTROL_SERVER but host/port imply $expected_control_server"
    fi

    if [[ -z "${ATLAS_TELEGRAM_BOT_TOKEN:-}" ]]; then
        log_warn "ATLAS_TELEGRAM_BOT_TOKEN is empty in $env_file"
    fi

    if [[ -z "${ATLAS_TELEGRAM_CHAT_ID:-}" ]]; then
        log_warn "ATLAS_TELEGRAM_CHAT_ID is empty in $env_file; the bot will accept any chat"
    fi
}

ensure_env_file() {
    if [[ -f "$env_file" ]]; then
        return 0
    fi

    [[ -f "$example_env_file" ]] || die "Example env file not found: $example_env_file"
    mkdir -p "$(dirname "$env_file")"
    cp "$example_env_file" "$env_file"
    chmod 600 "$env_file" || true
    log_warn "Created $env_file from the example template. Fill in the Telegram values before starting the bot."
}

render_unit() {
    local template_path="$1"
    local target_path="$2"
    local escaped_root escaped_env

    escaped_root="$(escape_sed_replacement "$repo_root")"
    escaped_env="$(escape_sed_replacement "$env_file")"

    sed \
        -e "s|__ATLAS_ROOT__|$escaped_root|g" \
        -e "s|__ATLAS_ENV_FILE__|$escaped_env|g" \
        "$template_path" > "$target_path"
}

render_units_to_dir() {
    local target_dir="$1"

    mkdir -p "$target_dir"
    render_unit "$template_dir/$server_unit_name.in" "$target_dir/$server_unit_name"
    render_unit "$template_dir/$bot_unit_name.in" "$target_dir/$bot_unit_name"
    chmod 0644 "$target_dir/$server_unit_name" "$target_dir/$bot_unit_name"
}

verify_rendered_units() {
    local tmp_dir

    tmp_dir="$(mktemp -d)"
    render_units_to_dir "$tmp_dir"

    if command -v systemd-analyze >/dev/null 2>&1; then
        systemd-analyze verify \
            "$tmp_dir/$server_unit_name" \
            "$tmp_dir/$bot_unit_name" >/dev/null
    fi

    rm -rf "$tmp_dir"
}

install_units() {
    render_units_to_dir "$user_systemd_dir"
    systemctl --user daemon-reload
    log_info "Installed $server_unit_name and $bot_unit_name into $user_systemd_dir"
}

run_script_checks() {
    python3 "$repo_root/control-panel/server.py" --check >/dev/null
    python3 "$repo_root/control-panel/telegram_control_bot.py" --check >/dev/null
}

require_startup_secrets() {
    if [[ -z "${ATLAS_TELEGRAM_BOT_TOKEN:-}" ]]; then
        die "ATLAS_TELEGRAM_BOT_TOKEN is required before starting the Telegram bot"
    fi
}

show_status() {
    systemctl --user --no-pager --full status "$server_unit_name" "$bot_unit_name" || true
}

case "$command_name" in
    check)
        load_env_file
        verify_rendered_units
        run_script_checks
        log_info "Atlas systemd user-service setup validates cleanly"
        ;;
    install)
        ensure_env_file
        load_env_file
        verify_rendered_units
        install_units
        if [[ -z "${ATLAS_TELEGRAM_BOT_TOKEN:-}" ]]; then
            log_warn "The env file is still missing ATLAS_TELEGRAM_BOT_TOKEN, so start will fail until you fill it in"
        fi
        ;;
    start)
        ensure_env_file
        load_env_file
        require_startup_secrets
        verify_rendered_units
        install_units
        systemctl --user enable --now "$server_unit_name" "$bot_unit_name"
        show_status
        ;;
    stop)
        systemctl --user stop "$bot_unit_name" "$server_unit_name"
        ;;
    restart)
        ensure_env_file
        load_env_file
        require_startup_secrets
        verify_rendered_units
        install_units
        systemctl --user restart "$server_unit_name" "$bot_unit_name"
        show_status
        ;;
    status)
        show_status
        ;;
    logs)
        case "$log_target" in
            server)
                journalctl --user -u "$server_unit_name" -n "$log_lines" --no-pager
                ;;
            bot)
                journalctl --user -u "$bot_unit_name" -n "$log_lines" --no-pager
                ;;
            both)
                journalctl --user \
                    -u "$server_unit_name" \
                    -u "$bot_unit_name" \
                    -n "$log_lines" \
                    --no-pager
                ;;
        esac
        ;;
    uninstall)
        systemctl --user disable --now "$bot_unit_name" "$server_unit_name" >/dev/null 2>&1 || true
        rm -f "$user_systemd_dir/$server_unit_name" "$user_systemd_dir/$bot_unit_name"
        systemctl --user daemon-reload
        log_info "Removed Atlas user units from $user_systemd_dir"
        ;;
esac