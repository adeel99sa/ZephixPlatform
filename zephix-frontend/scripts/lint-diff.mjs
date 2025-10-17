#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Get changed files from git
const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' })
  .split('\n')
  .filter(f => f.match(/\.(ts|tsx)$/))
  .filter(f => f.startsWith('src/'));

if (changedFiles.length === 0) {
  console.log('No changed TypeScript files to lint');
  process.exit(0);
}

// Create ESLint config for diff-only rules
const eslintConfig = {
  extends: ['@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'react-hooks/exhaustive-deps': 'error'
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
};

// Write temp config
import { writeFileSync } from 'node:fs';
writeFileSync('.eslintrc.diff.json', JSON.stringify(eslintConfig, null, 2));

try {
  // Run ESLint on changed files only
  const result = execSync(
    `npx eslint --config .eslintrc.diff.json ${changedFiles.join(' ')}`,
    { encoding: 'utf8', stdio: 'pipe' }
  );
  console.log('✅ No new violations in changed files');
} catch (error) {
  console.error('❌ New violations found in changed files:');
  console.error(error.stdout);
  process.exit(1);
} finally {
  // Clean up temp config
  execSync('rm -f .eslintrc.diff.json');
}
