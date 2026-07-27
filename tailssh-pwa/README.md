# TailSSH — SSH over Tailscale, as an installable iPhone PWA

An installable Progressive Web App that gives your iPhone a real SSH terminal,
SFTP file browser, and VNC screen viewer for your Mac/Linux machines — with
all traffic inside your Tailscale tailnet (end-to-end encrypted by WireGuard).

## How it works

Browsers and PWAs cannot open raw TCP sockets. TailSSH uses a tiny **relay**
(Node.js) that runs inside your tailnet and bridges WebSocket ↔ SSH:

```
┌────────────┐   WebSocket    ┌─────────────────┐    SSH      ┌───────────────┐
│ iPhone PWA │ ◄────────────► │ TailSSH relay   │ ◄─────────► │ your Mac /    │
│ terminal   │                │ (this project)  │   (22)      │ Linux machine │
│ file panel │                │                 │   SFTP      │               │
│ VNC viewer │                │                 │   VNC       │               │
└────────────┘                └─────────────────┘             └───────────────┘
        └─────────────── everything inside your tailnet ───────────────┘
```

Three views switchable while connected:

- **Terminal** — xterm.js with touch keyboard toolbar (Esc/Tab/Ctrl/arrows)
- **Files** — SFTP file browser: browse, download (share-sheet), upload, rename,
  delete, mkdir. Full basic operations.
- **Screen** — noVNC viewer: tunneled through the SSH connection to the target's
  VNC server (x11vnc, TigerVNC, macOS Screen Sharing). No extra open ports.

## Prerequisites

