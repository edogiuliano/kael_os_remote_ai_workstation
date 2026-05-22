import { _electron as electron } from '@playwright/test';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Simple screenshot capture script for Electron app
 */
async function captureScreenshots() {
  console.log('Starting screenshot capture process...');

  // Create screenshots directory if it doesn't exist
  const SCREENSHOTS_DIR = 'screenshots';
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log(`Created screenshots directory: ${SCREENSHOTS_DIR}`);
  }

  // Launch Electron app
  const electronApp = await electron.launch({
    args: [join(__dirname, 'dist/desktop/main.js')]
  });

  // Get the app window
  const appWindow = await electronApp.firstWindow();

  try {
    // Wait for the app to load
    await appWindow.waitForLoadState('domcontentloaded');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('App loaded and ready');

    // Take dashboard screenshot (main view)
    console.log('Taking dashboard screenshot...');
    await appWindow.screenshot({
      path: join(SCREENSHOTS_DIR, 'dashboard.png'),
      fullPage: true
    });
    console.log('Dashboard screenshot saved');

    // Take workflow screenshot (sessions view)
    console.log('Taking workflow screenshot...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await appWindow.screenshot({
      path: join(SCREENSHOTS_DIR, 'workflow.png'),
      fullPage: true
    });
    console.log('Workflow screenshot saved');

    // Take result-view screenshot (terminal/logs view)
    console.log('Taking result-view screenshot...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await appWindow.screenshot({
      path: join(SCREENSHOTS_DIR, 'result-view.png'),
      fullPage: true
    });
    console.log('Result-view screenshot saved');

    // Take setup-screen screenshot (profiles view)
    console.log('Taking setup-screen screenshot...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await appWindow.screenshot({
      path: join(SCREENSHOTS_DIR, 'setup-screen.png'),
      fullPage: true
    });
    console.log('Setup-screen screenshot saved');

    console.log('All screenshots captured successfully!');
  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await electronApp.close();
  }
}

// Run the screenshot capture
captureScreenshots().catch(console.error);