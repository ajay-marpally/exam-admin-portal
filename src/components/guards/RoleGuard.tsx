import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    requireAuth?: boolean;
}

export function RoleGuard({
    children,
    allowedRoles,
    requireAuth = true,
}: RoleGuardProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
                <div className="text-center">
                    <svg
                        className="animate-spin h-10 w-10 text-primary-500 mx-auto mb-4"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <p className="text-surface-600 dark:text-surface-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role-based access
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
                        Access Denied
                    </h1>
                    <p className="text-surface-600 dark:text-surface-400 mb-4">
                        You don't have permission to access this page.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium hover:underline"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

// Higher-order component for protecting routes
export function withRoleGuard<P extends object>(
    Component: React.ComponentType<P>,
    allowedRoles?: UserRole[]
) {
    return function GuardedComponent(props: P) {
        return (
            <RoleGuard allowedRoles={allowedRoles}>
                <Component {...props} />
            </RoleGuard>
        );
    };
}
