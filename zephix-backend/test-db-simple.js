"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const testConnection = async () => {
    const client = new pg_1.Client({
        connectionString: process.env.DATABASE_URL,
    });
    try {
        await client.connect();
        console.log('✅ Database connection successful');
        const result = await client.query(`
      SELECT id, name, created_at, updated_at, trial_ends_at 
      FROM organizations 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
        console.log('✅ Query successful:', result.rows);
        await client.end();
    }
    catch (error) {
        console.error('❌ Database error:', error);
    }
};
testConnection();
