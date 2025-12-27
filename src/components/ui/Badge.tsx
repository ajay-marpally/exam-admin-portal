import { clsx } from 'clsx';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
    size?: 'sm' | 'md';
    dot?: boolean;
    className?: string;
}

export function Badge({
    children,
    variant = 'default',
    size = 'md',
    dot = false,
    className,
}: BadgeProps) {
    const variants = {
        default: 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300',
        success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };

    const dotColors = {
        default: 'bg-surface-500',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        info: 'bg-blue-500',
        purple: 'bg-purple-500',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
    };

    return (
        <span
            className={clsx(
                'inline-flex items-center font-medium rounded-full',
                variants[variant],
                sizes[size],
                className
            )}
        >
            {dot && (
                <span
                    className={clsx(
                        'w-1.5 h-1.5 rounded-full mr-1.5',
                        dotColors[variant]
                    )}
                />
            )}
            {children}
        </span>
    );
}

interface SeverityBadgeProps {
    severity: number;
    showValue?: boolean;
    className?: string;
}

export function SeverityBadge({
    severity,
    showValue = true,
    className,
}: SeverityBadgeProps) {
    const getVariant = (): 'success' | 'warning' | 'danger' => {
        if (severity <= 3) return 'success';
        if (severity <= 6) return 'warning';
        return 'danger';
    };

    const getLabel = (): string => {
        if (severity <= 3) return 'Low';
        if (severity <= 6) return 'Medium';
        if (severity <= 8) return 'High';
        return 'Critical';
    };

    return (
        <Badge variant={getVariant()} dot className={className}>
            {showValue ? `${severity}/10` : getLabel()}
        </Badge>
    );
}

interface StatusBadgeProps {
    status: 'OPEN' | 'REVIEWED' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE' | string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const getVariant = (): 'warning' | 'info' | 'purple' | 'success' | 'default' => {
        switch (status) {
            case 'OPEN': return 'warning';
            case 'REVIEWED': return 'info';
            case 'ESCALATED': return 'purple';
            case 'RESOLVED': return 'success';
            case 'FALSE_POSITIVE': return 'default';
            default: return 'default';
        }
    };

    const formatStatus = (s: string): string => {
        return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <Badge variant={getVariant()} dot className={className}>
            {formatStatus(status)}
        </Badge>
    );
}

interface AttemptStatusBadgeProps {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'TERMINATED' | string;
    className?: string;
}

export function AttemptStatusBadge({ status, className }: AttemptStatusBadgeProps) {
    const getVariant = (): 'default' | 'info' | 'success' | 'danger' => {
        switch (status) {
            case 'NOT_STARTED': return 'default';
            case 'IN_PROGRESS': return 'info';
            case 'SUBMITTED': return 'success';
            case 'TERMINATED': return 'danger';
            default: return 'default';
        }
    };

    const formatStatus = (s: string): string => {
        return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <Badge variant={getVariant()} dot className={className}>
            {formatStatus(status)}
        </Badge>
    );
}
