import React from 'react';
import { clsx } from 'clsx';
import { Database, Wifi, Camera, Server, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';

interface HealthStatus {
    database: 'healthy' | 'degraded' | 'down';
    realtime: 'connected' | 'connecting' | 'disconnected';
    cameras: { online: number; total: number };
    lastSync?: string;
}

interface SystemHealthProps {
    status: HealthStatus;
    isLoading?: boolean;
}

export function SystemHealth({ status, isLoading }: SystemHealthProps) {
    const getStatusIcon = (state: string) => {
        switch (state) {
            case 'healthy':
            case 'connected':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'degraded':
            case 'connecting':
                return <AlertCircle className="w-4 h-4 text-amber-500" />;
            default:
                return <XCircle className="w-4 h-4 text-red-500" />;
        }
    };

    const getStatusColor = (state: string) => {
        switch (state) {
            case 'healthy':
            case 'connected':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50';
            case 'degraded':
            case 'connecting':
                return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50';
            default:
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50';
        }
    };

    if (isLoading) {
        return (
            <Card padding="md">
                <CardHeader title="System Health" />
                <div className="space-y-3 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 bg-surface-200 dark:bg-surface-700 rounded-lg" />
                    ))}
                </div>
            </Card>
        );
    }

    const cameraPercentage = status.cameras.total > 0
        ? Math.round((status.cameras.online / status.cameras.total) * 100)
        : 0;

    const cameraStatus = cameraPercentage >= 95 ? 'healthy' : cameraPercentage >= 80 ? 'degraded' : 'down';

    const items = [
        {
            icon: Database,
            label: 'Database',
            status: status.database,
            detail: status.database === 'healthy' ? 'Connected' : status.database,
        },
        {
            icon: Wifi,
            label: 'Realtime',
            status: status.realtime === 'connected' ? 'healthy' : status.realtime === 'connecting' ? 'degraded' : 'down',
            detail: status.realtime,
        },
        {
            icon: Camera,
            label: 'CCTV Cameras',
            status: cameraStatus,
            detail: `${status.cameras.online}/${status.cameras.total} online`,
        },
        {
            icon: Server,
            label: 'Last Sync',
            status: 'healthy',
            detail: status.lastSync || 'Just now',
        },
    ];

    return (
        <Card padding="md">
            <CardHeader title="System Health" />
            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className={clsx(
                            'flex items-center justify-between p-3 rounded-lg border transition-colors',
                            getStatusColor(item.status)
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4 text-surface-600 dark:text-surface-400" />
                            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                                {item.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-surface-500 dark:text-surface-400 capitalize">
                                {item.detail}
                            </span>
                            {getStatusIcon(item.status)}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
