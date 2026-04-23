const { Pool } = require('pg');

let pool;
let initialized = false;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureSchema() {
  if (initialized) return;
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id SERIAL PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      duration INTEGER NOT NULL,
      calories INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      logged_time VARCHAR(10),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`);
  initialized = true;
}

module.exports = { getPool, ensureSchema };
