import React, { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Search,
    Filter,
    RefreshCw,
    User,
    FileText,
    AlertTriangle,
    Lock,
    LogIn,
    LogOut,
    Download,
    Eye,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface AuditLogEntry {
    id: string;
    actor_id: string | null;
    actor_name?: string;
    action: string;
    entity: string;
    entity_id: string | null;
    evidence: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
}

export function AuditLogs() {
    const { isSuperAdmin, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
          id,
          actor_id,
          action,
          entity,
          entity_id,
          evidence,
          ip_address,
          created_at,
          users(name)
        `)
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;

            const logsWithActors: AuditLogEntry[] = (data || []).map((log: any) => ({
                id: log.id,
                actor_id: log.actor_id,
                actor_name: log.users?.name || 'System',
                action: log.action,
                entity: log.entity,
                entity_id: log.entity_id,
                evidence: log.evidence,
                ip_address: log.ip_address,
                created_at: log.created_at,
            }));

            setLogs(logsWithActors);
            setFilteredLogs(logsWithActors);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Filter logs
    useEffect(() => {
        let filtered = logs;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(log =>
                log.action.toLowerCase().includes(query) ||
                log.entity.toLowerCase().includes(query) ||
                log.actor_name?.toLowerCase().includes(query) ||
                log.ip_address?.includes(query)
            );
        }

        if (actionFilter !== 'ALL') {
            filtered = filtered.filter(log => log.action.includes(actionFilter));
        }

        if (entityFilter !== 'ALL') {
            filtered = filtered.filter(log => log.entity === entityFilter);
        }

        setFilteredLogs(filtered);
        setPage(1);
    }, [logs, searchQuery, actionFilter, entityFilter]);

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LogIn className="w-4 h-4" />;
        if (action.includes('LOGOUT')) return <LogOut className="w-4 h-4" />;
        if (action.includes('EVIDENCE')) return <FileText className="w-4 h-4" />;
        if (action.includes('ALERT')) return <AlertTriangle className="w-4 h-4" />;
        if (action.includes('LOCK')) return <Lock className="w-4 h-4" />;
        if (action.includes('EXPORT')) return <Download className="w-4 h-4" />;
        return <Eye className="w-4 h-4" />;
    };

    const getActionColor = (action: string): 'success' | 'danger' | 'warning' | 'info' | 'default' => {
        if (action.includes('LOGIN') || action.includes('CREATED')) return 'success';
        if (action.includes('TERMINATED') || action.includes('FAILED')) return 'danger';
        if (action.includes('ESCALATED')) return 'warning';
        if (action.includes('VIEWED') || action.includes('EXPORTED')) return 'info';
        return 'default';
    };

    const uniqueActions = [...new Set(logs.map(l => l.action.split('_')[0]))];
    const uniqueEntities = [...new Set(logs.map(l => l.entity))];

    const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

    const columns = [
        {
            key: 'created_at',
            header: 'Time',
            width: '180px',
            render: (item: AuditLogEntry) => (
                <div>
                    <p className="font-medium text-surface-900 dark:text-white text-sm">
                        {format(new Date(item.created_at), 'MMM d, HH:mm:ss')}
                    </p>
                    <p className="text-xs text-surface-500">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                </div>
            ),
        },
        {
            key: 'actor',
            header: 'Actor',
            render: (item: AuditLogEntry) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-surface-100 dark:bg-surface-700 rounded-full">
                        <User className="w-3 h-3 text-surface-500" />
                    </div>
                    <div>
                        <p className="text-sm text-surface-900 dark:text-white">
                            {item.actor_name || 'Unknown'}
                        </p>
                        {item.ip_address && (
                            <p className="text-xs text-surface-500 font-mono">{item.ip_address}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'action',
            header: 'Action',
            render: (item: AuditLogEntry) => (
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${getActionColor(item.action) === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                            getActionColor(item.action) === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                getActionColor(item.action) === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                    getActionColor(item.action) === 'info' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                        'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                        }`}>
                        {getActionIcon(item.action)}
                    </div>
                    <span className="text-sm text-surface-700 dark:text-surface-300">
                        {item.action.replace(/_/g, ' ')}
                    </span>
                </div>
            ),
        },
        {
            key: 'entity',
            header: 'Entity',
            render: (item: AuditLogEntry) => (
                <div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                        {item.entity}
                    </p>
                    {item.entity_id && (
                        <p className="text-xs text-surface-400 font-mono truncate max-w-[150px]">
                            {item.entity_id}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'evidence',
            header: 'Details',
            render: (item: AuditLogEntry) => (
                item.evidence ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(item);
                        }}
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                ) : (
                    <span className="text-surface-400">-</span>
                )
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <Select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        options={[
                            { value: 'ALL', label: 'All Actions' },
                            ...uniqueActions.map(a => ({ value: a, label: a })),
                        ]}
                    />
                    <Select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        options={[
                            { value: 'ALL', label: 'All Entities' },
                            ...uniqueEntities.map(e => ({ value: e, label: e })),
                        ]}
                    />
                    <Button
                        variant="outline"
                        onClick={fetchLogs}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                    >
                        Refresh
                    </Button>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {filteredLogs.length}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Total Entries</p>
                </Card>
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {filteredLogs.filter(l => l.action.includes('LOGIN')).length}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Login Events</p>
                </Card>
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {filteredLogs.filter(l => l.action.includes('ALERT')).length}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Alert Actions</p>
                </Card>
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {filteredLogs.filter(l => l.action.includes('EXPORT')).length}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Exports</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={paginatedLogs}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No audit logs found"
                onRowClick={(item) => item.evidence && setSelectedLog(item)}
                pagination={{
                    page,
                    pageSize,
                    total: filteredLogs.length,
                    onPageChange: setPage,
                }}
            />

            {/* Evidence Modal */}
            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="Audit Log Details"
                size="lg"
            >
                {selectedLog && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-surface-500 uppercase tracking-wide">Action</p>
                                <p className="font-medium text-surface-900 dark:text-white">
                                    {selectedLog.action.replace(/_/g, ' ')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500 uppercase tracking-wide">Entity</p>
                                <p className="font-medium text-surface-900 dark:text-white">
                                    {selectedLog.entity}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500 uppercase tracking-wide">Actor</p>
                                <p className="font-medium text-surface-900 dark:text-white">
                                    {selectedLog.actor_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-500 uppercase tracking-wide">Time</p>
                                <p className="font-medium text-surface-900 dark:text-white">
                                    {format(new Date(selectedLog.created_at), 'PPpp')}
                                </p>
                            </div>
                        </div>

                        {selectedLog.evidence && (
                            <div>
                                <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">
                                    Evidence Data
                                </p>
                                <pre className="p-4 bg-surface-100 dark:bg-surface-900 rounded-lg text-sm overflow-auto max-h-64">
                                    {JSON.stringify(selectedLog.evidence, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
