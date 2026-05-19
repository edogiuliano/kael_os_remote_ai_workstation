# Architecture

Remote AI Workstation is a single-machine control plane for local AI coding agents. It runs on a Windows 11 host and exposes three control surfaces: Electron desktop, browser/PWA dashboard, and Telegram bot.

## Runtime Shape

```text
Electron window / Android PWA / Telegram
        |
        | REST API + WebSocket
        v
Express backend
        |
        | SessionManager
        v
node-pty processes
        |
        v
Codex CLI / Claude Code / PowerShell / custom commands
```

## Backend

The backend is written in TypeScript and runs on Node.js. Express serves both the REST API and static frontend assets. A WebSocket server shares the same HTTP port and broadcasts session output and status updates.

Important responsibilities:

- Token authentication for REST and WebSocket clients.
- Agent session lifecycle.
- Profile storage.
- Log persistence.
- Telegram command handling.
- Tailscale URL detection.
- System metrics collection.

## Sessions

Sessions are backed by `node-pty`, which gives Codex, Claude, PowerShell, and custom commands a real interactive terminal. This is required because AI CLIs often depend on terminal behavior rather than plain stdin/stdout.

Session flow:

1. A user starts a session from the dashboard, REST API, Electron, or Telegram.
2. `SessionManager` resolves the requested agent/profile into a launch spec.
3. `ManagedSession` starts a PTY process with the selected working directory and environment.
4. Output is written to a session log and broadcast through WebSocket.
5. Electron can open a visible terminal window attached to that same session.

## Profiles

Profiles are reusable launch configurations. A profile can define:

- Agent type.
- Working directory.
- Optional command override.
- Optional arguments.
- Environment variables.

This makes it possible to keep separate launchers for different repositories or proxy setups without hardcoding credentials in source code.

## Telegram

The Telegram bot is optional. When configured, it can:

- Show status and running sessions.
- Start Codex, Claude, PowerShell, or saved profiles.
- Connect a chat to a running session.
- Forward normal Telegram messages into the selected PTY session.
- Return filtered logs or final agent output.

Live output is intentionally filtered because terminal-based AI tools redraw their screens frequently while thinking.

## Desktop App

Electron wraps the same dashboard and backend. It adds:

- First-run setup.
- Config storage in the user's app data folder.
- Native desktop windows for visible terminal sessions.
- Windows installer generation through electron-builder.

## Security Model

The app is intended for private networks. The recommended deployment is through Tailscale, not public port forwarding.

Security controls currently implemented:

- API token authentication.
- WebSocket token authentication.
- Telegram allow-list by chat id.
- Local `.env` config.
- Runtime logs and sessions ignored by Git.

This is not a multi-tenant product and should not be exposed as a public SaaS endpoint.
