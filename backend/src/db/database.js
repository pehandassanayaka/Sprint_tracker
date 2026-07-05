const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Keep DB in the project root directory
const dbPath = path.resolve(__dirname, '../../../database.sqlite');

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
            FOREIGN KEY (sprint_id) REFERENCES Sprints(id) ON DELETE CASCADE
        )`);
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
