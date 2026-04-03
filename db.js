const { Pool } = require('pg');
require('dotenv').config();

// Use Internal Database URL from Render in production, or local connection string
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Render Postgres connections
  }
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        date TEXT,
        week_label TEXT,
        type TEXT,
        hours REAL,
        minutes REAL,
        break_minutes REAL,
        is_double_shift INTEGER DEFAULT 0,
        total_pay_estimated REAL,
        total_pay_actual REAL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        name TEXT,
        amount REAL,
        category TEXT,
        date TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        type TEXT,
        name TEXT,
        bio TEXT,
        target_amount REAL,
        current_saved REAL DEFAULT 0,
        deadline TEXT,
        category TEXT,
        priority_score INTEGER DEFAULT 0,
        priority_label TEXT,
        ai_reasoning TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Default settings
    await client.query("INSERT INTO settings (key, value) VALUES ('theme', 'dark') ON CONFLICT (key) DO NOTHING");
    await client.query("INSERT INTO settings (key, value) VALUES ('currency', 'AUD') ON CONFLICT (key) DO NOTHING");
    
    console.log("PostgreSQL Hub Initialized Successfully.");
  } finally {
    client.release();
  }
};

initDb().catch(err => console.error('Database Init Error', err));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
