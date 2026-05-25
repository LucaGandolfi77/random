#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import textwrap
import time
from pathlib import Path
from typing import Any
from urllib import error, parse, request


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SERVER = os.environ.get("ATLAS_CONTROL_SERVER", "http://127.0.0.1:8765")


def http_json(url: str, *, method: str = "GET", payload: dict[str, Any] | None = None, token: str | None = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Atlas-Token"] = token

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def send_telegram(token: str, method_name: str, payload: dict[str, Any]) -> Any:
    body = parse.urlencode(payload).encode("utf-8")
    req = request.Request(
        f"https://api.telegram.org/bot{token}/{method_name}",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def tg_send_message(token: str, chat_id: int, text: str) -> None:
    send_telegram(
        token,
        "sendMessage",
        {
            "chat_id": str(chat_id),
            "text": text,
            "disable_web_page_preview": "true",
        },
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Telegram control bridge for Atlas private control server")
    parser.add_argument("--server", default=DEFAULT_SERVER)
    parser.add_argument("--bot-token", default=os.environ.get("ATLAS_TELEGRAM_BOT_TOKEN"))
    parser.add_argument("--allowed-chat-id", default=os.environ.get("ATLAS_TELEGRAM_CHAT_ID"))
    parser.add_argument("--control-token", default=os.environ.get("ATLAS_CONTROL_TOKEN"))
    parser.add_argument("--poll-timeout", type=int, default=30)
    parser.add_argument("--check", action="store_true", help="Validate env/config and exit")
    return parser.parse_args()


def usage_text() -> str:
    return textwrap.dedent(
        """
        Atlas Telegram bridge commands:

        /start
        /help
        /scenarios
        /agents
        /preview <scenario>
        /run <scenario>
        /custom <prompt text>
        /status <job_id>

        Notes:
        - The bot talks only to the local Atlas private control server.
        - For safety, set ATLAS_TELEGRAM_CHAT_ID to restrict one Telegram chat.
        - For write endpoints, ATLAS_CONTROL_TOKEN should match the control server token if one is configured.
        """
    ).strip()


def handle_command(text: str, server: str, control_token: str | None) -> str:
    command, _, arg_text = text.strip().partition(" ")
    arg_text = arg_text.strip()

    if command in {"/start", "/help"}:
        return usage_text()

    if command == "/scenarios":
        data = http_json(f"{server}/api/scenarios")
        return "Available scenarios:\n" + "\n".join(f"- {item['id']}: {item['label']}" for item in data["scenarios"])

    if command == "/agents":
        data = http_json(f"{server}/api/agents")
        items = data["agents"][:36]
        return "Available personalities:\n" + "\n".join(f"- {item['slug']}: {item['description']}" for item in items)

    if command == "/preview":
        if not arg_text:
            return "Usage: /preview <scenario>"
        data = http_json(
            f"{server}/api/preview",
            method="POST",
            payload={"scenario": arg_text},
            token=control_token,
        )
        return f"Preview for {arg_text}:\n\n{data['prompt'][:3000]}"

    if command == "/run":
        if not arg_text:
            return "Usage: /run <scenario>"
        data = http_json(
            f"{server}/api/run",
            method="POST",
            payload={"scenario": arg_text},
            token=control_token,
        )
        return f"Started {data['job_id']} for scenario {data.get('scenario') or arg_text}. Status: {data['status']}"

    if command == "/custom":
        if not arg_text:
            return "Usage: /custom <prompt text>"
        data = http_json(
            f"{server}/api/custom-run",
            method="POST",
            payload={"prompt": arg_text},
            token=control_token,
        )
        return f"Started custom job {data['job_id']}. Status: {data['status']}"

    if command == "/status":
        if not arg_text:
            return "Usage: /status <job_id>"
        data = http_json(f"{server}/api/jobs/{arg_text}?tail=40")
        stdout_tail = data.get("stdout_tail", "")[-1500:]
        stderr_tail = data.get("stderr_tail", "")[-900:]
        body = [
            f"Job: {data['job_id']}",
            f"Status: {data['status']}",
            f"Scenario: {data.get('scenario') or 'custom'}",
            f"Profile: {data.get('profile')}",
            "",
            "STDOUT tail:",
            stdout_tail or "(empty)",
        ]
        if stderr_tail:
            body.extend(["", "STDERR tail:", stderr_tail])
        return "\n".join(body)

    return "Unknown command. Use /help."


def main() -> int:
    args = parse_args()

    if args.check:
        print(
            json.dumps(
                {
                    "server": args.server,
                    "has_bot_token": bool(args.bot_token),
                    "allowed_chat_id": args.allowed_chat_id,
                    "has_control_token": bool(args.control_token),
                },
                indent=2,
            )
        )
        return 0

    if not args.bot_token:
        raise SystemExit("ATLAS_TELEGRAM_BOT_TOKEN or --bot-token is required")

    allowed_chat_id = int(args.allowed_chat_id) if args.allowed_chat_id else None

    offset = None
    print(f"[INFO] Atlas Telegram bridge polling Telegram for server {args.server}")
    if allowed_chat_id is not None:
        print(f"[INFO] Restricting control to chat_id {allowed_chat_id}")

    while True:
        payload = {"timeout": str(args.poll_timeout)}
        if offset is not None:
            payload["offset"] = str(offset)

        try:
            data = send_telegram(args.bot_token, "getUpdates", payload)
            updates = data.get("result", [])
        except Exception as exc:  # pragma: no cover - network path
            print(f"[WARN] Telegram polling failed: {exc}", file=sys.stderr)
            time.sleep(3)
            continue

        for update in updates:
            offset = update["update_id"] + 1
            message = update.get("message") or update.get("edited_message")
            if not message:
                continue

            chat_id = int(message["chat"]["id"])
            if allowed_chat_id is not None and chat_id != allowed_chat_id:
                try:
                    tg_send_message(args.bot_token, chat_id, "This Atlas control bot is restricted to a different chat.")
                except Exception:
                    pass
                continue

            text = (message.get("text") or "").strip()
            if not text.startswith("/"):
                continue

            try:
                reply = handle_command(text, args.server, args.control_token)
            except error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                reply = f"Atlas server returned HTTP {exc.code}: {body}"
            except Exception as exc:
                reply = f"Command failed: {exc}"

            try:
                tg_send_message(args.bot_token, chat_id, reply[:4000])
            except Exception as exc:  # pragma: no cover - network path
                print(f"[WARN] Telegram send failed: {exc}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())