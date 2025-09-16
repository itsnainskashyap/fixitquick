/**
 * Test script to verify admin login functionality
 * Helps debug authentication issues and test development bypass
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

async function testAdminLogin() {
  console.log('🧪 Testing Admin Login Functionality');
  console.log('====================================');

  try {
    // Test admin login with development credentials (using dev endpoint to bypass rate limit)
    const loginResponse = await fetch(`${API_BASE}/api/admin/dev-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nainspagal@gmail.com',
        password: 'Sinha@1357'
      })
    });

    const loginResult = await loginResponse.json();
    console.log('\n📊 Login Response:');
    console.log('Status:', loginResponse.status);
    console.log('Result:', loginResult);

    if (loginResponse.ok && loginResult.success) {
      console.log('✅ Admin login successful!');
      console.log('🔑 Admin token received');
      
      // Test accessing admin dashboard
      const dashboardResponse = await fetch(`${API_BASE}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${loginResult.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (dashboardResponse.ok) {
        console.log('✅ Admin dashboard access successful!');
      } else {
        console.log('❌ Admin dashboard access failed:', dashboardResponse.status);
      }
    } else {
      console.log('❌ Admin login failed');
      console.log('💡 Checking environment variables...');
      
      // Show environment status
      console.log('\n🔍 Environment Status:');
      console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL ? 'SET' : 'NOT SET');
      console.log('ADMIN_PASSWORD_HASH:', process.env.ADMIN_PASSWORD_HASH ? 'SET' : 'NOT SET');
      console.log('DEV_ADMIN_ENABLED:', process.env.DEV_ADMIN_ENABLED || 'NOT SET');
      console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testAdminLogin();