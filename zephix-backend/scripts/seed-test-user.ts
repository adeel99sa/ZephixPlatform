import 'reflect-metadata';
import { DataSource } from 'typeorm';
import axios from 'axios';
import AppDataSource from '../src/config/data-source';

(async () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
  const email = 'e2e+admin@zephix.local';
  const password = 'Zephix!123';

  try {
    // Check if user exists via API
    const res = await axios.post(`${baseURL}/api/auth/login`, {
      email,
      password,
    });
    
    console.log('✅ User exists and password is valid');
    console.log(JSON.stringify({ email, password }, null, 2));
  } catch (error) {
    if (error.response?.status === 401) {
      // User exists but password is wrong, need to re-signup
      console.log('⚠️ User exists but password is incorrect. Re-signing up...');
      await axios.post(`${baseURL}/api/auth/signup`, {
        email: `e2e+admin+${Date.now()}@zephix.local`,
        password,
        firstName: 'E2E',
        lastName: 'Admin',
        organizationName: `E2E Test Org ${Date.now()}`,
      });
      console.log('✅ Created new user (email changed due to conflict)');
    } else {
      // User doesn't exist, create via signup
      console.log('✅ Creating new test user via signup...');
      await axios.post(`${baseURL}/api/auth/signup`, {
        email,
        password,
        firstName: 'E2E',
        lastName: 'Admin',
        organizationName: 'E2E Test Org',
      });
      console.log('✅ Test user created');
      console.log(JSON.stringify({ email, password }, null, 2));
    }
  }
})();

