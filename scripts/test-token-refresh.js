#!/usr/bin/env node

/**
 * Test script for Google Access Token Refresh System
 * 
 * This script tests the token refresh endpoint and YouTube API integration.
 * Run with: node scripts/test-token-refresh.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_USER_ID = process.env.TEST_USER_ID;

if (!TEST_USER_ID) {
  console.error('❌ TEST_USER_ID environment variable is required');
  console.log('Set it to a valid user ID that has authenticated with Google');
  process.exit(1);
}

async function testTokenRefresh() {
  console.log('🧪 Testing Google Access Token Refresh System\n');

  try {
    // Step 1: Test token refresh endpoint
    console.log('1️⃣ Testing token refresh endpoint...');
    
    const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh-google-token`, {}, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json',
      },
    });

    if (refreshResponse.data.access_token) {
      console.log('✅ Token refresh successful');
      console.log(`   Token expires in: ${refreshResponse.data.expires_in} seconds`);
    } else {
      console.log('❌ Token refresh failed - no access token returned');
      return false;
    }

    // Step 2: Test YouTube channel endpoint
    console.log('\n2️⃣ Testing YouTube channel endpoint...');
    
    const channelResponse = await axios.get(`${API_BASE_URL}/api/youtube/channel/${TEST_USER_ID}`);
    
    if (channelResponse.data.channel) {
      console.log('✅ YouTube channel data retrieved successfully');
      console.log(`   Channel: ${channelResponse.data.channel.name}`);
      console.log(`   Subscribers: ${channelResponse.data.channel.subscriberCount.toLocaleString()}`);
      console.log(`   Videos: ${channelResponse.data.channel.videoCount.toLocaleString()}`);
    } else {
      console.log('❌ YouTube channel data retrieval failed');
      return false;
    }

    // Step 3: Test YouTube comments endpoint
    console.log('\n3️⃣ Testing YouTube comments endpoint...');
    
    const commentsResponse = await axios.get(`${API_BASE_URL}/api/youtube/comments/${TEST_USER_ID}?limit=5`);
    
    if (commentsResponse.data.comments) {
      console.log('✅ YouTube comments retrieved successfully');
      console.log(`   Comments found: ${commentsResponse.data.comments.length}`);
      console.log(`   Source: ${commentsResponse.data.source}`);
    } else {
      console.log('❌ YouTube comments retrieval failed');
      return false;
    }

    console.log('\n🎉 All tests passed! Token refresh system is working correctly.');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      if (error.response.data?.requiresReauth) {
        console.log('\n💡 The user needs to re-authenticate with Google.');
        console.log('   This is normal if the refresh token has expired.');
      }
    }
    
    return false;
  }
}

async function testFrontendTokenManager() {
  console.log('\n🧪 Testing Frontend Token Manager (simulation)...');
  
  try {
    // Simulate frontend token manager behavior
    const tokenManagerTest = {
      async getValidAccessToken() {
        // This would normally call the backend refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-google-token`, {}, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_TOKEN || 'test-token'}`,
            'Content-Type': 'application/json',
          },
        });
        return response.data.access_token;
      },
      
      async makeAuthenticatedGoogleRequest(url) {
        const token = await this.getValidAccessToken();
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      }
    };

    // Test direct Google API call
    console.log('   Testing direct Google API call...');
    const channelData = await tokenManagerTest.makeAuthenticatedGoogleRequest(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true'
    );
    
    if (channelData.items && channelData.items.length > 0) {
      console.log('✅ Frontend token manager simulation successful');
      console.log(`   Channel: ${channelData.items[0].snippet.title}`);
    } else {
      console.log('❌ Frontend token manager simulation failed');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Frontend token manager test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Google Token Refresh System Tests\n');
  
  const backendTestPassed = await testTokenRefresh();
  const frontendTestPassed = await testFrontendTokenManager();
  
  console.log('\n📊 Test Results:');
  console.log(`   Backend API Tests: ${backendTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Frontend Token Manager: ${frontendTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (backendTestPassed && frontendTestPassed) {
    console.log('\n🎉 All tests passed! The token refresh system is working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { testTokenRefresh, testFrontendTokenManager }; 