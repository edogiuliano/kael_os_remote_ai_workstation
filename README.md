# KAEL OS

KAEL OS is a private Windows command center for running local AI agents from a desktop app, a browser, or a phone on Tailscale.

It is built for the kind of workstation that stays on: Codex CLI, Claude Code, local services, logs, profiles, QR access, and live terminal sessions all in one compact control surface.

![KAEL OS dashboard](screenshots/dashboard.png)

## Highlights

- Launch Codex CLI, Claude Code, PowerShell, or custom tools from saved profiles.
- Use one Command Deck selector with agent logos, profile names, live session state, and prompt routing.
- Keep PTY-backed terminal sessions alive while switching between desktop and phone.
- Send prompts from the dashboard or the terminal composer without focusing the raw terminal.
- Attach image and text files from the chat composer.
- Manage profiles with project folders, command overrides, and local environment variables.
- Open private access from Tailscale or local URLs, with QR access tucked into More.
- Track PC health with compact CPU, RAM, GPU, and service status panels.
- Run as a Windows Electron app or as a local web dashboard.

## Screenshots

| Dashboard | Command Deck |
| --- | --- |
| ![Dashboard](screenshots/dashboard.png) | ![Command Deck dropdown](screenshots/command-deck.png) |

| Profiles | Agent Terminal |
| --- | --- |
| ![Profiles in light mode](screenshots/profiles-light.png) | ![Agent terminal](screenshots/chat-terminal.png) |

| Mobile More |
| --- |
| ![Mobile More view](screenshots/phone-more.png) |

## What Changed Recently

The latest UI pass focuses on clarity:

- The Command Deck no longer duplicates agent chips above the prompt.
- The native session select was replaced with a custom dropdown that can show Claude and OpenAI logos.
- OpenAI/Codex renders black in light mode and white in dark mode.
- Profile cards use centered SVG logos and light-mode-safe action buttons.
- The profile editor opens inline below the selected profile.
- The Save button is compact, and create-profile is a simple plus action.
- Logs live in More, while the main dashboard stays focused on active work.

## Architecture

```text
Electron Desktop / Browser / Phone PWA
        |
        | REST API + WebSocket
        v
Node.js backend on Windows
        |
        | PTY sessions
        v
Codex CLI / Claude Code / PowerShell / local tools
```

The backend owns authentication, profile storage, session lifecycle, logs, WebSocket broadcasts, system metrics, Tailscale detection, and optional Telegram fallback controls. The frontend is a static PWA wrapped by Electron for Windows desktop use.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Tech Stack

- **Runtime:** Node.js 20+, TypeScript
- **Backend:** Express, WebSocket `ws`, Zod, Pino
- **Sessions:** `node-pty`, Codex CLI, Claude Code, PowerShell
- **Desktop:** Electron, electron-builder
- **Frontend:** HTML, CSS, JavaScript, xterm.js
- **Integrations:** Tailscale CLI detection, Telegram via Telegraf, NVIDIA metrics
- **Automation:** Playwright for polished screenshot generation

## Requirements

- Windows 11
- Node.js 20 LTS or newer
- PowerShell
- Tailscale on the PC and phone for private remote access
- Optional: Codex CLI, Claude Code, Ollama, ComfyUI, NVIDIA drivers/tools

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

Desktop development:

```powershell
npm run desktop:dev
```

Build the Windows app:

```powershell
npm run desktop:dist
```

For a fuller Windows setup guide, see [docs/SETUP.md](docs/SETUP.md).

## Main Commands

```powershell
npm run dev           # Run the TypeScript backend in development
npm run typecheck     # Run TypeScript checks
npm run build         # Compile backend and desktop entrypoints
npm run start         # Run the compiled backend
npm run smoke         # Verify the core API/session flow
npm run screenshots   # Regenerate README screenshots with safe demo data
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

Never commit `.env`. The Electron app stores first-run config under the user's app data directory instead of the installed program folder.

## Phone Access

1. Install and log in to Tailscale on the Windows PC.
2. Install and log in to Tailscale on the phone.
3. Start KAEL OS on the PC.
4. Open More and expand Phone QR Access.
5. Scan the QR code.

The QR URL includes the local API token in the URL hash so the phone can authenticate without exposing the token to server logs.

## Regenerating Screenshots

The README screenshots are generated with safe demo data. They do not expose real project paths, tokens, session logs, or private profiles.

```powershell
npm run screenshots
```

The script starts a temporary dev server on port `8878` by default. Override it if needed:

```powershell
$env:SCREENSHOT_PORT=8890
npm run screenshots
```

## Security Notes

- Use Tailscale or another private network. Do not expose KAEL OS directly to the public internet.
- Keep `API_TOKEN`, Telegram tokens, and profile secrets private.
- Restrict Telegram access with `TELEGRAM_ALLOWED_CHAT_IDS` if Telegram is enabled.
- Treat remote prompts as remote command capability because agents can run tools.
- Use dedicated project folders for agent work.

## Portfolio Notes

KAEL OS demonstrates:

- AI agent orchestration for local developer workflows.
- Windows-first internal tooling.
- Desktop, web, and phone UX in one product.
- PTY session management and live terminal streaming.
- Private-network access with Tailscale.
- Practical profile-driven workflows for Codex CLI and Claude Code.

## Future Work

- Full ComfyUI prompt queue, progress tracking, and image browser.
- Full Ollama model browser and prompt runner.
- Discord webhook notifications.
- File manager for upload/download from the dashboard.
- Remote screenshot delivery.
- Voice notifications.
- Plugin loader with a real extension API.
- Auto-update flow for the Electron app.
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
