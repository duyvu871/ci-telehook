#!/usr/bin/env node

const http = require('http');
const crypto = require('crypto');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3400';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const WEBHOOK_ENDPOINT = '/api/webhook/github';

// Sample GitHub webhook payload
const samplePayload = {
  workflow_name: 'CI Pipeline',
  repository: 'testuser/test-repo',
  run_id: '123456789',
  run_url: 'https://github.com/testuser/test-repo/actions/runs/123456789',
  status: 'success',
  branch: 'main',
  commit_sha: 'abc123def456789',
  commit_message: 'Add new feature and fix bugs',
  actor: 'testuser'
};

// Create webhook signature
function createSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

// Send webhook request
function sendWebhook(payload, options = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const signature = createSignature(payload, WEBHOOK_SECRET);
    
    const url = new URL(SERVER_URL + WEBHOOK_ENDPOINT);
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Webhook-Secret': WEBHOOK_SECRET,
        'X-Hub-Signature-256': `sha256=${signature}`,
        'User-Agent': 'GitHub-Webhook-Test/1.0',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Test different scenarios
async function runTests() {
  console.log('🧪 Starting webhook tests...\n');
  console.log(`📡 Server URL: ${SERVER_URL}`);
  console.log(`🔗 Webhook endpoint: ${WEBHOOK_ENDPOINT}`);
  console.log(`🔐 Using webhook secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
  console.log('=' .repeat(60));

  const tests = [
    {
      name: 'Valid success webhook',
      payload: { ...samplePayload, status: 'success', workflow_name: 'Build and Test' },
      expectedStatus: 200
    },
    {
      name: 'Valid failure webhook', 
      payload: { ...samplePayload, status: 'failure', commit_message: 'Fix critical bug', workflow_name: 'CI/CD Pipeline' },
      expectedStatus: 200
    },
    {
      name: 'Valid in_progress webhook',
      payload: { ...samplePayload, status: 'in_progress', commit_message: 'Deploy to staging', workflow_name: 'Deploy to Staging' },
      expectedStatus: 200
    },
    {
      name: 'Valid cancelled webhook',
      payload: { ...samplePayload, status: 'cancelled', workflow_name: 'Security Scan' },
      expectedStatus: 200
    },
    {
      name: 'Test with longer repository name',
      payload: { ...samplePayload, repository: 'my-organization/very-long-repository-name', actor: 'john-doe-developer' },
      expectedStatus: 200
    },
    {
      name: 'Invalid payload (missing required field)',
      payload: { ...samplePayload, repository: undefined },
      expectedStatus: 400
    },
    {
      name: 'Invalid status value',
      payload: { ...samplePayload, status: 'invalid_status' },
      expectedStatus: 400
    },
    {
      name: 'Invalid commit SHA (too short)',
      payload: { ...samplePayload, commit_sha: 'abc' },
      expectedStatus: 400
    },
    {
      name: 'Invalid URL format',
      payload: { ...samplePayload, run_url: 'not-a-valid-url' },
      expectedStatus: 400
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Running: ${test.name}`);
      console.log(`📋 Payload:`, JSON.stringify(test.payload, null, 2));
      
      const result = await sendWebhook(test.payload);
      
      console.log(`📊 Response Status: ${result.statusCode}`);
      console.log(`📄 Response Data:`, JSON.stringify(result.data, null, 2));
      
      if (result.statusCode === test.expectedStatus) {
        console.log(`✅ PASS - Expected status ${test.expectedStatus}, got ${result.statusCode}`);
        passed++;
      } else {
        console.log(`❌ FAIL - Expected status ${test.expectedStatus}, got ${result.statusCode}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      failed++;
    }
    
    console.log('-'.repeat(40));
  }

  // Test with wrong webhook secret
  console.log('\n🔒 Testing with wrong webhook secret...');
  try {
    const wrongSecretPayload = { ...samplePayload };
    const data = JSON.stringify(wrongSecretPayload);
    
    const url = new URL(SERVER_URL + WEBHOOK_ENDPOINT);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Webhook-Secret': 'wrong-secret',
        'User-Agent': 'GitHub-Webhook-Test/1.0'
      }
    };

    const result = await new Promise((resolve, reject) => {
      const req = http.request(requestOptions, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(responseData)
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              data: responseData
            });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    if (result.statusCode === 401 || result.statusCode === 403) {
      console.log(`✅ PASS - Correctly rejected wrong webhook secret (status ${result.statusCode})`);
      passed++;
    } else {
      console.log(`❌ FAIL - Should reject wrong webhook secret, got status ${result.statusCode}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the server logs for more details.');
    process.exit(1);
  }
}

// Health check first
async function healthCheck() {
  console.log('🏥 Performing health check...');
  
  try {
    const url = new URL(SERVER_URL + '/health');
    const result = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(data)
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              data: data
            });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (result.statusCode === 200) {
      console.log('✅ Server is healthy');
      console.log('📊 Health data:', JSON.stringify(result.data, null, 2));
      return true;
    } else {
      console.log(`❌ Server health check failed (status ${result.statusCode})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    console.log('💡 Make sure the server is running on', SERVER_URL);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 GitHub Webhook Test Script');
  console.log('='.repeat(60));
  
  const isHealthy = await healthCheck();
  
  if (!isHealthy) {
    console.log('\n❌ Server is not accessible. Please start the server first:');
    console.log('   npm run dev    # for development');
    console.log('   npm start      # for production');
    process.exit(1);
  }
  
  await runTests();
}

// Handle command line arguments
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  switch (command) {
    case 'health':
      healthCheck().then(isHealthy => {
        process.exit(isHealthy ? 0 : 1);
      });
      break;
    
    case 'single':
      // Send single test webhook
      sendWebhook(samplePayload).then(result => {
        console.log('📊 Response:', JSON.stringify(result, null, 2));
        process.exit(result.statusCode === 200 ? 0 : 1);
      }).catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
      });
      break;
    
    default:
      console.log('Usage:');
      console.log('  node test-webhook.js         # Run all tests');
      console.log('  node test-webhook.js health  # Health check only');
      console.log('  node test-webhook.js single  # Send single webhook');
      process.exit(1);
  }
} else {
  main();
}
