const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'budget_v2.db'));

const tables = ['shifts', 'expenses', 'goals', 'backups', 'archives'];

console.log("Initializing Master Reset...");

db.transaction(() => {
    for (const table of tables) {
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`Table '${table}' cleared.`);
    }
    // Reset settings to default
    db.prepare('DELETE FROM settings').run();
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('theme', 'dark');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('currency', 'AUD');
})();

console.log("Hub Data Reset Complete. You can now start fresh.");
db.close();
