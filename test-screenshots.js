// Simple test to verify screenshot automation
import { captureScreenshots } from './test-screenshots.js';

// Test the screenshot function
console.log('Testing screenshot automation...');

// This will run the screenshot automation and verify it works
captureScreenshots()
  .then(() => {
    console.log('✅ Screenshot automation test completed successfully');
  })
  .catch((error) => {
    console.error('❌ Screenshot automation test failed:', error);
  });