# Kael OS Screenshot Automation

This script automatically takes screenshots of the main views in the Kael OS Electron app.

## Prerequisites

Make sure you have the required dependencies installed:
```bash
npm install
```

## Installation

The required dependencies should already be installed as part of the main `package.json`. Playwright is already included in your devDependencies.

## Usage

To run the screenshot automation:

```bash
npm run screenshots
```

This will generate screenshots for:
- `dashboard.png` - Main dashboard view
- `workflow.png` - Workflow/session panel view  
- `result-view.png` - Session with terminal output visible
- `setup-screen.png` - Setup or config screen

## How it works

The script will:
1. Launch the Electron app using the configured API token from .env
2. Navigate to different views in the app
3. Take a screenshot of each main view
4. Save the screenshots to the `screenshots/` directory

## Customization

You can modify the script by editing the `screenshot-script.js` file.

## Notes

- The script uses Playwright's Electron support to launch the app
- All main views will be captured including the dashboard, workflow, and setup screens
- Screenshots are saved as PNG files in the `screenshots/` directory