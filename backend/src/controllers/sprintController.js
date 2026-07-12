const db = require('../db/database');

const getAllSprints = async (req, res) => {
    try {
        const sprints = await db.all('SELECT * FROM Sprints ORDER BY start_date DESC');
        res.json(sprints);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sprints', details: err.message });
    }
};

const getSprintById = async (req, res) => {
    const { id } = req.params;
    try {
        const sprint = await db.get('SELECT * FROM Sprints WHERE id = ?', [id]);
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
        const result = await db.run('INSERT INTO Sprints (start_date, end_date, name) VALUES (?, ?, ?)', [start_date, end_date, sprintName]);
        res.status(201).json({ id: result.lastID, start_date, end_date, name: sprintName });
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
        const result = await db.run('UPDATE Sprints SET start_date = ?, end_date = ?, name = ? WHERE id = ?', [start_date, end_date, sprintName, id]);
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
        // Safety check: refuse deletion if the sprint has associated tasks.
        // This prevents silent data loss. The client must cascade-delete
        // tasks first, or the user must choose a different sprint.
        const taskCount = await db.get(
            'SELECT COUNT(*) AS count FROM Tasks WHERE sprint_id = ?', [id]
        );
        if (taskCount && taskCount.count > 0) {
            return res.status(409).json({
                error: `Cannot delete sprint: it has ${taskCount.count} associated task${taskCount.count !== 1 ? 's' : ''}. Delete all tasks first.`
            });
        }

        const result = await db.run('DELETE FROM Sprints WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Sprint not found' });
        }
        res.json({ message: 'Sprint deleted successfully' });
    } catch (err) {
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
