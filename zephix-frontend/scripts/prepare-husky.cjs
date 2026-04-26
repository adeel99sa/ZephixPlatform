const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const huskyBin = join(__dirname, '..', 'node_modules', '.bin', 'husky');
const gitDir = join(process.cwd(), '.git');

if (!existsSync(huskyBin) || !existsSync(gitDir)) {
  process.exit(0);
}

const result = spawnSync(huskyBin, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 0);