- [Tailscale](https://tailscale.com/download) installed and connected on:
  the relay machine, your iPhone, and the SSH target.
- Node.js ≥ 18 on the relay machine.
- **For Screen (VNC)**: a VNC server running on the target.
  - **macOS**: System Settings → Sharing → Screen Sharing
  - **Linux**: `sudo apt install x11vnc` then `x11vnc -display :0 -auth guess`
    (attach to your session) or `tigervncserver` for a virtual desktop

## Setup (5 minutes)

On the relay machine:

```bash
cd tailssh-pwa
npm install

# optional but recommended
export AUTH_TOKEN="pick-a-long-random-string"

npm start
```

Expose on your tailnet with TLS:

```bash
tailscale serve --bg 8022
tailscale serve status   # shows your https://<machine>.<tailnet>.ts.net URL
```

> First use may ask you to enable HTTPS for your tailnet
> (Tailscale admin console → DNS → HTTPS Certificates).

On your iPhone:

1. Connect Tailscale.
2. Open `https://<machine>.<tailnet>.ts.net` in **Safari**.
3. Tap **Share → Add to Home Screen**.
4. Launch **TailSSH**. Profiles are auto-saved — tap a chip to fill the form.
5. Connect with password or SSH key.
6. Use the **Terminal**, **Files**, and **Screen** tabs in the topbar.

## Features

### Saved connection profiles (client-side, non-secrets)

- Profiles are auto-created on successful connect (host + username).
- Tap a chip to fill the form instantly; ✕ to delete.
- "Save profile" button for explicit naming.
- Only host, port, username, and auth method are stored — no passwords or keys.

### SFTP file browser

- View files in the remote home directory.
- Breadcrumb navigation; tap directories to enter.
- **Download**: tap a file → it's assembled from chunks → saved via the iOS
  share sheet (or auto-download on other platforms).
- **Upload**: tap "Upload" → pick a file from your iPhone → streamed in chunks
  with a progress bar.
- **Rename / Delete**: long-press (or right-click) a row → action sheet.
- **New folder**: button in the bottom bar.
- Maximum file size: 100 MB (configurable via `MAX_SFTP_BYTES`).

### Screen (VNC over SSH, like WSL2)

- **Why not X11 forwarding?** WSLg works because Windows embeds a Wayland/RDP
  bridge. SSH's native graphical forwarding needs an X server on the *client*,
  and a browser PWA can't be one. **VNC tunneled over SSH** is the closest
  equivalent that works inside the PWA — no extra ports or configuration on
  the target beyond enabling SSH + VNC.
- When you switch to the **Screen** tab, the relay opens a second SSH
  connection to the same host, then uses `ssh2.forwardOut` to reach the target's
  VNC server (default `127.0.0.1:5900`). All VNC traffic travels inside the
  encrypted SSH tunnel.
- noVNC (vendored) renders the RFB protocol directly on a `<canvas>`.
- If the VNC server requires a password, noVNC will prompt you.
- **Server setup:**
  - **macOS**: System Settings → Sharing → Screen Sharing → set a VNC password
    (required for non-Mac clients).
  - **Linux (live desktop)**: `x11vnc -display :0 -auth guess -rfbauth ~/.vnc/passwd`
  - **Linux (virtual desktop)**: `tigervncserver` then connect to `:1` (5901).
  - The default `vncHost` is `127.0.0.1` (on the target machine). Override via
    `vncHost` / `vncPort` fields in the session creds (customize in future).

### Tailscale Funnel (public internet exposure — **discouraged**)

Tailscale Funnel exposes the relay to the **public internet** (anyone with
the URL can reach it, though traffic is still TLS-encrypted).

```bash
tailscale funnel --bg 8022
```

**If you enable funnel, you must:**

- Set a strong `AUTH_TOKEN` (the relay enforces it).
- Use `ALLOW_HOSTS` to limit which SSH destinations the relay may dial.
- Consider setting `ALLOWED_ORIGINS` to your funnel domain (the relay checks
  the `Origin` header on every WebSocket upgrade).
- Monitor logs for unauthorized connection attempts.

The relay also enforces per-IP rate limiting on WS connections and token
failures (temporary ban after too many attempts) regardless of Funnel/serve.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8022` | HTTP/WebSocket port |
| `HOST` | `127.0.0.1` | Bind address. Keep localhost + `tailscale serve`. |
| `AUTH_TOKEN` | *(off)* | Shared secret required before any SSH dial. **Strongly recommended.** |
| `ALLOW_HOSTS` | *(any)* | Comma-separated SSH destination allowlist, e.g. `mac-mini,100.64.1.5:2222` |
| `ALLOWED_ORIGINS` | *(same-host)* | Extra origins permitted for WebSocket connections (funnel). |
| `MAX_SFTP_BYTES` | `104857600` | Max single file size for SFTP download (100 MB). |
| `SFTP_CHUNK_SIZE` | `131072` | SFTP read/write chunk size (128 KB). |
| `RATE_LIMIT_CONNECTS` | `20` | Max WebSocket connections per IP per window. |
| `RATE_LIMIT_WINDOW` | `60000` | Rate-limit window in ms (1 minute). |
| `RATE_BAN_DURATION` | `120000` | Ban duration after rate limit exceeded (2 minutes). |

## Security

- The relay binds to **localhost** by default; `tailscale serve` is the only
  access path (tailnet-only by default).
- `AUTH_TOKEN` + `ALLOW_HOSTS` + rate limiting + origin checking all work
  together — multiple layers of defense.
- Secrets (passwords, SSH keys) are sent once over the encrypted WebSocket
  and **never stored** by the relay or the PWA. Profiles hold only
  non-secret fields.
- SSH key passphrases are ephemeral (in-memory only).
- For funnel: `tailscale funnel` adds public exposure — use only with
  mandatory token and strict `ALLOW_HOSTS`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Page won't open on iPhone | iPhone Tailscale connected? `tailscale serve status` shows the URL? |
| "Add to Home Screen" missing | Use Safari and the **https://** URL (HTTP can't install PWAs). |
| `SSH: connect ECONNREFUSED` | SSH server not enabled on the target. |
| `getaddrinfo ENOTFOUND mac-mini` | MagicDNS off — use the target's `100.x.y.z` IP instead. |
| macOS rejects password | Handled via keyboard-interactive; ensure the password is correct. |
| VNC "no connection" or error | VNC server running on the target? `127.0.0.1:5900` reachable? |
| Files panel shows "No saved profiles" | Connect once — profiles auto-save. |
| SFTP download stuck | Check `MAX_SFTP_BYTES`; large files may be blocked. |

## Project layout

```
server.js                  relay: static serving + WS↔SSH bridge (terminal,
                                    SFTP, VNC) with hardening
public/
  index.html               app shell (connect form + 3 views)
  app.js                   terminal, profiles, view switching
  files.js                 SFTP file browser panel
  vnc.js                   VNC screen panel (ES module)
  style.css                mobile-first dark UI
  manifest.webmanifest     PWA manifest
  sw.js                    service worker (offline app shell)
  vendor/
    xterm.js, addon-fit.js xterm terminal
    novnc/                 noVNC core + vendored pako
    icons/                 generated PWA icons
scripts/
  vendor.js                copies browser builds into public/vendor
  make_icons.py            generates icon PNGs
```

Tested end-to-end: token auth, key auth, shell I/O, PTY resize, SFTP list/
upload/download/rename/delete, VNC forward + RFB banner, origin rejection,
connection rate limiting.
