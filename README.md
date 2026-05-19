# KAEL OS

KAEL OS is a Windows 11 control center for running local AI coding agents from a desktop app, a mobile PWA, or Telegram.

It is designed for a home or office PC that stays powered on, runs local tools such as Codex CLI and Claude Code, and exposes a private dashboard through Tailscale instead of the public internet.

![Dashboard](screenshots/dashboard.png)

## Why This Exists

AI coding agents are powerful, but they are usually tied to the machine where the terminal is running. This project turns that machine into a small remote AI operations console:

- Start and monitor persistent agent sessions.
- Send prompts from a phone.
- Keep terminal sessions alive across reconnects.
- Use Telegram as a lightweight remote control channel.
- Access everything privately through Tailscale.
- Package the experience as a Windows desktop app with Electron.

## Current Features

- Electron desktop app for Windows.
- Mobile-first dashboard/PWA.
- REST API protected by an `API_TOKEN`.
- WebSocket live updates for status and session output.
- PTY-backed sessions with `node-pty`.
- Launchers for Codex CLI, Claude Code, PowerShell, and custom commands.
- Visible terminal windows for active sessions.
- Agent profiles with working directory, command override, and environment variables.
- Telegram bot integration with persistent session mode.
- Tailscale IP detection and private remote URLs.
- CPU, RAM, GPU, disk, and service status cards.
- Windows setup, startup, build, and smoke-test scripts.

## Screenshots

| Dashboard | Workflow | Result View | Setup |
| --- | --- | --- | --- |
| ![Dashboard](screenshots/dashboard.png) | ![Workflow](screenshots/workflow.png) | ![Result View](screenshots/result-view.png) | ![Setup Screen](screenshots/setup-screen.png) |

## Tech Stack

- **Runtime:** Node.js 20+, TypeScript
- **Backend:** Express, WebSocket `ws`, Zod, Pino
- **Sessions:** `node-pty`, PowerShell, Codex CLI, Claude Code
- **Desktop:** Electron, electron-builder
- **Frontend:** Static HTML/CSS/JavaScript PWA
- **Integrations:** Telegram via Telegraf, Tailscale CLI detection, systeminformation
- **Platform:** Windows 11

## Architecture Overview

```text
Android / Telegram / Desktop UI
        |
        | REST + WebSocket
        v
Node.js backend on Windows
        |
        | PTY sessions
        v
Codex CLI / Claude Code / PowerShell / custom local tools
```

The backend owns authentication, session lifecycle, profile storage, logs, WebSocket broadcasts, and integrations. Electron wraps the same dashboard in a Windows app and adds first-run setup plus visible terminal windows.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Requirements

- Windows 11
- Node.js 20 LTS or newer
- PowerShell
- Tailscale for private remote access
- Optional: Codex CLI, Claude Code, Ollama, ComfyUI, NVIDIA tooling

## Quick Start

```powershell
npm install
copy .env.example .env
npm run build
npm run smoke
npm run dev
```

Open:

```text
http://127.0.0.1:8787
```

For a full Windows setup flow, see [docs/SETUP.md](docs/SETUP.md).

## Main Commands

```powershell
npm run dev           # Run the TypeScript backend in development
npm run typecheck     # Run strict TypeScript checks
npm run build         # Compile backend and desktop entrypoints
npm run start         # Run the compiled backend
npm run smoke         # Start a temporary server and verify core API/session flow
npm run desktop:dev   # Build and open the Electron app
npm run desktop:dist  # Build the Windows installer
```

## Configuration

Copy `.env.example` to `.env` and set local values:

```env
PORT=8787
API_TOKEN=replace-with-a-long-random-token
CODEX_COMMAND=codex
CLAUDE_COMMAND=claude
POWERSHELL_COMMAND=powershell.exe
```

Telegram is optional:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_CHAT_IDS=
TELEGRAM_STREAM_CHAT_ID=
```

Never commit `.env`. The desktop app stores first-run config under the user's app data directory, not in the installed program folder.

## Security Notes

- Use Tailscale or another private network. Do not expose this app directly to the public internet.
- Keep `API_TOKEN` and Telegram bot tokens private.
- Restrict Telegram access with `TELEGRAM_ALLOWED_CHAT_IDS`.
- Treat remote prompts as remote command capability because agents can run tools.
- Use dedicated project folders for agent work.

## What This Demonstrates

This project is useful portfolio material for:

- AI automation workflows.
- Internal tools and operations dashboards.
- Desktop + web hybrid apps.
- Remote agent orchestration.
- Telegram bot control surfaces.
- Windows-first developer tooling.
- “Vibe coding” agent workflows with real local process control.

## Future Work

These are intentionally not claimed as complete in the current version:

- Full ComfyUI prompt queue, progress tracking, and image browser.
- Full Ollama model browser and prompt runner.
- Discord webhook notifications.
- File manager for upload/download from the dashboard.
- Remote screenshot delivery through Telegram.
- Voice notifications.
- Plugin loader with a real extension API.
- Auto-update flow for the Electron app.
- More polished installer branding and custom app icon.
- Stronger multi-user permission model.

## Repository Hygiene

The repo should include source code, docs, and safe screenshots only. It should not include:

- `.env` files
- tokens or API keys
- `node_modules/`
- `dist/`
- `release/`
- runtime `logs/`
- runtime `sessions/`
- private planning notes

## License

No license has been selected yet.
