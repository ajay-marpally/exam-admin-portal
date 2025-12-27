import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
}

export function Card({
    children,
    className,
    padding = 'md',
    hover = false,
    onClick,
}: CardProps) {
    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div
            className={clsx(
                'bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm',
                paddings[padding],
                hover && 'hover:shadow-md hover:border-surface-300 dark:hover:border-surface-600 transition-all duration-200',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
    return (
        <div className={clsx('flex items-center justify-between mb-4', className)}>
            <div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return <div className={clsx('', className)}>{children}</div>;
}
