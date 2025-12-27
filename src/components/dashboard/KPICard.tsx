import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive?: boolean;
        label?: string;
    };
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
    isLoading?: boolean;
}

export function KPICard({
    title,
    value,
    icon: Icon,
    trend,
    color = 'primary',
    isLoading = false,
}: KPICardProps) {
    const colors = {
        primary: {
            bg: 'bg-primary-50 dark:bg-primary-900/20',
            icon: 'text-primary-600 dark:text-primary-400',
            border: 'border-primary-100 dark:border-primary-800/50',
        },
        success: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            icon: 'text-green-600 dark:text-green-400',
            border: 'border-green-100 dark:border-green-800/50',
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            icon: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-100 dark:border-amber-800/50',
        },
        danger: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            icon: 'text-red-600 dark:text-red-400',
            border: 'border-red-100 dark:border-red-800/50',
        },
        purple: {
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            icon: 'text-purple-600 dark:text-purple-400',
            border: 'border-purple-100 dark:border-purple-800/50',
        },
    };

    const c = colors[color];

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                    <div className="h-4 w-24 bg-surface-200 dark:bg-surface-700 rounded" />
                    <div className="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded-lg" />
                </div>
                <div className="h-8 w-16 bg-surface-200 dark:bg-surface-700 rounded" />
            </div>
        );
    }

    return (
        <div className={clsx(
            'bg-white dark:bg-surface-800 rounded-xl border p-5 transition-all duration-200 hover:shadow-md',
            c.border
        )}>
            <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
                    {title}
                </p>
                <div className={clsx('p-2.5 rounded-lg', c.bg)}>
                    <Icon className={clsx('w-5 h-5', c.icon)} />
                </div>
            </div>

            <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-surface-900 dark:text-white">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>

                {trend && (
                    <div className={clsx(
                        'flex items-center gap-1 text-sm font-medium',
                        trend.isPositive === undefined
                            ? 'text-surface-500'
                            : trend.isPositive
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                    )}>
                        {trend.isPositive === undefined ? (
                            <Minus className="w-4 h-4" />
                        ) : trend.isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                        ) : (
                            <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{trend.value}%</span>
                        {trend.label && (
                            <span className="text-surface-400 font-normal">{trend.label}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
