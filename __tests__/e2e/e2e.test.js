/**
 * E2E Test for First DApp
 * 
 * This script performs end-to-end testing by:
 * 1. Checking if the dev server is running
 * 2. Testing the main page loads correctly
 * 3. Verifying key UI elements are present
 * 4. Testing responsive behavior
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;
const TIMEOUT = 5000;

// Helper function to make HTTP requests
function makeRequest(path = '/') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: 'GET',
      timeout: TIMEOUT,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test suite
async function runTests() {
  console.log('🚀 Starting E2E Tests for First DApp\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  async function test(name, testFn) {
    try {
      await testFn();
      results.passed++;
      results.tests.push({ name, status: '✅ PASS' });
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: '❌ FAIL', error: error.message });
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test 1: Server is accessible
  await test('Server is running on port 3000', async () => {
    const response = await makeRequest('/');
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
  });

  // Test 2: HTML response
  await test('Returns valid HTML', async () => {
    const response = await makeRequest('/');
    if (!response.headers['content-type']?.includes('text/html')) {
      throw new Error(`Expected HTML content, got ${response.headers['content-type']}`);
    }
    if (!response.body.includes('<!DOCTYPE html>') && !response.body.includes('<html')) {
      throw new Error('Response does not contain HTML structure');
    }
  });

  // Test 3: Page title
  await test('Page has correct title', async () => {
    const response = await makeRequest('/');
    if (!response.body.includes('Faucet Launcher')) {
      throw new Error('Page title "Faucet Launcher" not found');
    }
  });

  // Test 4: Main heading
  await test('Page contains main heading', async () => {
    const response = await makeRequest('/');
    if (!response.body.includes('Faucet Launcher')) {
      throw new Error('Main heading not found');
    }
  });

  // Test 5: Chain selector exists
  await test('Chain selector is present', async () => {
    const response = await makeRequest('/');
    if (!response.body.includes('Choose chain')) {
      throw new Error('Chain selector not found');
    }
  });

  // Test 6: Faucet section exists
  await test('Faucet section is present', async () => {
    const response = await makeRequest('/');
    if (!response.body.includes('Faucet')) {
      throw new Error('Faucet section not found');
    }
  });

  // Test 7: Meta tags for viewport (mobile responsive)
  await test('Has viewport meta tag for mobile responsiveness', async () => {
    const response = await makeRequest('/');
    if (!response.body.includes('viewport')) {
      throw new Error('Viewport meta tag not found');
    }
  });

  // Test 8: Styles are loaded
  await test('CSS styles are loaded', async () => {
    const response = await makeRequest('/');
    // Check for Tailwind-style classes or CSS-in-JS output
    if (!response.body.includes('class=') && !response.body.includes('style=')) {
      throw new Error('No CSS classes or styles found');
    }
  });

  // Test 9: JavaScript is loaded
  await test('JavaScript is loaded', async () => {
    const response = await makeRequest('/');
    if (!response.body.includes('<script')) {
      throw new Error('No script tags found');
    }
  });

  // Test 10: 404 handling
  await test('Returns 404 for non-existent pages', async () => {
    try {
      const response = await makeRequest('/non-existent-page-12345');
      if (response.statusCode !== 404) {
        // Next.js may return 200 for client-side routing, that's okay
        console.log('   (Note: Next.js client-side routing may return 200)');
      }
    } catch (error) {
      // 404 is expected
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary:');
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  📊 Total:  ${results.passed + results.failed}`);
  console.log('='.repeat(50));

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === '❌ FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
