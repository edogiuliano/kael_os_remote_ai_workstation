# Setup

This guide covers local development and Windows desktop builds.

## Requirements

- Windows 11
- Node.js 20 LTS or newer
- PowerShell
- Tailscale for private remote access
- Optional: Codex CLI, Claude Code, Ollama, ComfyUI

Check Node:

```powershell
node -v
npm -v
```

## Install

From the project root:

```powershell
npm install
copy .env.example .env
```

Edit `.env`:

```env
PORT=8787
API_TOKEN=replace-with-a-long-random-token
CODEX_COMMAND=codex
CLAUDE_COMMAND=claude
POWERSHELL_COMMAND=powershell.exe
```

Telegram is optional. Leave these empty if you do not want bot control:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_CHAT_IDS=
TELEGRAM_STREAM_CHAT_ID=
```

## Development

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:8787
```

## Verification

```powershell
npm run typecheck
npm run build
npm run smoke
```

The smoke script starts a temporary server on a test port, verifies core API/session behavior, and shuts the server down.

## Desktop App

Run Electron in development:

```powershell
npm run desktop:dev
```

Build the Windows installer:

```powershell
npm run desktop:dist
```

Generated desktop artifacts are written to `release/`, which is intentionally ignored by Git.

## Tailscale Access

Install Tailscale on the Windows PC and Android phone. Both devices must be signed into the same Tailnet.

Get the PC's Tailscale IP:

```powershell
tailscale ip -4
```

From Android, open:

```text
http://TAILSCALE_IP:8787
```

Do not expose this service directly to the public internet.
