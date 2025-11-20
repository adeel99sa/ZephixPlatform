#!/bin/bash
set -euo pipefail

# Quick audit: verify all 4 demo users exist
node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  const emails = ['demo@zephix.ai','admin@zephix.ai','member@zephix.ai','guest@zephix.ai'];
  const { rows } = await c.query('SELECT email FROM users WHERE email = ANY(\$1)', [emails]);
  const found = new Set(rows.map(r => r.email));
  const missing = emails.filter(e => !found.has(e));
  await c.end();
  if (missing.length) {
    console.error('❌ Missing demo users:', missing);
    process.exit(1);
  }
  console.log('✅ All demo users present');
})();
"

