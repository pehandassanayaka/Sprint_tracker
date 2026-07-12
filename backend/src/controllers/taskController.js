const db = require('../db/database');

// Allowed values for the `type` column
const VALID_TYPES = new Set(['task', 'blocker']);
const VALID_STATUSES = new Set(['todo', 'done']);

const getAllTasks = async (req, res) => {
    const { sprint_id } = req.query;
    try {
        // Exclude blockers — they are served exclusively by GET /api/tasks/blockers
        // to prevent the UI from receiving the same row from two different API calls.
        let query = "SELECT * FROM Tasks WHERE type != 'blocker'";
        let params = [];
        if (sprint_id) {
            query += ' AND sprint_id = ?';
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
    const { sprint_id, date, description, tags, time_spent, status, type } = req.body;
    if (!sprint_id || !date || !description) {
        return res.status(400).json({ error: 'sprint_id, date, and description are required' });
    }
    const taskStatus = status || 'todo';
    if (!VALID_STATUSES.has(taskStatus)) {
        return res.status(400).json({ error: `Invalid status '${taskStatus}'. Must be one of: ${[...VALID_STATUSES].join(', ')}` });
    }
    const taskType = type || 'task';
    if (!VALID_TYPES.has(taskType)) {
        return res.status(400).json({ error: `Invalid type '${taskType}'. Must be one of: ${[...VALID_TYPES].join(', ')}` });
    }
    try {
        const result = await db.run(
            'INSERT INTO Tasks (sprint_id, date, description, tags, time_spent, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sprint_id, date, description, tags || null, time_spent || 0, taskStatus, taskType]
        );
        res.status(201).json({
            id: result.lastID,
            sprint_id,
            date,
            description,
            tags: tags || null,
            time_spent: time_spent || 0,
            status: taskStatus,
            type: taskType,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create task', details: err.message });
    }
};

const updateTask = async (req, res) => {
    const { id } = req.params;
    const { sprint_id, date, description, tags, time_spent, status, type } = req.body;

    if (!sprint_id || !date || !description) {
        return res.status(400).json({ error: 'sprint_id, date, and description are required' });
    }
    const taskStatus = status || 'todo';
    if (!VALID_STATUSES.has(taskStatus)) {
        return res.status(400).json({ error: `Invalid status '${taskStatus}'. Must be one of: ${[...VALID_STATUSES].join(', ')}` });
    }
    const taskType = type || 'task';
    if (!VALID_TYPES.has(taskType)) {
        return res.status(400).json({ error: `Invalid type '${taskType}'. Must be one of: ${[...VALID_TYPES].join(', ')}` });
    }
    try {
        const result = await db.run(
            'UPDATE Tasks SET sprint_id = ?, date = ?, description = ?, tags = ?, time_spent = ?, status = ?, type = ? WHERE id = ?',
            [sprint_id, date, description, tags || null, time_spent || 0, taskStatus, taskType, id]
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
            status: taskStatus,
            type: taskType,
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

/**
 * PUT /api/tasks/:id/move-tomorrow
 *
 * Moves an uncompleted task to tomorrow's date relative to the client's
 * local timezone. Pass the IANA timezone name as a query parameter:
 *   ?timezone=Asia/Colombo
 * If omitted, UTC is used as the fallback.
 */
const moveTomorrow = async (req, res) => {
    const { id } = req.params;
    const { timezone } = req.query;

    // Resolve the client timezone, falling back to UTC if invalid/missing
    let resolvedTimezone = 'UTC';
    if (timezone) {
        try {
            // Validate the timezone string by attempting to format a date with it
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            resolvedTimezone = timezone;
        } catch {
            return res.status(400).json({ error: `Invalid timezone: '${timezone}'. Use a valid IANA timezone name (e.g. Asia/Colombo).` });
        }
    }

    try {
        // 1. Fetch the task
        const task = await db.get('SELECT * FROM Tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // 2. Only uncompleted tasks may be moved
        if (task.status === 'done') {
            return res.status(409).json({ error: 'Cannot move a completed task to tomorrow.' });
        }

        // 3. Calculate tomorrow's date in the client's local timezone
        //    Using Intl.DateTimeFormat to extract year/month/day avoids DST
        //    issues that arise from simple arithmetic on UTC timestamps.
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: resolvedTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        // en-CA locale formats dates as YYYY-MM-DD — no extra parsing needed
        const todayLocal = formatter.format(now); // e.g. "2026-07-11"
        const tomorrowDate = new Date(`${todayLocal}T00:00:00`);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = formatter.format(tomorrowDate); // e.g. "2026-07-12"

        // 4. Update the task's date in the database
        await db.run('UPDATE Tasks SET date = ? WHERE id = ?', [tomorrowStr, id]);

        // 5. Return the full updated task object
        const updatedTask = await db.get('SELECT * FROM Tasks WHERE id = ?', [id]);
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: 'Failed to move task to tomorrow', details: err.message });
    }
};

/**
 * GET /api/tasks/blockers?date=YYYY-MM-DD[&sprint_id=N]
 *
 * Returns all tasks where type = 'blocker' for the given date.
 * Optionally scoped to a sprint via sprint_id.
 * If no date is provided, returns all blockers across the sprint (or all sprints).
 */
const getBlockersByDate = async (req, res) => {
    const { date, sprint_id } = req.query;
    try {
        let query = "SELECT * FROM Tasks WHERE type = 'blocker'";
        const params = [];
        if (date) {
            query += ' AND date = ?';
            params.push(date);
        }
        if (sprint_id) {
            query += ' AND sprint_id = ?';
            params.push(sprint_id);
        }
        query += ' ORDER BY date DESC, id ASC';
        const blockers = await db.all(query, params);
        res.json(blockers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch blockers', details: err.message });
    }
};

module.exports = {
    getAllTasks,
    getStandupTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    moveTomorrow,
    getBlockersByDate,
};
