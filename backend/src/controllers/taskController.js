const db = require('../db/database');

const getAllTasks = async (req, res) => {
    const { sprint_id } = req.query;
    try {
        let query = 'SELECT * FROM Tasks';
        let params = [];
        if (sprint_id) {
            query += ' WHERE sprint_id = ?';
            params.push(sprint_id);
        }
        query += ' ORDER BY date DESC';
        const tasks = await db.all(query, params);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
    }
};

const getStandupTasks = async (req, res) => {
    const { yesterday, today } = req.query;
    if (!yesterday || !today) {
        return res.status(400).json({ error: 'yesterday and today query parameters are required (YYYY-MM-DD)' });
    }
    try {
        const yesterdayTasks = await db.all('SELECT * FROM Tasks WHERE date = ? ORDER BY id', [yesterday]);
        const todayTasks = await db.all('SELECT * FROM Tasks WHERE date = ? ORDER BY id', [today]);
        res.json({ yesterday: yesterdayTasks, today: todayTasks });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch standup tasks', details: err.message });
    }
};

const getTaskById = async (req, res) => {
    const { id } = req.params;
    try {
        const task = await db.get('SELECT * FROM Tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch task', details: err.message });
    }
};

const createTask = async (req, res) => {
    const { sprint_id, date, description, tags, time_spent, status } = req.body;
    if (!sprint_id || !date || !description) {
        return res.status(400).json({ error: 'sprint_id, date, and description are required' });
    }
    const taskStatus = status || 'todo';
    try {
        const result = await db.run(
            'INSERT INTO Tasks (sprint_id, date, description, tags, time_spent, status) VALUES (?, ?, ?, ?, ?, ?)',
            [sprint_id, date, description, tags || null, time_spent || 0, taskStatus]
        );
        res.status(201).json({ 
            id: result.lastID, 
            sprint_id, 
            date, 
            description, 
            tags: tags || null, 
            time_spent: time_spent || 0,
            status: taskStatus
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create task', details: err.message });
    }
};

const updateTask = async (req, res) => {
    const { id } = req.params;
    const { sprint_id, date, description, tags, time_spent, status } = req.body;
    
    if (!sprint_id || !date || !description) {
        return res.status(400).json({ error: 'sprint_id, date, and description are required' });
    }
    const taskStatus = status || 'todo';
    try {
        const result = await db.run(
            'UPDATE Tasks SET sprint_id = ?, date = ?, description = ?, tags = ?, time_spent = ?, status = ? WHERE id = ?',
            [sprint_id, date, description, tags || null, time_spent || 0, taskStatus, id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ 
            id: parseInt(id), 
            sprint_id, 
            date, 
            description, 
            tags: tags || null, 
            time_spent: time_spent || 0,
            status: taskStatus
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update task', details: err.message });
    }
};

const deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.run('DELETE FROM Tasks WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete task', details: err.message });
    }
};

module.exports = {
    getAllTasks,
    getStandupTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};
