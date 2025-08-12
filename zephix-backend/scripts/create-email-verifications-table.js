#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function createEmailVerificationsTable() {
  console.log('🔗 Connecting to database...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully!');

    // Check if the email_verifications table already exists
    console.log('\n📊 Checking if email_verifications table exists...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'email_verifications'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('ℹ️  email_verifications table already exists');
    } else {
      console.log('🔨 Creating email_verifications table...');
      
      // Create the email_verifications table
      await client.query(`
        CREATE TABLE "email_verifications" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "token" character varying NOT NULL,
          "email" character varying NOT NULL,
          "userId" uuid NOT NULL,
          "status" character varying NOT NULL DEFAULT 'pending',
          "expiresAt" TIMESTAMP NOT NULL,
          "verifiedAt" TIMESTAMP,
          "ipAddress" inet,
          "userAgent" text,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_email_verifications" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_email_verifications_token" UNIQUE ("token")
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX "IDX_EMAIL_VERIFICATION_TOKEN" ON "email_verifications" ("token")
      `);

      await client.query(`
        CREATE INDEX "IDX_EMAIL_VERIFICATION_USER" ON "email_verifications" ("userId")
      `);

      await client.query(`
        CREATE INDEX "IDX_EMAIL_VERIFICATION_EXPIRES" ON "email_verifications" ("expiresAt")
      `);

      // Add foreign key constraint
      await client.query(`
        ALTER TABLE "email_verifications" 
        ADD CONSTRAINT "FK_email_verifications_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      `);

      console.log('✅ Created email_verifications table with all constraints and indexes');
    }

    // Verify the table structure
    console.log('\n📋 Table structure:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'email_verifications' 
      ORDER BY ordinal_position
    `);
    
    console.log('Column Name\t\tData Type\t\tNullable\tDefault');
    console.log('─'.repeat(80));
    columns.rows.forEach((col) => {
      console.log(`${col.column_name.padEnd(20)}\t${col.data_type.padEnd(20)}\t${col.is_nullable.padEnd(10)}\t${col.column_default || 'NULL'}`);
    });

    // Check indexes
    console.log('\n🔍 Indexes:');
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'email_verifications'
    `);
    
    indexes.rows.forEach((idx) => {
      console.log(`📌 ${idx.indexname}: ${idx.indexdef}`);
    });

    // Check constraints
    console.log('\n🔒 Constraints:');
    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'email_verifications'::regclass
    `);
    
    constraints.rows.forEach((con) => {
      console.log(`🔒 ${con.conname} (${con.contype}): ${con.definition}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  createEmailVerificationsTable().catch(console.error);
}

module.exports = { createEmailVerificationsTable };
