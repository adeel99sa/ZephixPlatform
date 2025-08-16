#!/usr/bin/env ts-node

/**
 * Test Redis Configuration
 * 
 * This script tests the Redis configuration to ensure it works
 * both with and without Redis configured.
 */

import { isRedisConfigured, getRedis } from '../src/config/redis.config'

async function testRedisConfig() {
  console.log('🧪 Testing Redis Configuration...\n')

  // Test 1: Check if Redis is configured
  console.log('1. Testing Redis Configuration Check:')
  const isConfigured = isRedisConfigured()
  console.log(`   Redis configured: ${isConfigured}`)
  console.log(`   REDIS_URL: ${process.env.REDIS_URL || 'NOT SET'}`)
  console.log()

  // Test 2: Try to get Redis connection
  console.log('2. Testing Redis Connection:')
  try {
    const redis = await getRedis('client')
    if (redis) {
      console.log('   ✅ Redis connection created successfully')
      console.log(`   Connection type: ${typeof redis}`)
    } else {
      console.log('   ⚠️  Redis connection returned null (expected when not configured)')
    }
  } catch (error) {
    console.log(`   ❌ Redis connection failed: ${error.message}`)
  }
  console.log()

  // Test 3: Test different roles
  console.log('3. Testing Different Redis Roles:')
  const roles = ['client', 'subscriber', 'worker'] as const
  for (const role of roles) {
    try {
      const redis = await getRedis(role)
      if (redis) {
        console.log(`   ✅ ${role}: Connection created`)
      } else {
        console.log(`   ⚠️  ${role}: Connection returned null`)
      }
    } catch (error) {
      console.log(`   ❌ ${role}: Connection failed - ${error.message}`)
    }
  }
  console.log()

  // Test 4: Environment summary
  console.log('4. Environment Summary:')
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`)
  console.log(`   REDIS_HOST: ${process.env.REDIS_HOST || 'NOT SET'}`)
  console.log(`   REDIS_PORT: ${process.env.REDIS_PORT || 'NOT SET'}`)
  console.log(`   REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET'}`)
  console.log(`   REDIS_TLS: ${process.env.REDIS_TLS || 'NOT SET'}`)
  console.log()

  // Test 5: Expected behavior
  console.log('5. Expected Behavior:')
  if (isConfigured) {
    console.log('   ✅ Redis is configured - app should start with full queue functionality')
    console.log('   ✅ Workers should start and process jobs')
    console.log('   ✅ Health checks should show Redis as connected')
  } else {
    console.log('   ✅ Redis is NOT configured - app should start without Redis')
    console.log('   ✅ Workers should NOT start')
    console.log('   ✅ Health checks should show "Redis not configured"')
    console.log('   ✅ Queue operations should return mock job IDs')
  }
  console.log()

  console.log('🎯 Test completed!')
}

// Run the test
testRedisConfig().catch(console.error)
