import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Search,
    Filter,
    RefreshCw,
    Eye,
    CheckCircle,
    ArrowUpRight,
    XCircle,
    AlertTriangle,
    Video,
    User,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge, SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import { logAuditEvent, AuditActions } from '../services/auditService';

interface AlertItem {
    id: string;
    time: string;
    attempt_id: string;
    event_type: string;
    severity: number;
    source: 'STUDENT_AI' | 'CCTV_AI' | 'ADMIN';
    description?: string;
    status: string;
    student_name?: string;
    hall_ticket?: string;
    centre_name?: string;
}

export function AlertQueue() {
    const navigate = useNavigate();
    const { user, permissions } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');

    // Fetch alerts
    const fetchAlerts = useCallback(async () => {
        try {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('malpractice_events')
                .select(`
          id,
          occurred_at,
          attempt_id,
          event_type,
          severity,
          source,
          description,
          exam_attempts!inner(
            students!inner(hall_ticket),
            exams!inner(name)
          )
        `)
                .order('occurred_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            const transformedAlerts: AlertItem[] = (data || []).map((event: any) => ({
                id: event.id,
                time: event.occurred_at,
                attempt_id: event.attempt_id,
                event_type: event.event_type,
                severity: event.severity || 5,
                source: event.source,
                description: event.description,
                status: 'OPEN', // Default status - would come from a separate status table in real app
                hall_ticket: event.exam_attempts?.students?.hall_ticket,
                student_name: event.exam_attempts?.students?.hall_ticket, // Using hall_ticket as name fallback
                centre_name: event.exam_attempts?.exams?.name,
            }));

            setAlerts(transformedAlerts);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Handle new alerts via realtime
    const handleNewAlert = useCallback((newEvent: Record<string, unknown>) => {
        const alert: AlertItem = {
            id: newEvent.id as string,
            time: (newEvent.occurred_at as string) || new Date().toISOString(),
            attempt_id: newEvent.attempt_id as string,
            event_type: newEvent.event_type as string,
            severity: (newEvent.severity as number) || 5,
            source: (newEvent.source as 'STUDENT_AI' | 'CCTV_AI' | 'ADMIN'),
            description: newEvent.description as string,
            status: 'OPEN',
        };
        setAlerts(prev => [alert, ...prev]);
    }, []);

    useRealtime({
        table: 'malpractice_events',
        event: 'INSERT',
        onInsert: handleNewAlert,
    });

    // Filter alerts
    const getFilteredAlerts = () => {
        let filtered = alerts;

        // Tab filter
        if (activeTab === 'high') {
            filtered = filtered.filter(a => a.severity >= 7);
        } else if (activeTab === 'student') {
            filtered = filtered.filter(a => a.source === 'STUDENT_AI');
        } else if (activeTab === 'cctv') {
            filtered = filtered.filter(a => a.source === 'CCTV_AI');
        }

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.event_type.toLowerCase().includes(query) ||
                a.hall_ticket?.toLowerCase().includes(query) ||
                a.description?.toLowerCase().includes(query)
            );
        }

        // Severity filter
        if (severityFilter !== 'ALL') {
            const [min, max] = severityFilter.split('-').map(Number);
            filtered = filtered.filter(a => a.severity >= min && a.severity <= max);
        }

        // Source filter
        if (sourceFilter !== 'ALL') {
            filtered = filtered.filter(a => a.source === sourceFilter);
        }

        return filtered;
    };

    // Handle alert actions
    const handleAcknowledge = async (alert: AlertItem) => {
        if (!user) return;

        await logAuditEvent(user.id, {
            action: AuditActions.ALERT_ACKNOWLEDGED,
            entity: 'malpractice_events',
            entity_id: alert.id,
            evidence: { event_type: alert.event_type, severity: alert.severity },
        });

        setAlerts(prev => prev.map(a =>
            a.id === alert.id ? { ...a, status: 'REVIEWED' } : a
        ));
    };

    const handleEscalate = async (alert: AlertItem) => {
        if (!user) return;

        await logAuditEvent(user.id, {
            action: AuditActions.ALERT_ESCALATED,
            entity: 'malpractice_events',
            entity_id: alert.id,
            evidence: { event_type: alert.event_type, severity: alert.severity },
        });

        setAlerts(prev => prev.map(a =>
            a.id === alert.id ? { ...a, status: 'ESCALATED' } : a
        ));
    };

    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'CCTV_AI': return <Video className="w-4 h-4" />;
            case 'ADMIN': return <User className="w-4 h-4" />;
            default: return <AlertTriangle className="w-4 h-4" />;
        }
    };

    const columns = [
        {
            key: 'time',
            header: 'Time',
            sortable: true,
            render: (item: AlertItem) => (
                <div>
                    <p className="font-medium text-surface-900 dark:text-white text-sm">
                        {format(new Date(item.time), 'HH:mm:ss')}
                    </p>
                    <p className="text-xs text-surface-500">
                        {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                    </p>
                </div>
            ),
        },
        {
            key: 'source',
            header: 'Source',
            render: (item: AlertItem) => (
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${item.source === 'CCTV_AI'
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                            : item.source === 'ADMIN'
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                        {getSourceIcon(item.source)}
                    </div>
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                        {item.source.replace('_', ' ')}
                    </span>
                </div>
            ),
        },
        {
            key: 'student',
            header: 'Student',
            render: (item: AlertItem) => (
                <div>
                    <p className="font-mono text-sm text-surface-900 dark:text-white">
                        {item.hall_ticket || 'Unknown'}
                    </p>
                    <p className="text-xs text-surface-500">{item.centre_name}</p>
                </div>
            ),
        },
        {
            key: 'event_type',
            header: 'Event',
            render: (item: AlertItem) => (
                <span className="text-sm text-surface-700 dark:text-surface-300">
                    {item.event_type.replace(/_/g, ' ')}
                </span>
            ),
        },
        {
            key: 'severity',
            header: 'Severity',
            sortable: true,
            render: (item: AlertItem) => <SeverityBadge severity={item.severity} />,
        },
        {
            key: 'status',
            header: 'Status',
            render: (item: AlertItem) => <StatusBadge status={item.status} />,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: AlertItem) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/evidence?malpractice=${item.id}`);
                        }}
                        title="View Evidence"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    {permissions.canAcknowledge && item.status === 'OPEN' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAcknowledge(item);
                            }}
                            title="Acknowledge"
                            className="text-green-600 hover:text-green-700"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </Button>
                    )}
                    {permissions.canEscalate && item.status !== 'ESCALATED' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEscalate(item);
                            }}
                            title="Escalate"
                            className="text-purple-600 hover:text-purple-700"
                        >
                            <ArrowUpRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const filteredAlerts = getFilteredAlerts();
    const tabs = [
        { id: 'all', label: 'All Alerts', badge: alerts.length },
        { id: 'high', label: 'High Severity', badge: alerts.filter(a => a.severity >= 7).length },
        { id: 'student', label: 'Student AI', badge: alerts.filter(a => a.source === 'STUDENT_AI').length },
        { id: 'cctv', label: 'CCTV AI', badge: alerts.filter(a => a.source === 'CCTV_AI').length },
    ];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* Filters */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search alerts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <Select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        options={[
                            { value: 'ALL', label: 'All Severity' },
                            { value: '7-10', label: 'High (7-10)' },
                            { value: '4-6', label: 'Medium (4-6)' },
                            { value: '1-3', label: 'Low (1-3)' },
                        ]}
                    />
                    <Select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        options={[
                            { value: 'ALL', label: 'All Sources' },
                            { value: 'STUDENT_AI', label: 'Student AI' },
                            { value: 'CCTV_AI', label: 'CCTV AI' },
                            { value: 'ADMIN', label: 'Admin' },
                        ]}
                    />
                    <Button
                        variant="outline"
                        onClick={fetchAlerts}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                    >
                        Refresh
                    </Button>
                </div>
            </Card>

            {/* Alert Table */}
            <Table
                columns={columns}
                data={filteredAlerts}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No alerts found"
                onRowClick={(item) => navigate(`/evidence?malpractice=${item.id}`)}
            />
        </div>
    );
}
