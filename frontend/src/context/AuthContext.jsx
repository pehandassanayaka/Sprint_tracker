import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setToken, clearToken, getToken, apiMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user,    setUser]    = useState(null);  // { id, username }
    const [loading, setLoading] = useState(true);  // resolving stored token

    // ── Restore session from localStorage on first load ──────────────────────
    useEffect(() => {
        const token = getToken();
        if (!token) { setLoading(false); return; }

        // Validate the stored token against the server
        apiMe()
            .then(me => setUser({ id: me.id, username: me.username }))
            .catch(() => clearToken())        // token was invalid/expired
            .finally(() => setLoading(false));
    }, []);

    // ── Listen for 401 events dispatched by apiFetch ─────────────────────────
    useEffect(() => {
        const handleForceLogout = () => {
            clearToken();
            setUser(null);
        };
        window.addEventListener('auth:logout', handleForceLogout);
        return () => window.removeEventListener('auth:logout', handleForceLogout);
    }, []);

    const login = useCallback((token, userData) => {
        setToken(token);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
};
