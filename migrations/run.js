// One-off local runner: applies a migration file against DATABASE_URL.
// Usage: node migrations/run.js migrations/001_init.sql
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

const file = process.argv[2];
if (!file) { console.error('Usage: node migrations/run.js <path-to-sql>'); process.exit(1); }

const sql = fs.readFileSync(path.resolve(file), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(sql)
  .then(() => { console.log('Applied', file); return pool.end(); })
  .catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
