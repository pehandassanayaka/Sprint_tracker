const API_BASE_URL = '/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken  = ()          => localStorage.getItem('jwt_token');
export const setToken  = (token)     => localStorage.setItem('jwt_token', token);
export const clearToken = ()         => localStorage.removeItem('jwt_token');

// ── Core fetch wrapper ────────────────────────────────────────────────────────
/**
 * Wraps fetch to automatically:
 *  - Attach Authorization: Bearer <token> when a token is stored
 *  - Parse the JSON error body for readable messages
 *  - Dispatch a global 'auth:logout' event on any 401 so AuthContext can log out
 */
const apiFetch = async (path, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
        // Notify AuthContext that the session has expired / is invalid
        window.dispatchEvent(new Event('auth:logout'));
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Session expired. Please log in again.');
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(body.error || `HTTP error! status: ${response.status}`);
    }

    // 204 No Content — no body to parse
    if (response.status === 204) return null;
    return response.json();
};

// ── Auth API (no token required) ──────────────────────────────────────────────
export const apiLogin    = (username, password) =>
    apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify({ username, password }) });

export const apiRegister = (username, password) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });

export const apiMe = () => apiFetch('/auth/me');

// ── Sprint API ────────────────────────────────────────────────────────────────
export const fetchSprints      = ()          => apiFetch('/sprints');
export const fetchSprintById   = (id)        => apiFetch(`/sprints/${id}`);
export const createSprint      = (sprint)    => apiFetch('/sprints',     { method: 'POST',   body: JSON.stringify(sprint) });
export const updateSprint      = (id, data)  => apiFetch(`/sprints/${id}`, { method: 'PUT',  body: JSON.stringify(data)   });
export const deleteSprint      = (id)        => apiFetch(`/sprints/${id}`, { method: 'DELETE' });

// ── Task API ──────────────────────────────────────────────────────────────────
export const fetchTasksBySprintId = (sprintId) =>
    apiFetch(`/tasks?sprint_id=${sprintId}`);

export const fetchTasks = fetchTasksBySprintId;

export const fetchStandupTasks = (yesterday, today) =>
    apiFetch(`/tasks/standup?yesterday=${yesterday}&today=${today}`);

export const createTask    = (task)         => apiFetch('/tasks',         { method: 'POST',   body: JSON.stringify(task) });
export const updateTask    = (id, task)     => apiFetch(`/tasks/${id}`,   { method: 'PUT',    body: JSON.stringify(task) });
export const deleteTask    = (id)           => apiFetch(`/tasks/${id}`,   { method: 'DELETE' });

export const moveTaskToTomorrow = (taskId) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return apiFetch(`/tasks/${taskId}/move-tomorrow?timezone=${encodeURIComponent(timezone)}`, { method: 'PUT' });
};

export const fetchBlockersByDate = (date, sprintId) => {
    const params = new URLSearchParams();
    if (date)     params.set('date', date);
    if (sprintId) params.set('sprint_id', sprintId);
    return apiFetch(`/tasks/blockers?${params.toString()}`);
};
