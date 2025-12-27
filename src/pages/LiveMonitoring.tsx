import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Search,
    Filter,
    RefreshCw,
    Eye,
    AlertTriangle,
    ArrowUpRight,
    XCircle,
    Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeAttempts } from '../hooks/useRealtime';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge, SeverityBadge, AttemptStatusBadge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/Modal';
import { logAuditEvent, AuditActions } from '../services/auditService';

interface StudentAttempt {
    id: string;
    student_id: string;
    exam_id: string;
    status: string;
    start_time: string | null;
    created_at: string;
    student: {
        id: string;
        hall_ticket: string;
        exam_center: string | null;
    };
    exam: {
        id: string;
        name: string;
    };
    malpractice_count: number;
    last_event_time: string | null;
    risk_score: number;
}

export function LiveMonitoring() {
    const navigate = useNavigate();
    const { user, permissions } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
    const [filteredAttempts, setFilteredAttempts] = useState<StudentAttempt[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [terminateModal, setTerminateModal] = useState<{ isOpen: boolean; attempt: StudentAttempt | null }>({
        isOpen: false,
        attempt: null,
    });
    const [isTerminating, setIsTerminating] = useState(false);

    // Fetch active attempts
    const fetchAttempts = useCallback(async () => {
        try {
            setIsLoading(true);

            // Fetch exam attempts with student and exam info
            const { data: attemptsData, error } = await supabase
                .from('exam_attempts')
                .select(`
          id,
          student_id,
          exam_id,
          status,
          start_time,
          created_at,
          students!inner(id, hall_ticket, exam_center),
          exams!inner(id, name)
        `)
                .in('status', ['IN_PROGRESS', 'NOT_STARTED'])
                .order('start_time', { ascending: false });

            if (error) throw error;

            // Fetch malpractice counts for each attempt
            const attemptIds = (attemptsData || []).map((a: any) => a.id);

            const { data: malpracticeData } = await supabase
                .from('malpractice_events')
                .select('attempt_id, severity, occurred_at')
                .in('attempt_id', attemptIds);

            // Calculate risk scores and last event times
            const attemptsWithRisk = (attemptsData || []).map((attempt: any) => {
                const events = (malpracticeData || []).filter((e: any) => e.attempt_id === attempt.id);
                const malpractice_count = events.length;

                // Calculate risk score based on severity sum
                const totalSeverity = events.reduce((sum: number, e: any) => sum + (e.severity || 0), 0);
                const risk_score = Math.min(10, Math.round(totalSeverity / Math.max(1, malpractice_count)));

                // Get last event time
                const lastEvent = events.sort((a: any, b: any) =>
                    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
                )[0];

                return {
                    id: attempt.id,
                    student_id: attempt.student_id,
                    exam_id: attempt.exam_id,
                    status: attempt.status,
                    start_time: attempt.start_time,
                    created_at: attempt.created_at,
                    student: {
                        id: attempt.students?.id,
                        hall_ticket: attempt.students?.hall_ticket || 'Unknown',
                        exam_center: attempt.students?.exam_center,
                    },
                    exam: {
                        id: attempt.exams?.id,
                        name: attempt.exams?.name || 'Unknown Exam',
                    },
                    malpractice_count,
                    last_event_time: lastEvent?.occurred_at || null,
                    risk_score: malpractice_count > 0 ? risk_score : 0,
                };
            });

            setAttempts(attemptsWithRisk);
            setFilteredAttempts(attemptsWithRisk);
        } catch (error) {
            console.error('Error fetching attempts:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAttempts();
    }, [fetchAttempts]);

    // Handle realtime updates
    const handleAttemptUpdate = useCallback((updated: Record<string, unknown>) => {
        setAttempts(prev => prev.map(a =>
            a.id === updated.id ? { ...a, status: updated.status as string } : a
        ));
    }, []);

    useRealtimeAttempts(handleAttemptUpdate);

    // Filter attempts
    useEffect(() => {
        let filtered = attempts;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                a.student.hall_ticket.toLowerCase().includes(query) ||
                a.exam.name.toLowerCase().includes(query) ||
                a.student.exam_center?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(a => a.status === statusFilter);
        }

        setFilteredAttempts(filtered);
    }, [attempts, searchQuery, statusFilter]);

    // Handle terminate attempt
    const handleTerminate = async () => {
        if (!terminateModal.attempt || !user) return;

        setIsTerminating(true);
        try {
            const { error } = await supabase
                .from('exam_attempts')
                .update({ status: 'TERMINATED', end_time: new Date().toISOString() })
                .eq('id', terminateModal.attempt.id);

            if (error) throw error;

            await logAuditEvent(user.id, {
                action: AuditActions.ATTEMPT_TERMINATED,
                entity: 'exam_attempts',
                entity_id: terminateModal.attempt.id,
                evidence: {
                    student_id: terminateModal.attempt.student_id,
                    hall_ticket: terminateModal.attempt.student.hall_ticket,
                    exam: terminateModal.attempt.exam.name,
                },
            });

            setAttempts(prev => prev.filter(a => a.id !== terminateModal.attempt!.id));
            setTerminateModal({ isOpen: false, attempt: null });
        } catch (error) {
            console.error('Error terminating attempt:', error);
        } finally {
            setIsTerminating(false);
        }
    };

    const columns = [
        {
            key: 'hall_ticket',
            header: 'Hall Ticket',
            render: (item: StudentAttempt) => (
                <span className="font-mono font-medium text-surface-900 dark:text-white">
                    {item.student.hall_ticket}
                </span>
            ),
        },
        {
            key: 'exam',
            header: 'Exam',
            render: (item: StudentAttempt) => (
                <span className="text-surface-700 dark:text-surface-300">
                    {item.exam.name}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (item: StudentAttempt) => (
                <AttemptStatusBadge status={item.status} />
            ),
        },
        {
            key: 'risk_score',
            header: 'Risk',
            sortable: true,
            render: (item: StudentAttempt) => (
                item.risk_score > 0 ? (
                    <SeverityBadge severity={item.risk_score} />
                ) : (
                    <Badge variant="success" size="sm">Clean</Badge>
                )
            ),
        },
        {
            key: 'malpractice_count',
            header: 'Events',
            sortable: true,
            render: (item: StudentAttempt) => (
                <div className="flex items-center gap-1">
                    {item.malpractice_count > 0 ? (
                        <>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>{item.malpractice_count}</span>
                        </>
                    ) : (
                        <span className="text-surface-400">0</span>
                    )}
                </div>
            ),
        },
        {
            key: 'last_event',
            header: 'Last Event',
            render: (item: StudentAttempt) => (
                <div className="flex items-center gap-1 text-surface-500 dark:text-surface-400 text-sm">
                    <Clock className="w-3 h-3" />
                    {item.last_event_time ? (
                        formatDistanceToNow(new Date(item.last_event_time), { addSuffix: true })
                    ) : (
                        'No events'
                    )}
                </div>
            ),
        },
        {
            key: 'centre',
            header: 'Centre',
            render: (item: StudentAttempt) => (
                <span className="text-surface-600 dark:text-surface-400 text-sm">
                    {item.student.exam_center || '-'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: StudentAttempt) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/evidence?attempt=${item.id}`);
                        }}
                        title="View Evidence"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    {permissions.canEscalate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Handle escalation
                            }}
                            title="Escalate"
                        >
                            <ArrowUpRight className="w-4 h-4" />
                        </Button>
                    )}
                    {permissions.canTerminateAttempts && item.status === 'IN_PROGRESS' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTerminateModal({ isOpen: true, attempt: item });
                            }}
                            title="Terminate"
                        >
                            <XCircle className="w-4 h-4" />
                        </Button>
                    )}
                </div>
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
                            placeholder="Search by hall ticket, exam, or centre..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'ALL', label: 'All Status' },
                                { value: 'IN_PROGRESS', label: 'In Progress' },
                                { value: 'NOT_STARTED', label: 'Not Started' },
                            ]}
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={fetchAttempts}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                    >
                        Refresh
                    </Button>
                </div>
            </Card>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {attempts.filter(a => a.status === 'IN_PROGRESS').length}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">In Progress</p>
                </Card>
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {attempts.filter(a => a.risk_score >= 7).length}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">High Risk</p>
                </Card>
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {attempts.reduce((sum, a) => sum + a.malpractice_count, 0)}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Total Events</p>
                </Card>
                <Card padding="sm" className="text-center">
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">
                        {attempts.filter(a => a.malpractice_count === 0).length}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Clean Sessions</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={filteredAttempts}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No active exam sessions"
                onRowClick={(item) => navigate(`/evidence?attempt=${item.id}`)}
            />

            {/* Terminate Confirmation Modal */}
            <ConfirmModal
                isOpen={terminateModal.isOpen}
                onClose={() => setTerminateModal({ isOpen: false, attempt: null })}
                onConfirm={handleTerminate}
                title="Terminate Exam Session"
                message={`Are you sure you want to terminate the exam session for ${terminateModal.attempt?.student.hall_ticket}? This action cannot be undone.`}
                confirmText="Terminate"
                variant="danger"
                isLoading={isTerminating}
            />
        </div>
    );
}
