import { useState, useEffect, useCallback, useRef } from 'react';
import {
    fetchSprints,
    fetchTasksBySprintId,
    createTask,
    updateTask,
    deleteTask,
    createSprint,
    updateSprint,
    fetchStandupTasks,
    moveTaskToTomorrow,
    fetchBlockersByDate,
} from './services/api';
import './index.css';
import RetroReportPage from './components/RetroReportPage';

// ─── Utilities ───────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TAG_PRESETS = [
    { id: 'meetings',    label: '#meetings',    cls: 'meeting' },
    { id: 'ticket-work', label: '#ticket-work', cls: 'ticket-work' },
    { id: 'unplanned',   label: '#unplanned',   cls: 'unplanned' },
    { id: 'review',      label: '#review',      cls: 'custom' },
    { id: 'planning',    label: '#planning',    cls: 'custom' },
];

const getTagClass = (tag) => {
    if (!tag) return 'default';
    const t = tag.toLowerCase().trim();
    if (t === 'meetings') return 'meeting';
    if (t === 'ticket-work') return 'ticket-work';
    if (t === 'unplanned') return 'unplanned';
    return 'default';
};

const getTagDotClass = (tag) => {
    const t = (tag || '').toLowerCase().trim();
    if (t === 'meetings') return 'meeting';
    if (t === 'ticket-work') return 'ticket-work';
    if (t === 'unplanned') return 'unplanned';
    return 'other';
};

const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const toISODate = (d) => d.toISOString().slice(0, 10);

const buildSprintDays = (startDate, endDate) => {
    const days = [];
    const start = new Date(startDate + 'T12:00:00');
    const end   = new Date(endDate + 'T12:00:00');
    const today = toISODate(new Date());
    let cur = new Date(start);
    while (cur <= end) {
        const dayOfWeek = cur.getDay();
        // Skip Saturday (6) and Sunday (0) — only render business days
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const iso = toISODate(cur);
            days.push({
                iso,
                day: cur.getDate(),
                weekdayIndex: dayOfWeek,
                weekdayName: WEEKDAYS[dayOfWeek],
                isToday: iso === today,
                isWeekend: false,
            });
        }
        cur.setDate(cur.getDate() + 1);
    }
    return days;
};

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);

    const icon = type === 'success' ? '✓' : '✕';
    return (
        <div className={`toast ${type}`} role="alert">
            <span>{icon}</span>
            <span>{message}</span>
        </div>
    );
}

// ─── Add Task Modal ───────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete, onMoveTomorrow, movingId }) {
    const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const isDone = task.status === 'done';
    const isBlocker = task.type === 'blocker';
    const isMoving = movingId === task.id;

    return (
        <div className={`task-item ${isBlocker ? 'task-blocker' : ''}`}>
            <button
                className={`task-checkbox ${isDone ? 'checked' : ''}`}
                onClick={() => onToggle(task)}
                aria-label={isDone ? 'Mark as to do' : 'Mark as done'}
                title={isDone ? 'Move back to To Do' : 'Mark as Done'}
            >
                {isDone ? '✓' : ''}
            </button>
            <div className="task-item-body">
                <div className="task-item-desc">{task.description}</div>
                <div className="task-item-meta">
                    {tags.map((tag, i) => (
                        <span key={i} className={`task-tag ${getTagClass(tag)}`}>#{tag}</span>
                    ))}
                    {task.time_spent > 0 && (
                        <span className="task-hours">{task.time_spent}h</span>
                    )}
                </div>
            </div>
            {!isDone && onMoveTomorrow && (
                <button
                    className="task-move-btn"
                    onClick={() => onMoveTomorrow(task.id)}
                    disabled={isMoving || movingId != null}
                    aria-label="Move task to tomorrow"
                    title={isMoving ? 'Moving…' : 'Move to Tomorrow'}
                >
                    {isMoving ? '…' : '→'}
                </button>
            )}
            <button
                className="task-delete-btn"
                onClick={() => onDelete(task.id)}
                aria-label="Delete task"
                title="Delete task"
            >×</button>
        </div>
    );
}

