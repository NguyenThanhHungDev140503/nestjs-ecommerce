
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.development explicitly
config({ path: resolve(__dirname, '../.env.development') });

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  console.log('--- Testing Neon Connection ---');
  console.log('URL Length:', connectionString?.length);
  
  if (!connectionString) {
    console.error('DATABASE_URL is missing');
    return;
  }

  try {
    const pool = new Pool({ connectionString });
    console.log('Pool created. Connecting...');
    
    const client = await pool.connect();
    console.log('✅ Client connected!');
    
    const res = await client.query('SELECT 1 as val');
    console.log('✅ Query result:', res.rows[0]);
    
    client.release();
    await pool.end();
    console.log('--- Success ---');
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
