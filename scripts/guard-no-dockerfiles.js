#!/usr/bin/env node

/**
 * Guard script to prevent Dockerfile drift and server.cjs references.
 * Railway should use Nixpacks auto-detect, not Dockerfiles or server.cjs.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const dockerfiles = [
  path.join(repoRoot, 'zephix-frontend', 'Dockerfile'),
  path.join(repoRoot, 'zephix-backend', 'Dockerfile'),
];

const serverCjsFiles = [
  path.join(repoRoot, 'zephix-frontend', 'server.cjs'),
  path.join(repoRoot, 'zephix-backend', 'server.cjs'),
];

let found = false;
const errors = [];

// Check for Dockerfiles
for (const dockerfile of dockerfiles) {
  if (fs.existsSync(dockerfile)) {
    found = true;
    const relativePath = path.relative(repoRoot, dockerfile);
    errors.push(`❌ Found ${relativePath}`);
    errors.push(`   Railway should use Nixpacks auto-detect, not Dockerfile.`);
    errors.push(`   Delete this file to enforce Nixpacks usage.`);
  }
}

// Check for server.cjs files
for (const serverCjs of serverCjsFiles) {
  if (fs.existsSync(serverCjs)) {
    found = true;
    const relativePath = path.relative(repoRoot, serverCjs);
    errors.push(`❌ Found ${relativePath}`);
    errors.push(`   Frontend should use vite preview, not server.cjs.`);
    errors.push(`   Delete this file. Railway will use npm run start from package.json.`);
  }
}

// Check package.json for server.cjs references in start scripts
const frontendPackageJson = path.join(repoRoot, 'zephix-frontend', 'package.json');
if (fs.existsSync(frontendPackageJson)) {
  const pkg = JSON.parse(fs.readFileSync(frontendPackageJson, 'utf8'));
  if (pkg.scripts && pkg.scripts.start && pkg.scripts.start.includes('server.cjs')) {
    found = true;
    errors.push(`❌ zephix-frontend/package.json start script references server.cjs`);
    errors.push(`   Start script should be: "vite preview --host 0.0.0.0 --port $PORT"`);
  }
}

if (found) {
  console.error('\n🚫 Deployment drift detected!\n');
  errors.forEach((err) => console.error(err));
  console.error('\n💡 If you need Docker for local development,');
  console.error('   place Dockerfiles under /tools/docker, not in service roots.\n');
  process.exit(1);
}

console.log('✅ No Dockerfiles or server.cjs found. Nixpacks will be used.');
process.exit(0);