function DayModal({ day, sprintId, tasks, onClose, onTaskAdded, onTaskDeleted, onTaskUpdated, onTaskMoved, onBlockersFetched }) {
    // Quick-add state
    const [quickDesc, setQuickDesc]   = useState('');
    const [activeTags, setActiveTags] = useState([]);
    const [customTag, setCustomTag]   = useState('');
    const [timeSpent, setTimeSpent]   = useState('');
    const [showForm, setShowForm]         = useState(false);
    const [saving, setSaving]             = useState(false);
    const [error, setError]               = useState('');
    const [movingId, setMovingId]         = useState(null);
    // Blocker quick-add state
    const [blockerDesc, setBlockerDesc]   = useState('');
    const [savingBlocker, setSavingBlocker] = useState(false);
    const [loadingBlockers, setLoadingBlockers] = useState(true);

    const toggleTag = (id) => {
        setActiveTags(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    // Fetch blockers for this day on mount — completely replace any existing
    // blocker rows for this date to avoid duplicates on modal re-open.
    useEffect(() => {
        setLoadingBlockers(true);
        fetchBlockersByDate(day.iso, sprintId)
            .then(fetched => onBlockersFetched(day.iso, fetched))
            .catch(() => { /* blockers load silently */ })
            .finally(() => setLoadingBlockers(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day.iso, sprintId]);

    const handleQuickAdd = async (e) => {
        if ((e.type === 'keydown' && e.key !== 'Enter') || !quickDesc.trim()) return;
        setSaving(true);
        setError('');
        try {
            const newTask = await createTask({
                sprint_id:   sprintId,
                date:        day.iso,
                description: quickDesc.trim(),
                tags:        null,
                time_spent:  0,
                status:      'todo',
            });
            onTaskAdded(newTask);
            setQuickDesc('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDetailedSave = async () => {
        if (!quickDesc.trim() && !showForm) return;
        const allTags = [...activeTags, ...(customTag.trim() ? [customTag.trim()] : [])];
        setSaving(true);
        setError('');
        try {
            const newTask = await createTask({
                sprint_id:   sprintId,
                date:        day.iso,
                description: quickDesc.trim(),
                tags:        allTags.join(',') || null,
                time_spent:  parseFloat(timeSpent) || 0,
                status:      'todo',
            });
            onTaskAdded(newTask);
            setQuickDesc('');
            setActiveTags([]);
            setCustomTag('');
            setTimeSpent('');
            setShowForm(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (task) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        try {
            const updated = await updateTask(task.id, { ...task, status: newStatus });
            onTaskUpdated(updated);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (taskId) => {
        try {
            await deleteTask(taskId);
            onTaskDeleted(taskId);
        } catch (err) {
            setError(err.message);
        }
    };

    // Returns a YYYY-MM-DD string, advancing past any Saturday or Sunday
    // to the following Monday. Uses local year/month/day to avoid UTC
    // timezone off-by-one errors.
    const nearestWorkday = (date) => {
        const d = new Date(date); // work on a copy
        const dow = d.getDay();   // 0 = Sun, 6 = Sat
        if (dow === 6) d.setDate(d.getDate() + 2); // Sat → Mon
        if (dow === 0) d.setDate(d.getDate() + 1); // Sun → Mon
        // Build YYYY-MM-DD from local calendar fields — avoids UTC shift
        const y  = d.getFullYear();
        const m  = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dy}`;
    };

    const handleMoveTomorrow = async (taskId) => {
        setMovingId(taskId);
        setError('');
        try {
            // Resolve today in local calendar time (avoids UTC shift)
            const now = new Date();
            const y   = now.getFullYear();
            const m   = String(now.getMonth() + 1).padStart(2, '0');
            const d   = String(now.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${d}`;

            // Tomorrow: add one day to a local-midnight Date
            const tomorrowDate = new Date(now);
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);

            // Conditional rule:
            //   Task is from TODAY       → target is TOMORROW
            //   Task is from any other day → target is TODAY
            const rawTarget = day.iso === todayStr ? tomorrowDate : now;

            // Skip weekends — roll forward to nearest Monday if needed
            const targetDate = nearestWorkday(rawTarget);

            const task = tasks.find(t => t.id === taskId);
            if (!task) throw new Error('Task not found in local state.');

            await updateTask(taskId, { ...task, date: targetDate });
            // Update the task's date in local state — keeps target day in sync
            onTaskMoved(taskId, targetDate);
        } catch (err) {
            setError(err.message);
        } finally {
            setMovingId(null);
        }
    };



    const handleQuickAddBlocker = async (e) => {
        if ((e.type === 'keydown' && e.key !== 'Enter') || !blockerDesc.trim()) return;
        setSavingBlocker(true);
        setError('');
        try {
            const newBlocker = await createTask({
                sprint_id:   sprintId,
                date:        day.iso,
                description: blockerDesc.trim(),
                tags:        null,
                time_spent:  0,
                status:      'todo',
                type:        'blocker',
            });
            onTaskAdded(newBlocker);
            setBlockerDesc('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingBlocker(false);
        }
    };

    const dayTasks     = tasks.filter(t => t.date === day.iso);
    // Separate regular tasks (type = 'task' or undefined for legacy rows) from blockers
    const regularTasks = dayTasks.filter(t => !t.type || t.type === 'task');
    const todoTasks    = regularTasks.filter(t => t.status !== 'done');
    const doneTasks    = regularTasks.filter(t => t.status === 'done');
    const blockerTasks = dayTasks.filter(t => t.type === 'blocker');
    const totalHours   = doneTasks.reduce((s, t) => s + (t.time_spent || 0), 0);

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-wide modal-three-col" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className="modal-header">
                    <div className="modal-title-group">
                        <h2 id="modal-title">
                            {day.weekdayName} · {formatDate(day.iso)}
                        </h2>
                        <p>
                            {doneTasks.length}/{regularTasks.length} done · {totalHours.toFixed(1)}h logged
                            {blockerTasks.length > 0 && (
                                <span className="header-blocker-badge">
                                    ⚠ {blockerTasks.length} blocker{blockerTasks.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
                </div>

                {error && <div className="error-banner">⚠ {error}</div>}

                <div className="modal-columns">
                    {/* ── To Do Column ── */}
                    <div className="modal-column">
                        <div className="column-header column-todo">
                            <span className="column-icon">○</span>
                            <span>To Do</span>
                            <span className="column-count">{todoTasks.length}</span>
                        </div>

                        {/* Quick-add input */}
                        <div className="quick-add-wrap">
                            <input
                                id="quick-add-input"
                                className="form-input quick-add-input"
                                placeholder="+ Add a task… (press Enter)"
                                value={quickDesc}
                                onChange={e => setQuickDesc(e.target.value)}
                                onKeyDown={handleQuickAdd}
                                disabled={saving}
                            />
                            <button
                                className="quick-add-expand"
                                onClick={() => setShowForm(f => !f)}
                                title="More options"
                                type="button"
                            >
                                ⋯
                            </button>
                        </div>

                        {/* Expanded form */}
                        {showForm && (
                            <div className="expanded-form">
                                <div className="form-group">
                                    <label className="form-label">Tags</label>
                                    <div className="tags-grid">
                                        {TAG_PRESETS.map(tag => (
                                            <button
                                                key={tag.id}
                                                className={`tag-toggle ${tag.cls} ${activeTags.includes(tag.id) ? 'active' : ''}`}
                                                onClick={() => toggleTag(tag.id)}
                                                type="button"
                                            >
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label className="form-label" htmlFor="custom-tag">Custom Tag</label>
                                        <input id="custom-tag" className="form-input" placeholder="#other-tag"
                                            value={customTag} onChange={e => setCustomTag(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label" htmlFor="time-spent">Hours</label>
                                        <input id="time-spent" type="number" className="form-input" placeholder="1.5"
                                            min="0" step="0.25" value={timeSpent} onChange={e => setTimeSpent(e.target.value)} />
                                    </div>
                                </div>
                                <button className="btn btn-primary" style={{ width: '100%' }}
                                    onClick={handleDetailedSave} disabled={saving || !quickDesc.trim()} type="button">
                                    {saving ? 'Adding…' : '+ Add Task'}
                                </button>
                            </div>
                        )}

                        <div className="task-list">
                            {todoTasks.length === 0 ? (
                                <div className="column-empty">Nothing planned yet</div>
                            ) : (
                                todoTasks.map(task => (
                                    <TaskRow key={task.id} task={task}
                                        onToggle={handleToggleStatus}
                                        onDelete={handleDelete}
                                        onMoveTomorrow={handleMoveTomorrow}
                                        movingId={movingId} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Done Column ── */}
                    <div className="modal-column">
                        <div className="column-header column-done">
                            <span className="column-icon">✓</span>
                            <span>Done</span>
                            <span className="column-count done">{doneTasks.length}</span>
                        </div>
                        <div className="task-list">
                            {doneTasks.length === 0 ? (
                                <div className="column-empty">Complete tasks to see them here</div>
                            ) : (
                                doneTasks.map(task => (
                                    <TaskRow key={task.id} task={task}
                                        onToggle={handleToggleStatus}
                                        onDelete={handleDelete} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Blockers Column ── */}
                    <div className="modal-column">
                        <div className="column-header column-blocker">
                            <span className="column-icon">⚠</span>
                            <span>Blockers</span>
                            <span className="column-count blocker">{blockerTasks.length}</span>
                        </div>

                        {/* Blocker quick-add */}
                        <div className="quick-add-wrap">
                            <input
                                id="blocker-add-input"
                                className="form-input quick-add-input quick-add-blocker"
                                placeholder="+ Add a blocker… (press Enter)"
                                value={blockerDesc}
                                onChange={e => setBlockerDesc(e.target.value)}
                                onKeyDown={handleQuickAddBlocker}
                                disabled={savingBlocker}
                            />
                        </div>

                        <div className="task-list">
                            {loadingBlockers ? (
                                <div className="column-empty">Loading blockers…</div>
                            ) : blockerTasks.length === 0 ? (
                                <div className="column-empty">No blockers — great!</div>
                            ) : (
                                blockerTasks.map(task => (
                                    <TaskRow key={task.id} task={task}
                                        onToggle={handleToggleStatus}
                                        onDelete={handleDelete} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Day Cell ─────────────────────────────────────────────────────────────────

function DayCell({ day, tasks, onClick }) {
    const dayTasks = tasks.filter(t => t.date === day.iso);
    const totalHours = dayTasks.reduce((s, t) => s + (t.time_spent || 0), 0);

    // Gather unique tag types for dot preview
    const tagTypes = [...new Set(
        dayTasks.flatMap(t =>
            t.tags ? t.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
        )
    )].slice(0, 5);

    const cls = [
        'day-cell',
        day.isToday ? 'today' : '',
        day.isWeekend ? 'weekend' : '',
        dayTasks.length > 0 ? 'has-tasks' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={cls} onClick={onClick} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onClick()}
            aria-label={`${day.weekdayName} ${formatDate(day.iso)}, ${dayTasks.length} tasks`}
        >
            <div className="day-weekday-name">{day.weekdayName}</div>
            <div className="day-number">{day.day}</div>

            <div className="day-tags-preview">
                {tagTypes.map((tag, i) => (
                    <span key={i} className={`tag-dot ${getTagDotClass(tag)}`} title={`#${tag}`} />
                ))}
            </div>

            <div className="day-task-count">
                {dayTasks.length > 0 ? (
                    <>
                        <span className="task-badge">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                        {totalHours > 0 && <span className="day-hours">{totalHours.toFixed(1)}h</span>}
                    </>
                ) : (
                    <span className="task-badge zero">— empty</span>
                )}
            </div>

            <div className="add-icon" aria-hidden="true">+</div>
        </div>
    );
}

// ─── Sprint Name Editor ─────────────────────────────────────────────────────

function SprintNameEditor({ sprint, onSaved }) {
    const [editing, setEditing]   = useState(false);
    const [value, setValue]       = useState(sprint.name || '');
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState('');
    const inputRef                = useRef(null);

    // Keep local value in sync if active sprint changes
    useEffect(() => { setValue(sprint.name || ''); }, [sprint]);

    const startEdit = () => {
        setEditing(true);
        setError('');
        // Focus after render
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const commit = async () => {
        const trimmed = value.trim();
        if (trimmed === (sprint.name || '')) { setEditing(false); return; }
        setSaving(true);
        setError('');
        try {
            const updated = await updateSprint(sprint.id, {
                start_date: sprint.start_date,
                end_date:   sprint.end_date,
                name:       trimmed || null,
            });
            onSaved(updated);
            setEditing(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter')  commit();
        if (e.key === 'Escape') { setValue(sprint.name || ''); setEditing(false); }
    };

    const displayName = sprint.name || `Sprint #${sprint.id}`;

    return (
        <div className="sprint-name-editor">
            {editing ? (
                <div className="sprint-name-edit-wrap">
                    <input
                        ref={inputRef}
                        className="sprint-name-input"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={commit}
                        placeholder="Sprint name…"
                        disabled={saving}
                        maxLength={80}
                        aria-label="Edit sprint name"
                    />
                    {saving && <span className="sprint-name-saving">Saving…</span>}
                </div>
            ) : (
                <div className="sprint-name-display">
                    <span className="sprint-name-text">{displayName}</span>
                    <button
                        className="sprint-name-edit-btn"
                        onClick={startEdit}
                        title="Rename sprint"
                        aria-label="Rename sprint"
                    >
                        ✏
                    </button>
                </div>
            )}
            {error && <div className="sprint-name-error">⚠ {error}</div>}
        </div>
    );
}

// ─── Create Sprint Modal ──────────────────────────────────────────────────────

function NewSprintModal({ onClose, onCreated }) {
    const [name,      setName]      = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate,   setEndDate]   = useState('');
    const [saving,    setSaving]    = useState(false);
    const [error,     setError]     = useState('');

    const handleCreate = async () => {
        if (!name.trim())   { setError('Sprint name is required.');           return; }
        if (!startDate || !endDate) { setError('Both dates are required.');   return; }
        if (new Date(endDate) <= new Date(startDate)) { setError('End date must be after start date.'); return; }
        setSaving(true);
        setError('');
        try {
            const s = await createSprint({ name: name.trim(), start_date: startDate, end_date: endDate });
            onCreated(s);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title-group">
                        <h2>New Sprint</h2>
                        <p>Give your sprint a name and define its dates</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                {error && <div className="error-banner">⚠ {error}</div>}
                <div className="form-group">
                    <label className="form-label" htmlFor="sprint-name">Sprint Name</label>
                    <input id="sprint-name" type="text" className="form-input"
                        placeholder="e.g. Authentication Sprint"
                        value={name} onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        autoFocus />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="sprint-start">Start Date</label>
                    <input id="sprint-start" type="date" className="form-input"
                        value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="sprint-end">End Date</label>
                    <input id="sprint-end" type="date" className="form-input"
                        value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                        {saving ? 'Creating…' : 'Create Sprint'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
    const [sprints,        setSprints]        = useState([]);
    const [activeSprint,   setActiveSprint]   = useState(null);
    const [tasks,          setTasks]          = useState([]);
    const [sprintDays,     setSprintDays]     = useState([]);
    const [selectedDay,    setSelectedDay]    = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState('');
    const [toast,          setToast]          = useState(null);
    const [showNewSprint,  setShowNewSprint]  = useState(false);
    const [showRetroReport, setShowRetroReport] = useState(false);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
    }, []);

    // Load sprints on mount
    useEffect(() => {
        fetchSprints()
            .then(data => {
                setSprints(data);
                if (data.length > 0) setActiveSprint(data[0]);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Load tasks when active sprint changes
    useEffect(() => {
        if (!activeSprint) return;
        const days = buildSprintDays(activeSprint.start_date, activeSprint.end_date);
        setSprintDays(days);
        fetchTasksBySprintId(activeSprint.id)
            .then(setTasks)
            .catch(err => setError(err.message));
    }, [activeSprint]);

    const handleSprintChange = (e) => {
        const s = sprints.find(sp => sp.id === parseInt(e.target.value));
        if (s) setActiveSprint(s);
    };

    const handleTaskAdded = useCallback((task) => {
        setTasks(prev => [...prev, task]);
        showToast('Task added!');
    }, [showToast]);

    const handleTaskDeleted = useCallback((taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        showToast('Task deleted.', 'success');
    }, [showToast]);

    const handleTaskUpdated = useCallback((updated) => {
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    }, []);

    const handleTaskMoved = useCallback((taskId, newDate) => {
        // Update the task's date in local state so the target day cell
        // shows it immediately without a page refresh.
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, date: newDate } : t
        ));
        showToast('Task moved! 📅', 'success');
    }, [showToast]);

    // Replace (not append) blocker rows for a given date so re-opening the
    // modal never produces duplicates.
    const handleBlockersFetched = useCallback((date, fetched) => {
        setTasks(prev => [
            ...prev.filter(t => !(t.type === 'blocker' && t.date === date)),
            ...fetched,
        ]);
    }, []);

    const handleSprintCreated = useCallback((sprint) => {
        setSprints(prev => [sprint, ...prev]);
        setActiveSprint(sprint);
        setShowNewSprint(false);
        showToast('Sprint created!');
    }, [showToast]);

    const handleGenerateStandup = async () => {
        try {
            const todayDate = new Date();
            const todayStr = toISODate(todayDate);

            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = toISODate(yesterdayDate);

            const data = await fetchStandupTasks(yesterdayStr, todayStr);

            // Yesterday: only tasks marked 'done'
            const doneTasks = data.yesterday.filter(t => t.status === 'done');
            // Today: only tasks marked 'todo' (planned)
            const todoTasks = data.today.filter(t => t.status !== 'done');

            let markdown = '### Standup\n\n';

            markdown += '**✅ Done (Yesterday):**\n';
            if (doneTasks.length === 0) {
                markdown += '- No completed tasks\n';
            } else {
                doneTasks.forEach(t => { markdown += `- ${t.description}\n`; });
            }

            markdown += '\n**📋 To Do (Today):**\n';
            if (todoTasks.length === 0) {
                markdown += '- No tasks planned yet\n';
            } else {
                todoTasks.forEach(t => { markdown += `- ${t.description}\n`; });
            }

            await navigator.clipboard.writeText(markdown);
            showToast('Standup copied to clipboard!', 'success');
        } catch (err) {
            showToast(`Failed to generate standup: ${err.message}`, 'error');
        }
    };

    // Stats
    const totalTasks  = tasks.length;
    const totalHours  = tasks.reduce((s, t) => s + (t.time_spent || 0), 0);
    const activeDays  = new Set(tasks.map(t => t.date)).size;
    const avgPerDay   = activeDays > 0 ? (totalTasks / activeDays).toFixed(1) : '0';

    if (loading) {
        return (
            <div className="app">
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading sprint data…</p>
                </div>
            </div>
        );
    }

    if (showRetroReport && activeSprint) {
        return (
            <RetroReportPage
                sprint={activeSprint}
                onClose={() => setShowRetroReport(false)}
            />
        );
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-inner">
                    <div className="header-logo">
                        <div className="logo-icon">🚀</div>
                        <h1>SprintTrack</h1>
                    </div>
                    <div className="header-meta">Sprint Dashboard</div>
                </div>
            </header>

            <main className="main-content">
                {error && (
                    <div className="error-banner" role="alert">
                        ⚠ Could not connect to backend: {error}
                    </div>
                )}

                {/* Controls */}
                <div className="controls">
                    <div className="sprint-label-wrap">
                        <span className="sprint-badge">Sprint</span>
                        <div>
                            <div className="sprint-title">
                                {activeSprint ? (activeSprint.name || `Sprint #${activeSprint.id}`) : 'No sprints yet'}
                            </div>
                            {activeSprint && (
                                <div className="sprint-dates">
                                    {formatDate(activeSprint.start_date)} → {formatDate(activeSprint.end_date)}
                                </div>
                            )}
                        </div>
                        {activeSprint && (
                            <button
                                id="retro-report-btn"
                                className="btn btn-ghost"
                                onClick={() => setShowRetroReport(true)}
                                title="Open sprint retrospective report"
                            >
                                📊 Retro Report
                            </button>
                        )}
                    </div>

                    <div className="controls-right">
                        {sprints.length > 1 && (
                            <select
                                className="sprint-select"
                                value={activeSprint?.id || ''}
                                onChange={handleSprintChange}
                                aria-label="Select sprint"
                            >
                                {sprints.map(s => (
                                    <option key={s.id} value={s.id}>
                                        Sprint #{s.id} ({s.start_date})
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            className="btn btn-ghost"
                            onClick={handleGenerateStandup}
                            title="Generate standup for yesterday and today"
                        >
                            📋 Generate Standup
                        </button>
                        <button
                            id="new-sprint-btn"
                            className="btn btn-primary"
                            onClick={() => setShowNewSprint(true)}
                        >
                            + New Sprint
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                {activeSprint && (
                    <div className="stats-row">
                        <div className="stat-card">
                            <div className="stat-label">Total Tasks</div>
                            <div className="stat-value">{totalTasks}</div>
                            <div className="stat-sub">across {sprintDays.length} days</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Hours Logged</div>
                            <div className="stat-value">{totalHours.toFixed(1)}</div>
                            <div className="stat-sub">total hours</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Active Days</div>
                            <div className="stat-value">{activeDays}</div>
                            <div className="stat-sub">days with tasks</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Avg Tasks/Day</div>
                            <div className="stat-value">{avgPerDay}</div>
                            <div className="stat-sub">on active days</div>
                        </div>
                    </div>
                )}

                {/* Calendar */}
                {activeSprint && sprintDays.length > 0 ? (
                    <div className="calendar-grid" role="grid" aria-label="Sprint calendar">
                        {sprintDays.map((day) => (
                            <DayCell
                                key={day.iso}
                                day={day}
                                tasks={tasks}
                                onClick={() => setSelectedDay(day)}
                            />
                        ))}
                    </div>
                ) : (
                    !loading && (
                        <div className="empty-state">
                            <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅</p>
                            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                No sprints yet
                            </p>
                            <p>Create a sprint above to get started.</p>
                        </div>
                    )
                )}
            </main>

            {/* Day Modal */}
            {selectedDay && (
                <DayModal
                    day={selectedDay}
                    sprintId={activeSprint.id}
                    tasks={tasks}
                    onClose={() => setSelectedDay(null)}
                    onTaskAdded={handleTaskAdded}
                    onTaskDeleted={handleTaskDeleted}
                    onTaskUpdated={handleTaskUpdated}
                    onTaskMoved={handleTaskMoved}
                    onBlockersFetched={handleBlockersFetched}
                />
            )}

            {/* New Sprint Modal */}
            {showNewSprint && (
                <NewSprintModal
                    onClose={() => setShowNewSprint(false)}
                    onCreated={handleSprintCreated}
                />
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
