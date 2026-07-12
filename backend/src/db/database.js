const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs   = require('fs');

// Production: DB_DIR env var points to the Docker-mounted volume path (/app/data).
// Local dev (no env var): prefer ./data/database.sqlite next to the project root,
// but fall back to the legacy project-root database.sqlite so existing installs
// continue to work without moving anything.
const dataDir     = process.env.DB_DIR || path.resolve(__dirname, '../../../data');
const primaryPath = path.join(dataDir, 'database.sqlite');
const legacyPath  = path.resolve(__dirname, '../../../database.sqlite');
const dbPath = fs.existsSync(primaryPath)
    ? primaryPath
    : (fs.existsSync(legacyPath) ? legacyPath : primaryPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Enable foreign key constraints
        db.run('PRAGMA foreign_keys = ON');

        // Create Sprints table
        db.run(`CREATE TABLE IF NOT EXISTS Sprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL
        )`);

        // Create Tasks table
        db.run(`CREATE TABLE IF NOT EXISTS Tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sprint_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            tags TEXT,
            time_spent REAL,
            status TEXT DEFAULT 'todo',
            type TEXT NOT NULL DEFAULT 'task',
            FOREIGN KEY (sprint_id) REFERENCES Sprints(id) ON DELETE CASCADE
        )`, (tableErr) => {
            if (tableErr) {
                console.error('Error creating Tasks table:', tableErr.message);
                return;
            }
            // Runtime migration guard: adds the `type` column to databases that
            // existed before this column was introduced. SQLite throws an error
            // if the column already exists, so we catch and ignore it safely.
            db.run(`ALTER TABLE Tasks ADD COLUMN type TEXT NOT NULL DEFAULT 'task'`, (alterErr) => {
                if (alterErr && !alterErr.message.includes('duplicate column name')) {
                    console.error('Migration error (type column):', alterErr.message);
                }
            });
        });
    }
});

// Promise wrappers
const run = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const get = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = {
    db,
    run,
    get,
    all
};
