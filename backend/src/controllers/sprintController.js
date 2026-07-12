const db = require('../db/database');

const getAllSprints = async (req, res) => {
    try {
        // Only return sprints belonging to the authenticated user
        const sprints = await db.all(
            'SELECT * FROM Sprints WHERE user_id = ? ORDER BY start_date DESC',
            [req.user.id]
        );
        res.json(sprints);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sprints', details: err.message });
    }
};

const getSprintById = async (req, res) => {
    const { id } = req.params;
    try {
        // Scope lookup to the authenticated user so IDs can't be guessed
        const sprint = await db.get(
            'SELECT * FROM Sprints WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }
        res.json(sprint);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sprint', details: err.message });
    }
};

const createSprint = async (req, res) => {
    const { start_date, end_date, name } = req.body;
    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    const sprintName = name || null;
    try {
        const result = await db.run(
            'INSERT INTO Sprints (start_date, end_date, name, user_id) VALUES (?, ?, ?, ?)',
            [start_date, end_date, sprintName, req.user.id]
        );
        res.status(201).json({ id: result.lastID, start_date, end_date, name: sprintName, user_id: req.user.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create sprint', details: err.message });
    }
};

const updateSprint = async (req, res) => {
    const { id } = req.params;
    const { start_date, end_date, name } = req.body;
    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    const sprintName = name || null;
    try {
        // WHERE user_id = ? prevents one user from editing another's sprint
        const result = await db.run(
            'UPDATE Sprints SET start_date = ?, end_date = ?, name = ? WHERE id = ? AND user_id = ?',
            [start_date, end_date, sprintName, id, req.user.id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Sprint not found' });
        }
        res.json({ id: parseInt(id), start_date, end_date, name: sprintName });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update sprint', details: err.message });
    }
};

const deleteSprint = async (req, res) => {
    const { id } = req.params;

    try {
        // First verify the sprint belongs to this user
        const sprint = await db.get(
            'SELECT id FROM Sprints WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );
        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }

        await db.run('BEGIN TRANSACTION');

        // Cascade: delete all tasks for this sprint
        await db.run('DELETE FROM Tasks WHERE sprint_id = ? AND user_id = ?', [id, req.user.id]);

        // Delete the sprint itself
        const result = await db.run(
            'DELETE FROM Sprints WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (result.changes === 0) {
            await db.run('ROLLBACK');
            return res.status(404).json({ error: 'Sprint not found' });
        }

        await db.run('COMMIT');
        res.json({ message: 'Sprint and all associated tasks deleted successfully' });

    } catch (err) {
        try { await db.run('ROLLBACK'); } catch (_) { /* ignore */ }
        res.status(500).json({ error: 'Failed to delete sprint', details: err.message });
    }
};

module.exports = {
    getAllSprints,
    getSprintById,
    createSprint,
    updateSprint,
    deleteSprint
};
