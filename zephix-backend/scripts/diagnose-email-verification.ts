#!/usr/bin/env ts-node
/**
 * Email Verification Diagnostic Script
 *
 * Checks:
 * 1. SendGrid API key configuration
 * 2. Pending outbox events in database
 * 3. Outbox processor status
 * 4. Recent user registrations
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

async function diagnoseEmailVerification() {
  console.log('🔍 Email Verification Diagnostic Tool\n');
  console.log('=' .repeat(60));

  // 1. Check SendGrid Configuration
  console.log('\n1️⃣  SendGrid Configuration:');
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    console.log('   ✅ SENDGRID_API_KEY is set');
    console.log(`   📝 Key length: ${sendgridKey.length} characters`);
    console.log(`   📝 Key preview: ${sendgridKey.substring(0, 10)}...`);
  } else {
    console.log('   ❌ SENDGRID_API_KEY is NOT set');
    console.log('   ⚠️  Emails will NOT be sent without this key');
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@zephix.dev';
  console.log(`   📧 From email: ${fromEmail}`);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  console.log(`   🌐 Frontend URL: ${frontendUrl}`);

  // 2. Check Database Connection
  console.log('\n2️⃣  Database Connection:');
  let dataSource: DataSource | null = null;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('   ❌ DATABASE_URL is not set');
      return;
    }

    dataSource = new DataSource({
      type: 'postgres',
      url: dbUrl,
      logging: false,
    });

    await dataSource.initialize();
    console.log('   ✅ Database connected successfully');

    // 3. Check auth_outbox table
    console.log('\n3️⃣  Outbox Events Status:');
    try {
      const outboxQuery = `
        SELECT
          id,
          type,
          status,
          attempts,
          created_at,
          next_attempt_at,
          processed_at,
          last_error,
          payload_json->>'email' as email
        FROM auth_outbox
        WHERE type = 'auth.email_verification.requested'
        ORDER BY created_at DESC
        LIMIT 20
      `;
      const outboxEvents = await dataSource.query(outboxQuery);

      if (outboxEvents.length === 0) {
        console.log('   ℹ️  No verification email events found in outbox');
      } else {
        console.log(`   📊 Found ${outboxEvents.length} verification email events:\n`);

        const statusCounts: Record<string, number> = {};
        outboxEvents.forEach((event: any) => {
          statusCounts[event.status] = (statusCounts[event.status] || 0) + 1;
        });

        console.log('   Status breakdown:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';
          console.log(`      ${icon} ${status}: ${count}`);
        });

        console.log('\n   Recent events:');
        outboxEvents.slice(0, 5).forEach((event: any) => {
          const created = new Date(event.created_at).toLocaleString();
          const status = event.status;
          const email = event.email || 'unknown';
          const attempts = event.attempts || 0;
          const lastError = event.last_error ? ` (Error: ${event.last_error.substring(0, 50)}...)` : '';

          let icon = '⏳';
          if (status === 'completed') icon = '✅';
          else if (status === 'failed') icon = '❌';
          else if (status === 'processing') icon = '🔄';

          console.log(`      ${icon} [${status}] ${email} - Created: ${created}, Attempts: ${attempts}${lastError}`);
        });

        // Check for stuck pending events
        const pendingEvents = outboxEvents.filter((e: any) => e.status === 'pending');
        if (pendingEvents.length > 0) {
          console.log(`\n   ⚠️  Found ${pendingEvents.length} pending events that may be stuck`);
          const oldPending = pendingEvents.filter((e: any) => {
            const created = new Date(e.created_at);
            const now = new Date();
            const minutesAgo = (now.getTime() - created.getTime()) / (1000 * 60);
            return minutesAgo > 5; // Older than 5 minutes
          });
          if (oldPending.length > 0) {
            console.log(`   ⚠️  ${oldPending.length} pending events are older than 5 minutes (may indicate processor issue)`);
          }
        }
      }
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('   ❌ auth_outbox table does not exist');
        console.log('   ⚠️  Run migrations: npm run migration:run');
      } else {
        console.log(`   ❌ Error querying outbox: ${error.message}`);
      }
    }

    // 4. Check recent user registrations
    console.log('\n4️⃣  Recent User Registrations:');
    try {
      const usersQuery = `
        SELECT
          id,
          email,
          "isEmailVerified",
          "emailVerifiedAt",
          "createdAt"
        FROM users
        WHERE "createdAt" > NOW() - INTERVAL '1 hour'
        ORDER BY "createdAt" DESC
        LIMIT 10
      `;
      const recentUsers = await dataSource.query(usersQuery);

      if (recentUsers.length === 0) {
        console.log('   ℹ️  No users registered in the last hour');
      } else {
        console.log(`   📊 Found ${recentUsers.length} users registered in the last hour:\n`);
        recentUsers.forEach((user: any) => {
          const verified = user.isEmailVerified ? '✅' : '❌';
          const createdAt = new Date(user.createdAt).toLocaleString();
          console.log(`      ${verified} ${user.email} - Created: ${createdAt}, Verified: ${user.isEmailVerified}`);
        });
      }
    } catch (error: any) {
      console.log(`   ❌ Error querying users: ${error.message}`);
    }

    // 5. Check verification tokens
    console.log('\n5️⃣  Verification Tokens:');
    try {
      const tokensQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE "expiresAt" > NOW()) as valid,
          COUNT(*) FILTER (WHERE "expiresAt" <= NOW()) as expired
        FROM email_verification_tokens
        WHERE "createdAt" > NOW() - INTERVAL '24 hours'
      `;
      const tokenStats = await dataSource.query(tokensQuery);
      const stats = tokenStats[0];
      console.log(`   📊 Tokens created in last 24 hours:`);
      console.log(`      Total: ${stats.total}`);
      console.log(`      Valid: ${stats.valid}`);
      console.log(`      Expired: ${stats.expired}`);
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('   ❌ email_verification_tokens table does not exist');
        console.log('   ⚠️  Run migrations: npm run migration:run');
      } else {
        console.log(`   ❌ Error querying tokens: ${error.message}`);
      }
    }

    await dataSource.destroy();
  } catch (error: any) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  }

  // 6. Recommendations
  console.log('\n6️⃣  Recommendations:');
  if (!sendgridKey) {
    console.log('   🔧 ACTION REQUIRED: Set SENDGRID_API_KEY environment variable');
    console.log('      Steps:');
    console.log('      1. Sign up for SendGrid: https://sendgrid.com');
    console.log('      2. Create an API key in SendGrid dashboard');
    console.log('      3. Set SENDGRID_API_KEY in your .env file or Railway environment');
    console.log('      4. Restart the backend service');
  } else {
    console.log('   ✅ SendGrid is configured');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic complete\n');
}

// Run the diagnostic
diagnoseEmailVerification().catch((error) => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});

