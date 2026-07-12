import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRegister } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <path d="m6.72 6.72a3 3 0 1 0 4.24 4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
);

const LockIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
);

const UserIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
    </svg>
);

const ArrowIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
);

const ArrowLeftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
);

const GlobeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
);

export default function RegisterPage() {
    const [username,     setUsername]     = useState('');
    const [password,     setPassword]     = useState('');
    const [confirm,      setConfirm]      = useState('');
    const [error,        setError]        = useState('');
    const [loading,      setLoading]      = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm,  setShowConfirm]  = useState(false);

    const { login }  = useAuth();
    const navigate   = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim())             { setError('Username is required.'); return; }
        if (username.trim().length < 3)   { setError('Username must be at least 3 characters.'); return; }
        if (password.length < 6)          { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirm)         { setError('Passwords do not match.'); return; }

        setLoading(true);
        try {
            const data = await apiRegister(username.trim(), password);
            login(data.token, data.user);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const strengthScore = password.length === 0 ? 0
        : password.length < 6  ? 1
        : password.length < 10 ? 2
        : 3;
    const strengthLabel = ['', 'Weak', 'Fair', 'Strong'];
    const strengthActiveClass = ['', 'active-1', 'active-2', 'active-3'];
    const passwordsMatch = confirm.length > 0 && confirm === password;
    const passwordsMismatch = confirm.length > 0 && confirm !== password;

    return (
        <div className="auth-page">
            <div className="auth-card">

                {/* ── Left: Form panel ── */}
                <div className="auth-form-panel">
                    <div className="auth-top-bar">
                        <Link to="/login" className="auth-brand">
                            <button className="auth-back-btn" type="button" aria-label="Back to login">
                                <ArrowLeftIcon />
                            </button>
                            SprintTrack
                        </Link>
                        <button className="auth-globe-btn" type="button" aria-label="Language">
                            <GlobeIcon />
                        </button>
                    </div>

                    <div className="auth-form-body">
                        <h1 className="auth-title">Sign Up</h1>

                        <form onSubmit={handleSubmit} noValidate>
                            {error && <div className="auth-error">{error}</div>}

                            {/* Username */}
                            <div className="auth-field">
                                <label className="auth-label">Username</label>
                                <div className="auth-input-wrap">
                                    <span className="auth-input-icon"><UserIcon /></span>
                                    <input
                                        id="reg-username"
                                        type="text"
                                        autoComplete="username"
                                        autoFocus
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Choose a username"
                                        className="auth-input"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="auth-field">
                                <label className="auth-label">Password</label>
                                <div className="auth-input-wrap">
                                    <span className="auth-input-icon"><LockIcon /></span>
                                    <input
                                        id="reg-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        className="auth-input"
                                    />
                                    <button
                                        type="button"
                                        className="auth-input-right-btn"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                {password.length > 0 && (
                                    <>
                                        <div className="auth-strength-bar">
                                            {[1, 2, 3].map(i => (
                                                <div
                                                    key={i}
                                                    className={`auth-strength-seg ${i <= strengthScore ? strengthActiveClass[strengthScore] : ''}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="auth-field-hint">{strengthLabel[strengthScore]}</span>
                                    </>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="auth-field">
                                <label className="auth-label">Confirm Password</label>
                                <div className="auth-input-wrap">
                                    <span className="auth-input-icon"><LockIcon /></span>
                                    <input
                                        id="reg-confirm"
                                        type={showConfirm ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        placeholder="Repeat your password"
                                        className={`auth-input ${passwordsMismatch ? 'auth-input-error' : passwordsMatch ? 'auth-input-success' : ''}`}
                                    />
                                    <button
                                        type="button"
                                        className="auth-input-right-btn"
                                        onClick={() => setShowConfirm(v => !v)}
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                                {passwordsMismatch && <span className="auth-field-hint error">Passwords don't match</span>}
                                {passwordsMatch    && <span className="auth-field-hint success">✓ Passwords match</span>}
                            </div>

                            <button type="submit" disabled={loading} className="auth-submit-btn">
                                {loading ? 'Creating account…' : 'Sign Up'}
                                {!loading && (
                                    <span className="auth-submit-arrow"><ArrowIcon /></span>
                                )}
                            </button>
                        </form>

                        <div className="auth-divider">
                            <div className="auth-divider-line" />
                            <span className="auth-divider-text">Already have an account</span>
                            <div className="auth-divider-line" />
                        </div>

                        <Link to="/login" className="auth-secondary-btn">Log In</Link>
                    </div>
                </div>

                {/* ── Right: Image panel ── */}
                <div className="auth-image-panel">
                    <div className="auth-image-inner">
                        <img src="/auth_illustration.png" alt="Working on laptop illustration" />
                        <div className="auth-image-overlay">
                            <div className="auth-image-headline">
                                Track Sprints.
                                <span>Hit Every Goal.</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
