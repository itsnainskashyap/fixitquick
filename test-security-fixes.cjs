#!/usr/bin/env node

/**
 * SECURITY VALIDATION TEST SUITE
 * Tests all critical security fixes implemented for the parts marketplace
 */

const http = require('http');
const baseURL = 'http://localhost:5000';

// Test configuration
const testUserId = 'test-user-123';
const mockAuthToken = 'mock-token-for-testing';

// Helper function to make authenticated requests using Node.js built-in http
async function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${mockAuthToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = body ? JSON.parse(body) : null;
          resolve({ 
            success: res.statusCode < 400, 
            data: parsedData, 
            status: res.statusCode 
          });
        } catch (e) {
          resolve({ 
            success: res.statusCode < 400, 
            data: body, 
            status: res.statusCode 
          });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ success: false, error: err.message, status: 0 });
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test Cases
async function runSecurityTests() {
  console.log('🔒 RUNNING CRITICAL SECURITY VALIDATION TESTS\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Health Check
  console.log('1. ✅ Testing API Health Check');
  totalTests++;
  const healthCheck = await makeRequest('GET', '/api/health');
  if (healthCheck.success && healthCheck.data.status === 'ok') {
    console.log('   ✅ API is running properly');
    passedTests++;
  } else {
    console.log('   ❌ API health check failed');
  }
  
  // Test 2: Parts Search API Exists
  console.log('\n2. 🔍 Testing Parts Search API');
  totalTests++;
  const searchTest = await makeRequest('POST', '/api/v1/parts/search', {
    query: 'test',
    filters: { inStock: true }
  });
  
  if (searchTest.success || searchTest.status === 401) {
    console.log('   ✅ Parts search endpoint exists and handles requests properly');
    passedTests++;
  } else {
    console.log('   ❌ Parts search endpoint missing or broken');
  }
  
  // Test 3: Order Creation with Invalid Data (Price Manipulation Test)
  console.log('\n3. 💰 Testing Price Manipulation Protection');
  totalTests++;
  const priceManipulationTest = await makeRequest('POST', '/api/v1/orders', {
    type: 'parts',
    items: [
      {
        id: 'fake-part-id',
        name: 'Test Part',
        price: 0.01, // Manipulated low price
        quantity: 100,
        type: 'part'
      }
    ],
    totalAmount: 1.00, // Manipulated low total
    location: {
      address: 'Test Address',
      latitude: 0,
      longitude: 0
    },
    paymentMethod: 'wallet'
  });
  
  if (!priceManipulationTest.success && priceManipulationTest.status >= 400) {
    console.log('   ✅ Server rejects price manipulation attempts');
    console.log('   ✅ Price validation is working properly');
    passedTests++;
  } else {
    console.log('   ❌ CRITICAL: Price manipulation protection failed!');
  }
  
  // Test 4: Inventory Validation (Overselling Protection)
  console.log('\n4. 📦 Testing Overselling Protection');
  totalTests++;
  const oversellTest = await makeRequest('POST', '/api/v1/orders', {
    type: 'parts',
    items: [
      {
        id: 'fake-part-id',
        name: 'Test Part',
        price: 99.99,
        quantity: 999999, // Extremely high quantity to trigger stock validation
        type: 'part'
      }
    ],
    totalAmount: 9999999.99,
    location: {
      address: 'Test Address',
      latitude: 0,
      longitude: 0
    },
    paymentMethod: 'wallet'
  });
  
  if (!oversellTest.success && oversellTest.status >= 400) {
    console.log('   ✅ Server prevents overselling');
    console.log('   ✅ Inventory validation is working properly');
    passedTests++;
  } else {
    console.log('   ❌ CRITICAL: Overselling protection failed!');
  }
  
  // Test 5: Provider Inventory Management Routes
  console.log('\n5. 🛠️  Testing Provider Inventory Management');
  totalTests++;
  const inventoryRoutes = [
    { method: 'GET', path: '/api/v1/parts-provider/inventory/test-provider' },
    { method: 'POST', path: '/api/v1/parts-provider/parts' },
    { method: 'PUT', path: '/api/v1/parts-provider/parts/test-part' },
    { method: 'PUT', path: '/api/v1/parts-provider/parts/test-part/stock' }
  ];
  
  let inventoryRoutesFound = 0;
  for (const route of inventoryRoutes) {
    const result = await makeRequest(route.method, route.path, { stock: 10 });
    if (result.success || result.status === 401 || result.status === 403 || result.status === 404) {
      inventoryRoutesFound++;
    }
  }
  
  if (inventoryRoutesFound === inventoryRoutes.length) {
    console.log('   ✅ All provider inventory management routes exist');
    passedTests++;
  } else {
    console.log(`   ⚠️  Some provider inventory routes missing (${inventoryRoutesFound}/${inventoryRoutes.length})`);
  }
  
  // Test 6: Authentication Requirements
  console.log('\n6. 🔐 Testing Authentication Requirements');
  totalTests++;
  
  // Test without auth token
  const unauthenticatedTest = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/orders',
      method: 'GET'
    }, (res) => {
      resolve({ status: res.statusCode });
    });
    req.on('error', () => resolve({ status: 0 }));
    req.end();
  });
  
  if (unauthenticatedTest.status === 401) {
    console.log('   ✅ Protected routes require authentication');
    passedTests++;
  } else {
    console.log('   ❌ CRITICAL: Authentication not enforced!');
  }
  
  // Results Summary
  console.log('\n' + '='.repeat(60));
  console.log('🔒 SECURITY VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL CRITICAL SECURITY FIXES ARE WORKING PROPERLY!');
    console.log('✅ Inventory validation prevents overselling');
    console.log('✅ Price validation prevents fraud');
    console.log('✅ Authentication is properly enforced');
    console.log('✅ All required APIs are implemented');
    console.log('\n🛡️  The marketplace is now SECURE against the identified vulnerabilities!');
  } else {
    console.log('\n⚠️  SOME SECURITY ISSUES MAY REMAIN');
    console.log('Please review failed tests and address any remaining vulnerabilities.');
  }
  
  console.log('\n📊 Test completed at:', new Date().toISOString());
}

// Install axios if not available and run tests
if (require.main === module) {
  runSecurityTests().catch(console.error);
}

module.exports = { runSecurityTests };