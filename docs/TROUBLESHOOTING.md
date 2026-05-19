# Troubleshooting

## Dashboard Shows Unauthorized

Confirm the dashboard token matches `API_TOKEN` from `.env`, then refresh the page.

## Codex Or Claude Does Not Start

Check that each CLI works in PowerShell:

```powershell
codex --version
claude --version
```

If a command is installed outside `PATH`, set `CODEX_COMMAND` or `CLAUDE_COMMAND` in `.env`.

## Tailscale URL Is Missing

Run:

```powershell
tailscale ip -4
```

If this fails, confirm Tailscale is installed, running, and signed in.

## Telegram Bot Does Not Respond

Check:

- `TELEGRAM_BOT_TOKEN` is set.
- Your numeric chat id is included in `TELEGRAM_ALLOWED_CHAT_IDS`.
- The workstation was restarted after changing `.env`.

## Port Is Already In Use

Change `PORT` in `.env`, or stop the existing process using that port.

## Smoke Verification Fails

Run the checks separately:

```powershell
npm run typecheck
npm run build
npm run smoke
```

If only smoke fails, check whether local security tools or PowerShell policy blocked the temporary test server.
