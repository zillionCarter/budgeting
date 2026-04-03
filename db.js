const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'budget_v2.db'));

// Schema initialization for v2 "AppleBudget"
db.exec(`
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    week_label TEXT,
    type TEXT, -- weekday, weekend, public_holiday
    hours REAL,
    minutes REAL,
    break_minutes REAL,
    is_double_shift INTEGER DEFAULT 0,
    total_pay_estimated REAL,
    total_pay_actual REAL,
    status TEXT DEFAULT 'pending', -- pending, paid
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    amount REAL,
    category TEXT,
    date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- goal, want
    name TEXT,
    bio TEXT,
    target_amount REAL,
    current_saved REAL DEFAULT 0,
    deadline TEXT,
    category TEXT,
    priority_score INTEGER DEFAULT 0,
    priority_label TEXT,
    ai_reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Default settings
const initSettings = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
initSettings.run('theme', 'system');
initSettings.run('currency', 'AUD');
initSettings.run('gemini_key', '');

module.exports = db;
