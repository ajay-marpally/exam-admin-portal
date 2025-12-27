import React, { useState } from 'react';
import { clsx } from 'clsx';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    variant?: 'default' | 'pills' | 'underline';
    className?: string;
}

export function Tabs({
    tabs,
    activeTab,
    onChange,
    variant = 'default',
    className,
}: TabsProps) {
    const baseStyles = 'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200';

    const variants = {
        default: {
            container: 'flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg',
            tab: 'rounded-md',
            active: 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm',
            inactive: 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-50 dark:hover:bg-surface-700/50',
        },
        pills: {
            container: 'flex gap-2',
            tab: 'rounded-full',
            active: 'bg-primary-600 text-white',
            inactive: 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800',
        },
        underline: {
            container: 'flex border-b border-surface-200 dark:border-surface-700',
            tab: 'border-b-2 -mb-px',
            active: 'border-primary-600 text-primary-600 dark:text-primary-400',
            inactive: 'border-transparent text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:border-surface-300 dark:hover:border-surface-600',
        },
    };

    const v = variants[variant];

    return (
        <div className={clsx(v.container, className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={clsx(
                        baseStyles,
                        v.tab,
                        activeTab === tab.id ? v.active : v.inactive
                    )}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                        <span className={clsx(
                            'min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center text-xs font-semibold rounded-full',
                            activeTab === tab.id
                                ? 'bg-white/20 text-current'
                                : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300'
                        )}>
                            {tab.badge > 99 ? '99+' : tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

interface TabPanelProps {
    children: React.ReactNode;
    isActive: boolean;
    className?: string;
}

export function TabPanel({ children, isActive, className }: TabPanelProps) {
    if (!isActive) return null;
    return <div className={clsx('animate-fade-in', className)}>{children}</div>;
}
