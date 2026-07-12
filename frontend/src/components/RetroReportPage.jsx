import { useState, useEffect } from 'react';
import { fetchTasksBySprintId } from '../services/api';

/**
 * RetroReportPage
 *
 * Uses the exact same CSS design system classes (from index.css)
 * as App.jsx so it perfectly matches the app's aesthetic.
 */
export default function RetroReportPage({ sprint, onClose }) {
    const [completedTasks, setCompletedTasks] = useState([]);
    const [blockers,       setBlockers]       = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState('');

    useEffect(() => {
        if (!sprint?.id) return;

        setLoading(true);
        setError('');

        Promise.all([
            fetchTasksBySprintId(sprint.id),
            fetch(`/api/tasks/blockers?sprint_id=${sprint.id}`).then(r => r.json()),
        ])
            .then(([tasks, blockerRows]) => {
                setCompletedTasks(tasks.filter(t => t.status === 'done'));
                setBlockers(Array.isArray(blockerRows) ? blockerRows : []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [sprint?.id]);

    const sprintLabel = sprint?.name || `Sprint #${sprint?.id}`;
    const dateRange   = sprint
        ? `${formatDate(sprint.start_date)} → ${formatDate(sprint.end_date)}`
        : '';

    return (
        <div className="app">
            
            {/* Header matches App.jsx precisely */}
            <header className="header">
                <div className="header-inner">
                    <div className="header-logo">
                        <div className="logo-icon">📊</div>
                        <h1>Retro Report</h1>
                    </div>
                    <div className="header-meta">
                        {sprintLabel} {dateRange && `(${dateRange})`}
                    </div>
                    <div className="controls-right">
                        <button
                            className="btn btn-ghost"
                            onClick={onClose}
                        >
                            ✕ Close View
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content area matches App.jsx precisely */}
            <main className="main-content">
                
                {error && (
                    <div className="error-banner" role="alert">
                        ⚠ {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p>Loading sprint report data…</p>
                    </div>
                ) : (
                    <>
                        {/* Stats Row */}
                        <div className="stats-row">
                            <div className="stat-card">
                                <div className="stat-label">Completed Work</div>
                                <div className="stat-value">{completedTasks.length}</div>
                                <div className="stat-sub">tasks finished</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Blockers Faced</div>
                                <div className="stat-value">{blockers.length}</div>
                                <div className="stat-sub">recorded</div>
                            </div>
                        </div>

                        {/* Split layout for the two lists */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                            
                            {/* Completed Work Column */}
                            <div>
                                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    ✅ Completed Work
                                </h2>
                                {completedTasks.length === 0 ? (
                                    <div className="empty-state" style={{ minHeight: '150px' }}>
                                        <p style={{ color: 'var(--text-muted)' }}>No completed tasks.</p>
                                    </div>
                                ) : (
                                    <div className="task-list" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                                        {completedTasks.map(task => (
                                            <TaskItem key={task.id} task={task} variant="done" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Blockers Column */}
                            <div>
                                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    ⚠ Blockers Faced
                                </h2>
                                {blockers.length === 0 ? (
                                    <div className="empty-state" style={{ minHeight: '150px' }}>
                                        <p style={{ color: 'var(--text-muted)' }}>No blockers recorded. 🎉</p>
                                    </div>
                                ) : (
                                    <div className="task-list" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                                        {blockers.map(task => (
                                            <TaskItem key={task.id} task={task} variant="blocker" />
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

/* ── Task row sub-component using native index.css classes ── */
function TaskItem({ task, variant }) {
    const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const isBlocker = variant === 'blocker';
    const isDoneBlocker = isBlocker && task.status === 'done';

    return (
        <div className={`task-item ${isBlocker ? 'task-item-blocker' : ''}`} style={isBlocker ? { borderLeft: '3px solid #f59e0b' } : {}}>
            <div className="task-item-body">
                <div className="task-item-desc" style={isDoneBlocker ? { textDecoration: 'line-through', opacity: 0.7 } : {}}>
                    {task.description}
                </div>
                <div className="task-item-meta">
                    {isDoneBlocker && (
                        <span className="task-badge" style={{ background: '#22c55e', color: 'white', border: 'none' }}>
                            Resolved
                        </span>
                    )}
                    {task.time_spent > 0 && (
                        <span className="task-badge" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {task.time_spent}h
                        </span>
                    )}
                    {task.date && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {task.date}
                        </span>
                    )}
                    {tags.length > 0 && (
                        <div className="day-tags-preview">
                            {tags.map((tag, i) => (
                                <span key={i} className="task-badge">#{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* Local date formatter */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
