const API_BASE_URL = '/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// --- Sprint API ---
export const fetchSprints = () =>
    fetch(`${API_BASE_URL}/sprints`).then(handleResponse);

export const fetchSprintById = (id) =>
    fetch(`${API_BASE_URL}/sprints/${id}`).then(handleResponse);

export const createSprint = (sprint) =>
    fetch(`${API_BASE_URL}/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprint),
    }).then(handleResponse);

export const updateSprint = (id, sprint) =>
    fetch(`${API_BASE_URL}/sprints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprint),
    }).then(handleResponse);

export const deleteSprint = (id) =>
    fetch(`${API_BASE_URL}/sprints/${id}`, {
        method: 'DELETE',
    }).then(handleResponse);

// --- Task API ---
export const fetchTasksBySprintId = (sprintId) =>
    fetch(`${API_BASE_URL}/tasks?sprint_id=${sprintId}`).then(handleResponse);

export const fetchTasks = fetchTasksBySprintId;

export const fetchStandupTasks = (yesterday, today) =>
    fetch(`${API_BASE_URL}/tasks/standup?yesterday=${yesterday}&today=${today}`).then(handleResponse);

export const createTask = (task) =>
    fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
    }).then(handleResponse);

export const updateTask = (id, task) =>
    fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
    }).then(handleResponse);

export const deleteTask = (id) =>
    fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
    }).then(handleResponse);

export const moveTaskToTomorrow = (taskId) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return fetch(`${API_BASE_URL}/tasks/${taskId}/move-tomorrow?timezone=${encodeURIComponent(timezone)}`, {
        method: 'PUT',
    }).then(handleResponse);
};

/**
 * Fetch all tasks where type = 'blocker'.
 * @param {string} [date]     - ISO date string YYYY-MM-DD to scope to a single day.
 * @param {number} [sprintId] - Sprint ID to scope to a specific sprint.
 */
export const fetchBlockersByDate = (date, sprintId) => {
    const params = new URLSearchParams();
    if (date)     params.set('date', date);
    if (sprintId) params.set('sprint_id', sprintId);
    return fetch(`${API_BASE_URL}/tasks/blockers?${params.toString()}`).then(handleResponse);
};
