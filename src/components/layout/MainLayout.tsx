import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Overview of exam system' },
    '/monitoring': { title: 'Live Monitoring', subtitle: 'Real-time student activity' },
    '/cctv': { title: 'CCTV View', subtitle: 'Camera surveillance' },
    '/alerts': { title: 'Alert Queue', subtitle: 'Pending reviews and escalations' },
    '/evidence': { title: 'Evidence Review', subtitle: 'Forensic examination' },
    '/districts': { title: 'Districts', subtitle: 'District management' },
    '/mandals': { title: 'Mandals', subtitle: 'Mandal management' },
    '/centres': { title: 'Centres', subtitle: 'Exam centre management' },
    '/reports': { title: 'Reports', subtitle: 'Generate and export reports' },
    '/audit-logs': { title: 'Audit Logs', subtitle: 'System activity history' },
};

export function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const location = useLocation();

    const currentPage = pageTitles[location.pathname] || { title: 'Admin Portal' };

    // Monitor connection status
    useEffect(() => {
        const handleOnline = () => setIsConnected(true);
        const handleOffline = () => setIsConnected(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Load sidebar state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved) {
            setSidebarCollapsed(JSON.parse(saved));
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
            <Sidebar isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />

            <div
                className={clsx(
                    'transition-all duration-300',
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                )}
            >
                <Header
                    title={currentPage.title}
                    subtitle={currentPage.subtitle}
                    isConnected={isConnected}
                />

                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
