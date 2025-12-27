#!/usr/bin/env node

/**
 * Guard script to prevent Dockerfile drift in service roots.
 * Railway should use Nixpacks auto-detect, not Dockerfiles.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const dockerfiles = [
  path.join(repoRoot, 'zephix-frontend', 'Dockerfile'),
  path.join(repoRoot, 'zephix-backend', 'Dockerfile'),
];

let found = false;
const errors = [];

for (const dockerfile of dockerfiles) {
  if (fs.existsSync(dockerfile)) {
    found = true;
    const relativePath = path.relative(repoRoot, dockerfile);
    errors.push(`❌ Found ${relativePath}`);
    errors.push(`   Railway should use Nixpacks auto-detect, not Dockerfile.`);
    errors.push(`   Delete this file to enforce Nixpacks usage.`);
  }
}

if (found) {
  console.error('\n🚫 Dockerfile drift detected!\n');
  errors.forEach((err) => console.error(err));
  console.error('\n💡 If you need Docker for local development,');
  console.error('   place Dockerfiles under /tools/docker, not in service roots.\n');
  process.exit(1);
}

console.log('✅ No Dockerfiles found in service roots. Nixpacks will be used.');
process.exit(0);

