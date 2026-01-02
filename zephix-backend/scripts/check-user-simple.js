#!/usr/bin/env node

/**
 * Simple User Check Script
 * Checks if a user exists in the database
 */

require('dotenv').config();
const { Client } = require('pg');

const userEmail = process.argv[2] || 'adeel99sa@yahoo.com';

async function checkUser() {
  console.log('🔍 Checking User Database State\n');
  console.log(`Looking for user: ${userEmail}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Query user table with correct column names
    const userResult = await client.query(
      `SELECT
        id,
        email,
        first_name,
        last_name,
        is_active,
        is_email_verified,
        email_verified_at,
        created_at,
        updated_at,
        role,
        organization_id
      FROM users
      WHERE email = $1`,
      [userEmail.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User NOT found in database\n');
      console.log('This email is not registered.');
    } else {
      const user = userResult.rows[0];
      console.log('✅ User FOUND in database:\n');
      console.log('📧 Email:', user.email);
      console.log('👤 Name:', `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A');
      console.log('🆔 User ID:', user.id);
      console.log('🔓 Active:', user.is_active ? 'Yes ✅' : 'No ❌');
      console.log('✉️  Email Verified:', user.is_email_verified ? 'Yes ✅' : 'No ❌');
      console.log('📅 Verified At:', user.email_verified_at ? new Date(user.email_verified_at).toLocaleString() : 'Never');
      console.log('📅 Created:', new Date(user.created_at).toLocaleString());
      console.log('📅 Updated:', new Date(user.updated_at).toLocaleString());
      console.log('👤 Role:', user.role || 'N/A');
      console.log('🏢 Organization ID:', user.organization_id || 'N/A');

      // Check why user can't login
      console.log('\n🚫 Login Status:');
      if (!user.is_active) {
        console.log('  ❌ Account is not active');
      }
      if (!user.is_email_verified) {
        console.log('  ❌ Email is not verified (this prevents login)');
      }
      if (user.is_active && user.is_email_verified) {
        console.log('  ✅ User should be able to log in');
      }

      // Check for verification tokens
      console.log('\n📋 Checking Email Verification Tokens...');
      const tokenResult = await client.query(
        `SELECT
          id,
          token_hash,
          expires_at,
          created_at,
          used_at
        FROM email_verification_tokens
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5`,
        [user.id]
      );

      if (tokenResult.rows.length === 0) {
        console.log('  ℹ️  No verification tokens found');
      } else {
        console.log(`  ✅ Found ${tokenResult.rows.length} verification token(s):`);
        tokenResult.rows.forEach((token, index) => {
          const expiresAt = new Date(token.expires_at);
          const isExpired = expiresAt < new Date();
          const isUsed = !!token.used_at;
          console.log(`\n  Token ${index + 1}:`);
          console.log(`    Status: ${isUsed ? '✅ Used' : isExpired ? '⏰ Expired' : '⏳ Active'}`);
          console.log(`    Created: ${new Date(token.created_at).toLocaleString()}`);
          console.log(`    Expires: ${expiresAt.toLocaleString()}`);
          if (token.used_at) {
            console.log(`    Used At: ${new Date(token.used_at).toLocaleString()}`);
          }
        });
      }

      // Check outbox events
      console.log('\n📬 Checking Outbox Events...');
      const outboxResult = await client.query(
        `SELECT
          id,
          type,
          status,
          attempts,
          created_at,
          processed_at,
          last_error
        FROM auth_outbox
        WHERE payload_json->>'email' = $1
        ORDER BY created_at DESC
        LIMIT 5`,
        [userEmail.toLowerCase()]
      );

      if (outboxResult.rows.length === 0) {
        console.log('  ℹ️  No outbox events found');
      } else {
        console.log(`  ✅ Found ${outboxResult.rows.length} outbox event(s):`);
        outboxResult.rows.forEach((event, index) => {
          console.log(`\n  Event ${index + 1}:`);
          console.log(`    Type: ${event.type}`);
          console.log(`    Status: ${event.status}`);
          console.log(`    Attempts: ${event.attempts}`);
          console.log(`    Created: ${new Date(event.created_at).toLocaleString()}`);
          if (event.processed_at) {
            console.log(`    Processed: ${new Date(event.processed_at).toLocaleString()}`);
          }
          if (event.last_error) {
            console.log(`    Error: ${event.last_error.substring(0, 100)}`);
          }
        });
      }
    }

    await client.end();
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your DATABASE_URL is set correctly in .env');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Database table might not exist. Run migrations first.');
    }
    process.exit(1);
  }
}

checkUser();

