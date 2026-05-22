// Test script to verify the screenshot automation is working
import { captureScreenshots } from './test-screenshots.js';

// Run the screenshot automation
console.log('Testing screenshot automation...');
captureScreenshots()
  .then(() => {
    console.log('Screenshot automation completed');
  })
  .catch((error) => {
    console.error('Screenshot automation failed:', error);
  });