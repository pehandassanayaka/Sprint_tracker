const API_BASE_URL = 'http://localhost:3001/api';

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

// --- Task API ---
export const fetchTasksBySprintId = (sprintId) =>
    fetch(`${API_BASE_URL}/tasks?sprint_id=${sprintId}`).then(handleResponse);

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
