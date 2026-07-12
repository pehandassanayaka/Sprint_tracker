const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Mirror the exact path logic from src/db/database.js
// DB_DIR env var (set in Docker) or fall back to ./data/ next to the project root
const dataDir = process.env.DB_DIR
    ? process.env.DB_DIR
    : path.resolve(__dirname, '../data');   // ../data from backend/ = project-root/data

// Support legacy location: if the project-root/data/ doesn't have the file
// but project-root/database.sqlite does, use that instead.
const primaryPath = path.join(dataDir, 'database.sqlite');
const legacyPath  = path.resolve(__dirname, '../database.sqlite');
const fs = require('fs');
const dbPath = fs.existsSync(primaryPath)
    ? primaryPath
    : (fs.existsSync(legacyPath) ? legacyPath : primaryPath);

console.log(`Running migration on: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath);

// Serialize ensures each statement runs to completion before the next starts
db.serialize(() => {
    db.run('PRAGMA foreign_keys = OFF');

    // ── 1. Create Users table ────────────────────────────────────────────────
    db.run(`
        CREATE TABLE IF NOT EXISTS Users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `, err => {
        if (err) { console.error('Error creating Users table:', err.message); process.exit(1); }
        console.log('✓ Users table ready.');
    });

    // ── 2. Add user_id to Sprints (idempotent) ───────────────────────────────
    db.run(`ALTER TABLE Sprints ADD COLUMN user_id INTEGER REFERENCES Users(id)`, err => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding user_id to Sprints:', err.message); process.exit(1);
        }
        console.log('✓ user_id column on Sprints ready.');
    });

    // ── 3. Add user_id to Tasks (idempotent) ─────────────────────────────────
    db.run(`ALTER TABLE Tasks ADD COLUMN user_id INTEGER REFERENCES Users(id)`, err => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding user_id to Tasks:', err.message); process.exit(1);
        }
        console.log('✓ user_id column on Tasks ready.');
    });

    // ── 4. Create default 'admin' user and assign all existing data ──────────
    const passwordHash = bcrypt.hashSync('admin123', 12);

    db.run(
        `INSERT OR IGNORE INTO Users (username, password_hash) VALUES ('admin', ?)`,
        [passwordHash],
        function(err) {
            if (err) { console.error('Error creating admin user:', err.message); process.exit(1); }

            // Get the admin user's id (either just inserted or already existing)
            db.get(`SELECT id FROM Users WHERE username = 'admin'`, (err, row) => {
                if (err || !row) { console.error('Cannot resolve admin user id.'); process.exit(1); }

                const adminId = row.id;
                console.log(`✓ Admin user ready (id=${adminId}).`);

                // Assign all unowned sprints to admin
                db.run(
                    `UPDATE Sprints SET user_id = ? WHERE user_id IS NULL`,
                    [adminId],
                    function(err) {
                        if (err) { console.error('Error assigning sprints to admin:', err.message); process.exit(1); }
                        console.log(`✓ ${this.changes} existing sprint(s) assigned to admin.`);
                    }
                );

                // Assign all unowned tasks to admin
                db.run(
                    `UPDATE Tasks SET user_id = ? WHERE user_id IS NULL`,
                    [adminId],
                    function(err) {
                        if (err) { console.error('Error assigning tasks to admin:', err.message); process.exit(1); }
                        console.log(`✓ ${this.changes} existing task(s) assigned to admin.`);
                        console.log('\nMigration complete.\n');
                        console.log('Admin credentials:');
                        console.log('  username: admin');
                        console.log('  password: admin123');
                        console.log('\nChange the admin password after first login.\n');
                        db.run('PRAGMA foreign_keys = ON');
                        db.close();
                    }
                );
            });
        }
    );
});
