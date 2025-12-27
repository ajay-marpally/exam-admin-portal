import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
    Bell,
    Moon,
    Sun,
    User,
    LogOut,
    ChevronDown,
    Settings,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/Badge';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    isConnected?: boolean;
}

export function Header({ title, subtitle, isConnected = true }: HeaderProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Check for dark mode preference
    useEffect(() => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        setIsDark(isDarkMode);
    }, []);

    // Toggle dark mode
    const toggleDarkMode = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    };

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const roleLabels: Record<string, string> = {
        SUPER_ADMIN: 'Super Admin',
        DISTRICT_IN_CHARGE: 'District In-Charge',
        MANDAL_IN_CHARGE: 'Mandal In-Charge',
        CENTRE_IN_CHARGE: 'Centre In-Charge',
    };

    return (
        <header className="h-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-6">
            {/* Left: Title */}
            <div>
                {title && (
                    <h1 className="text-xl font-semibold text-surface-900 dark:text-white">
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className="text-sm text-surface-500 dark:text-surface-400">{subtitle}</p>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                            <Wifi className="w-4 h-4" />
                            <span className="text-xs font-medium">Live</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                            <WifiOff className="w-4 h-4" />
                            <span className="text-xs font-medium">Offline</span>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                    >
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50">
                            <div className="p-4 border-b border-surface-200 dark:border-surface-700">
                                <h3 className="font-semibold text-surface-900 dark:text-white">Notifications</h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                <div className="p-4 text-center text-surface-500 dark:text-surface-400 text-sm">
                                    No new notifications
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                    >
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-medium text-surface-900 dark:text-white">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-surface-500 dark:text-surface-400">
                                {user?.role ? roleLabels[user.role] : 'Unknown Role'}
                            </p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-surface-400" />
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 z-50">
                            <div className="p-3 border-b border-surface-200 dark:border-surface-700">
                                <p className="text-sm font-medium text-surface-900 dark:text-white">
                                    {user?.name}
                                </p>
                                <p className="text-xs text-surface-500 dark:text-surface-400">{user?.email}</p>
                                <Badge variant="info" size="sm" className="mt-2">
                                    {user?.role ? roleLabels[user.role] : 'Unknown'}
                                </Badge>
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        navigate('/settings');
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
