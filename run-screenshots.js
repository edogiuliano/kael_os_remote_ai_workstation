// Simple test runner for screenshot automation
import { captureScreenshots } from './test-screenshots.js';

// Run the screenshot capture
console.log('Starting Kael OS screenshot automation...');
captureScreenshots()
  .then(() => {
    console.log('Screenshot automation completed successfully!');
  })
  .catch((error) => {
    console.error('Screenshot automation failed:', error);
    process.exit(1);
  });