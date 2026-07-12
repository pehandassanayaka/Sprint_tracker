const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db/database');

const JWT_SECRET      = process.env.JWT_SECRET || 'change_this_secret_in_production';
const JWT_EXPIRES_IN  = process.env.JWT_EXPIRES_IN || '7d';

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    try {
        const existing = await db.get('SELECT id FROM Users WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        const password_hash = await bcrypt.hash(password, 12);
        const result = await db.run(
            'INSERT INTO Users (username, password_hash) VALUES (?, ?)',
            [username, password_hash]
        );
        const token = jwt.sign({ id: result.lastID, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({ token, user: { id: result.lastID, username } });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed', details: err.message });
    }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }
    try {
        const user = await db.get('SELECT * FROM Users WHERE username = ?', [username]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed', details: err.message });
    }
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns the current authenticated user's profile. Protected by authMiddleware.
const me = async (req, res) => {
    try {
        const user = await db.get('SELECT id, username, created_at FROM Users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user', details: err.message });
    }
};

module.exports = { register, login, me };
