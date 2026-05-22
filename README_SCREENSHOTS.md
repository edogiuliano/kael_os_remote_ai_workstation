# KAEL OS Screenshot Automation

`npm run screenshots` regenerates the public README screenshots with safe demo data.

The script starts a temporary KAEL OS dev server, mocks the API responses used by the UI, captures the main views with Playwright, and shuts the server down again. It is meant for documentation images, not end-to-end testing against private local profiles.

## Usage

```powershell
npm run screenshots
```

Generated files:

- `screenshots/dashboard.png`
- `screenshots/command-deck.png`
- `screenshots/profiles-light.png`
- `screenshots/chat-terminal.png`
- `screenshots/phone-more.jpeg`

The default screenshot server port is `8878`. Override it when that port is busy:

```powershell
$env:SCREENSHOT_PORT=8890
npm run screenshots
```

## Notes

- The captured profiles, logs, URLs, and tokens are demo values.
- The script uses Chrome when it is installed, otherwise it falls back to Playwright Chromium.
- The screenshots are intentionally committed because the README depends on them.
