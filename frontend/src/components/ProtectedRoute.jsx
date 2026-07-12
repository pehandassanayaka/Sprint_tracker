import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps protected routes. Redirects to /login if the user is not authenticated.
 * Shows nothing while the token is being validated on first load.
 */
export default function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0f17] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#8b90b0] text-sm">Authenticating…</p>
                </div>
            </div>
        );
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
}
