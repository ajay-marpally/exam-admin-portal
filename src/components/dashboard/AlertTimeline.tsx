import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Video, User, ArrowRight } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { SeverityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface AlertTimelineItem {
    id: string;
    time: string;
    type: string;
    source: 'STUDENT_AI' | 'CCTV_AI' | 'ADMIN';
    severity: number;
    studentName?: string;
    centreName?: string;
    description?: string;
}

interface AlertTimelineProps {
    alerts: AlertTimelineItem[];
    isLoading?: boolean;
    maxItems?: number;
    onViewAll?: () => void;
}

export function AlertTimeline({
    alerts,
    isLoading = false,
    maxItems = 5,
    onViewAll,
}: AlertTimelineProps) {
    const displayAlerts = alerts.slice(0, maxItems);

    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'CCTV_AI':
                return <Video className="w-4 h-4" />;
            case 'ADMIN':
                return <User className="w-4 h-4" />;
            default:
                return <AlertTriangle className="w-4 h-4" />;
        }
    };

    const getSourceColor = (source: string) => {
        switch (source) {
            case 'CCTV_AI':
                return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
            case 'ADMIN':
                return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            default:
                return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
        }
    };

    if (isLoading) {
        return (
            <Card padding="md">
                <CardHeader title="Recent Alerts" />
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-4 animate-pulse">
                            <div className="w-8 h-8 bg-surface-200 dark:bg-surface-700 rounded-full" />
                            <div className="flex-1">
                                <div className="h-4 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
                                <div className="h-3 w-48 bg-surface-200 dark:bg-surface-700 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <Card padding="md">
            <CardHeader
                title="Recent Alerts"
                subtitle={`${alerts.length} total alerts`}
                action={
                    onViewAll && (
                        <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={onViewAll}>
                            View All
                        </Button>
                    )
                }
            />

            {displayAlerts.length === 0 ? (
                <div className="text-center py-8 text-surface-500 dark:text-surface-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No recent alerts</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {displayAlerts.map((alert, index) => (
                        <div
                            key={alert.id}
                            className="group flex items-start gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors cursor-pointer"
                        >
                            {/* Source Icon */}
                            <div className={`p-1.5 rounded-full ${getSourceColor(alert.source)}`}>
                                {getSourceIcon(alert.source)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-surface-900 dark:text-white text-sm truncate">
                                        {alert.type.replace(/_/g, ' ')}
                                    </span>
                                    <SeverityBadge severity={alert.severity} />
                                </div>
                                <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                                    {alert.studentName && <span>{alert.studentName} • </span>}
                                    {alert.centreName && <span>{alert.centreName} • </span>}
                                    {alert.description || 'No description'}
                                </p>
                            </div>

                            {/* Time */}
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                                    {format(new Date(alert.time), 'HH:mm')}
                                </p>
                                <p className="text-xs text-surface-400 dark:text-surface-500">
                                    {formatDistanceToNow(new Date(alert.time), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
