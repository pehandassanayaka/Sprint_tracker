const express    = require('express');
const cors       = require('cors');
const sprintRoutes = require('./routes/sprintRoutes');
const taskRoutes   = require('./routes/taskRoutes');
const authRoutes   = require('./routes/authRoutes');

// Ensure database is initialized on startup
require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',    authRoutes);    // public: /login, /register
app.use('/api/sprints', sprintRoutes);  // protected: requires JWT
app.use('/api/tasks',   taskRoutes);    // protected: requires JWT

// Global error handler — returns structured JSON as required by AGENTS.md
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
