import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('railway') ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  const r1 = await client.query(`SELECT current_database() AS db;`);
  const r2 = await client.query(`SELECT inet_server_addr() AS server_ip, inet_server_port() AS server_port;`);
  const r3 = await client.query(`SHOW server_version;`);

  // Check if migrations table exists
  let migrationsRows = 0;
  try {
    const r4 = await client.query(`SELECT COUNT(*)::int AS migrations_rows FROM migrations;`);
    migrationsRows = r4.rows[0]?.migrations_rows || 0;
  } catch (e) {
    // migrations table doesn't exist yet
  }

  console.log({
    database_url_host: new URL(url).host,
    db: r1.rows[0].db,
    server_ip: r2.rows[0].server_ip,
    server_port: r2.rows[0].server_port,
    server_version: r3.rows[0].server_version,
    migrations_rows: migrationsRows,
    node_env: process.env.NODE_ENV,
    database_url: url.replace(/:[^:@]+@/, ':****@'), // Mask password
  });

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

