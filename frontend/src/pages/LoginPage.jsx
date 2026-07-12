import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiLogin } from '../services/api';
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

export default function LoginPage() {
    const [username,     setUsername]     = useState('');
    const [password,     setPassword]     = useState('');
    const [error,        setError]        = useState('');
    const [loading,      setLoading]      = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login }  = useAuth();
    const navigate   = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password) {
            setError('Username and password are required.');
            return;
        }
        setLoading(true);
        try {
            const data = await apiLogin(username.trim(), password);
            login(data.token, data.user);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                {/* ── Left: Form panel ── */}
                <div className="auth-form-panel">
                    <div className="auth-top-bar">
                        <Link to="/" className="auth-brand">
                            <button className="auth-back-btn" type="button" aria-label="Back">
                                <ArrowLeftIcon />
                            </button>
                            SprintTrack
                        </Link>
                        <button className="auth-globe-btn" type="button" aria-label="Language">
                            <GlobeIcon />
                        </button>
                    </div>

                    <div className="auth-form-body">
                        <h1 className="auth-title">Log in</h1>

                        <form onSubmit={handleSubmit} noValidate>
                            {error && <div className="auth-error">{error}</div>}

                            {/* Username */}
                            <div className="auth-field">
                                <label className="auth-label">Username</label>
                                <div className="auth-input-wrap">
                                    <span className="auth-input-icon"><UserIcon /></span>
                                    <input
                                        id="login-username"
                                        type="text"
                                        autoComplete="username"
                                        autoFocus
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Enter your username"
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
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
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
                            </div>

                            <div className="auth-forgot">
                                <a href="#">Forgot password?</a>
                            </div>

                            <button type="submit" disabled={loading} className="auth-submit-btn">
                                {loading ? 'Logging in…' : 'Log in'}
                                {!loading && (
                                    <span className="auth-submit-arrow"><ArrowIcon /></span>
                                )}
                            </button>
                        </form>

                        <div className="auth-divider">
                            <div className="auth-divider-line" />
                            <span className="auth-divider-text">Don't have an account</span>
                            <div className="auth-divider-line" />
                        </div>

                        <Link to="/register" className="auth-secondary-btn">Sign Up</Link>
                    </div>
                </div>

                {/* ── Right: Image panel ── */}
                <div className="auth-image-panel">
                    <div className="auth-image-inner">
                        <img src="/auth_illustration.png" alt="Working on laptop illustration" />
                        <div className="auth-image-overlay">
                            <div className="auth-image-headline">
                                Plan Smarter.
                                <span>Ship Faster.</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
