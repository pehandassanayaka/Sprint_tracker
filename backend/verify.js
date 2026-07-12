const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Target the exact same path your app uses
const dbPath = process.env.DB_DIR ? path.join(process.env.DB_DIR, 'database.sqlite') : path.resolve(__dirname, '../data/database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

console.log(`Inspecting database at: ${dbPath}\n`);

// PRAGMA table_info returns the blueprint of the table
db.all("PRAGMA table_info(tasks)", (err, rows) => {
    if (err) {
        console.error("Failed to read schema:", err.message);
    } else {
        console.log("=== TASKS TABLE COLUMNS ===");
        console.table(rows.map(row => ({ Name: row.name, Type: row.type, Default: row.dflt_value })));
    }
});

db.close();