/**
 * Phase 2C: Migration idempotency regression suite.
 * Verifies all Phase 2B DDL uses idempotent patterns.
 * Does not require a live DB — validates SQL patterns structurally.
 */
import * as fs from 'fs';
import * as path from 'path';

describe('Migration Idempotency — Phase 2B', () => {
  let migrationSql: string;

  beforeAll(() => {
    const migrationPath = path.join(
      __dirname,
      '../../../../migrations/18000000000002-WaterfallCoreScheduleBaselinesEV.ts',
    );
    migrationSql = fs.readFileSync(migrationPath, 'utf8');
  });

  it('migration file exists', () => {
    expect(migrationSql).toBeDefined();
    expect(migrationSql.length).toBeGreaterThan(0);
  });

  it('all ALTER TABLE ADD COLUMN use IF NOT EXISTS', () => {
    const addColumnLines = migrationSql
      .split('\n')
      .filter((l) => l.toUpperCase().includes('ADD COLUMN') && !l.trim().startsWith('//') && !l.trim().startsWith('*'));

    for (const line of addColumnLines) {
      expect(line.toUpperCase()).toContain('IF NOT EXISTS');
    }
    expect(addColumnLines.length).toBeGreaterThan(0);
  });

  it('all CREATE TABLE use IF NOT EXISTS', () => {
    const createTableLines = migrationSql
      .split('\n')
      .filter((l) => l.toUpperCase().includes('CREATE TABLE') && !l.trim().startsWith('//') && !l.trim().startsWith('*'));

    for (const line of createTableLines) {
      expect(line.toUpperCase()).toContain('IF NOT EXISTS');
    }
    expect(createTableLines.length).toBeGreaterThan(0);
  });

  it('all CREATE INDEX use IF NOT EXISTS', () => {
    const createIndexLines = migrationSql
      .split('\n')
      .filter(
        (l) =>
          l.toUpperCase().includes('CREATE INDEX') ||
          l.toUpperCase().includes('CREATE UNIQUE INDEX'),
      )
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'));

    for (const line of createIndexLines) {
      expect(line.toUpperCase()).toContain('IF NOT EXISTS');
    }
    expect(createIndexLines.length).toBeGreaterThan(0);
  });

  it('all ADD CONSTRAINT use DO $$ exception guard', () => {
    // Constraints must be wrapped in DO $$ BEGIN ... EXCEPTION WHEN duplicate_object
    const constraintBlocks = migrationSql.match(
      /ADD CONSTRAINT[\s\S]*?END \$\$/g,
    );

    expect(constraintBlocks).not.toBeNull();
    expect(constraintBlocks!.length).toBeGreaterThan(0);

    for (const block of constraintBlocks!) {
      expect(block).toContain('EXCEPTION WHEN duplicate_object');
    }
  });

  it('all FOREIGN KEY use DO $$ exception guard', () => {
    const fkBlocks = migrationSql.match(
      /FOREIGN KEY[\s\S]*?END \$\$/g,
    );

    expect(fkBlocks).not.toBeNull();
    for (const block of fkBlocks!) {
      expect(block).toContain('EXCEPTION WHEN duplicate_object');
    }
  });

  it('down migration uses IF EXISTS for all DROP and ALTER operations', () => {
    const downSection = migrationSql.split('async down')[1];
    expect(downSection).toBeDefined();

    const dropLines = downSection
      .split('\n')
      .filter(
        (l) =>
          (l.toUpperCase().includes('DROP TABLE') || l.toUpperCase().includes('DROP COLUMN')) &&
          !l.trim().startsWith('//') && !l.trim().startsWith('*'),
      );

    for (const line of dropLines) {
      expect(line.toUpperCase()).toContain('IF EXISTS');
    }
  });

  it('no duplicate table names in CREATE TABLE statements', () => {
    const tableNames = migrationSql
      .match(/CREATE TABLE IF NOT EXISTS (\w+)/gi)
      ?.map((m) => m.replace(/CREATE TABLE IF NOT EXISTS /i, '').trim());

    if (tableNames) {
      const unique = new Set(tableNames);
      expect(unique.size).toBe(tableNames.length);
    }
  });
});
