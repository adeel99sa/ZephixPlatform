-- Zephix Migration State Fix Script
-- This script surgically fixes migration state conflicts without data loss
-- Run this via: railway run psql $DATABASE_URL -f scripts/fix-migration-state.sql

-- First, let's see what we're working with
\echo '=== Current Migration State ==='
SELECT timestamp, name FROM migrations ORDER BY timestamp;

\echo '=== Checking for Conflicting Tables ==='
\dt users;
\dt organizations;
\dt status_reports;

-- Step 1: Remove problematic migration entries that are causing conflicts
\echo '=== Removing Problematic Migration Entries ==='
DELETE FROM migrations WHERE name IN (
  'CreateAuthTables1700000000002',
  'FixMigrationConflict1755044976001',
  'ResetMigrationState1700000000000'
);

-- Step 2: Check if organizationId column exists in users table
\echo '=== Checking organizationId Column Status ==='
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'organizationId'
  ) THEN
    \echo '✅ organizationId column already exists in users table';
    
    -- Column exists, so mark the migration as completed without running it
    INSERT INTO migrations (timestamp, name) 
    VALUES (1700000000002, 'CreateAuthTables1700000000002')
    ON CONFLICT DO NOTHING;
    
    \echo '✅ Marked CreateAuthTables migration as completed';
  ELSE
    \echo '❌ organizationId column does not exist - will be created by migration';
  END IF;
END $$;

-- Step 3: Check if status_reports table exists
\echo '=== Checking status_reports Table Status ==='
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'status_reports'
  ) THEN
    \echo '✅ status_reports table already exists';
    
    -- Table exists, so mark the migration as completed
    INSERT INTO migrations (timestamp, name) 
    VALUES (1755044971817, 'StatusReporting1755044971817')
    ON CONFLICT DO NOTHING;
    
    \echo '✅ Marked StatusReporting migration as completed';
  ELSE
    \echo '❌ status_reports table does not exist - will be created by migration';
  END IF;
END $$;

-- Step 4: Verify final migration state
\echo '=== Final Migration State ==='
SELECT timestamp, name FROM migrations ORDER BY timestamp;

\echo '=== Migration State Fix Complete ===';
\echo 'Next steps:';
\echo '1. Run: railway run npm run migration:run';
\echo '2. Check if any new migrations run successfully';
\echo '3. If successful, deploy: railway up';
