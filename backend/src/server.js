const express = require('express');
const cors = require('cors');
const path = require('path'); // Added path module
const sprintRoutes = require('./routes/sprintRoutes');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

// Ensure database is initialized on startup
require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);    // public: /login, /register
app.use('/api/sprints', sprintRoutes);  // protected: requires JWT
app.use('/api/tasks', taskRoutes);    // protected: requires JWT

// --- NEW: React Frontend Routing ---
// 1. Serve the compiled React static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// 2. Catch-all route for React Router (must be placed AFTER API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});
// -----------------------------------

// Global error handler — returns structured JSON as required by AGENTS.md
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});