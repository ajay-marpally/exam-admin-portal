import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
    LayoutDashboard,
    Monitor,
    Video,
    AlertTriangle,
    FileSearch,
    Building2,
    MapPin,
    Landmark,
    FileText,
    ScrollText,
    ChevronLeft,
    ChevronRight,
    Shield,
    UserCheck,
    Users,
    BookOpen,
    Ticket,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    roles?: string[];
}

const navItems: NavItem[] = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
        path: '/monitoring',
        label: 'Live Monitoring',
        icon: <Monitor className="w-5 h-5" />,
    },
    {
        path: '/cctv',
        label: 'CCTV View',
        icon: <Video className="w-5 h-5" />,
    },
    {
        path: '/alerts',
        label: 'Alert Queue',
        icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
        path: '/evidence',
        label: 'Evidence Review',
        icon: <FileSearch className="w-5 h-5" />,
    },
    {
        path: '/students',
        label: 'Students',
        icon: <UserCheck className="w-5 h-5" />,
    },
    {
        path: '/users',
        label: 'Admin Users',
        icon: <Users className="w-5 h-5" />,
        roles: ['SUPER_ADMIN'],
    },
    {
        path: '/exams',
        label: 'Exams',
        icon: <BookOpen className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'DISTRICT_IN_CHARGE'],
    },
    {
        path: '/questions',
        label: 'Questions',
        icon: <FileText className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'DISTRICT_IN_CHARGE'],
    },
    {
        path: '/hall-tickets',
        label: 'Hall Tickets',
        icon: <Ticket className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'DISTRICT_IN_CHARGE'],
    },
    {
        path: '/districts',
        label: 'Districts',
        icon: <Landmark className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'DISTRICT_IN_CHARGE'],
    },
    {
        path: '/mandals',
        label: 'Mandals',
        icon: <MapPin className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'DISTRICT_IN_CHARGE', 'MANDAL_IN_CHARGE'],
    },
    {
        path: '/centres',
        label: 'Centres',
        icon: <Building2 className="w-5 h-5" />,
    },
    {
        path: '/reports',
        label: 'Reports',
        icon: <FileText className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'DISTRICT_IN_CHARGE'],
    },
    {
        path: '/exports',
        label: 'Export Data',
        icon: <FileText className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'DISTRICT_IN_CHARGE'],
    },
    {
        path: '/audit-logs',
        label: 'Audit Logs',
        icon: <ScrollText className="w-5 h-5" />,
    },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const { user } = useAuth();
    const location = useLocation();

    const filteredNavItems = navItems.filter((item) => {
        if (!item.roles) return true;
        return user?.role && item.roles.includes(user.role);
    });

    return (
        <aside
            className={clsx(
                'fixed left-0 top-0 h-full bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 z-40 transition-all duration-300',
                isCollapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-surface-200 dark:border-surface-700">
                <div className={clsx('flex items-center gap-3', isCollapsed && 'justify-center w-full')}>
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-sm font-bold text-surface-900 dark:text-white">Exam Admin</h1>
                            <p className="text-xs text-surface-500 dark:text-surface-400">Control Center</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="p-2 space-y-1 mt-2 overflow-y-auto h-[calc(100vh-8rem)]">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                                isCollapsed && 'justify-center',
                                isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                            )
                        }
                        title={isCollapsed ? item.label : undefined}
                    >
                        {item.icon}
                        {!isCollapsed && <span className="text-sm">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Toggle Button */}
            <div className="absolute bottom-4 left-0 right-0 px-2">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <>
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm">Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
}
