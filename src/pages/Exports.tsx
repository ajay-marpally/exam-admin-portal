import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
    Download,
    Calendar,
    FileSpreadsheet,
    Users,
    BookOpen,
    Clock,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
    Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { logAuditEvent, AuditActions } from '../services/auditService';

interface ExamOption {
    id: string;
    name: string;
}

interface ExportableAttempt {
    id: string;
    hall_ticket: string;
    student_name: string;
    exam_name: string;
    centre: string;
    status: string;
    start_time: string | null;
    end_time: string | null;
    total_questions: number;
    answered: number;
    correct: number;
    score: number;
    [key: string]: unknown;
}

interface AttendanceRecord {
    hall_ticket: string;
    student_name: string;
    exam_name: string;
    centre: string;
    scheduled_time: string;
    actual_start: string | null;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    remarks: string;
    [key: string]: unknown;
}

// Utility to convert data to CSV
function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
    const headerRow = headers.join(',');
    const rows = data.map(row =>
        headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        }).join(',')
    );
    return [headerRow, ...rows].join('\n');
}

// Download file utility
function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function Exports() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [exams, setExams] = useState<ExamOption[]>([]);
    const [selectedExam, setSelectedExam] = useState<string>('all');
    const [dateRange, setDateRange] = useState({
        start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    });
    const [exportType, setExportType] = useState<'responses' | 'attendance'>('responses');
    const [previewData, setPreviewData] = useState<ExportableAttempt[] | AttendanceRecord[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // Fetch exams for dropdown
    useEffect(() => {
        async function fetchExams() {
            const { data } = await supabase
                .from('exams')
                .select('id, name')
                .order('name');
            setExams(data || []);
        }
        fetchExams();
    }, []);

    // Fetch preview data
    const fetchPreviewData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (exportType === 'responses') {
                let query = supabase
                    .from('exam_attempts')
                    .select(`
            id,
            status,
            start_time,
            end_time,
            students!inner(hall_ticket, user_id, exam_center),
            exams!inner(id, name)
          `)
                    .gte('created_at', dateRange.start)
                    .lte('created_at', dateRange.end + 'T23:59:59');

                if (selectedExam !== 'all') {
                    query = query.eq('exam_id', selectedExam);
                }

                const { data: attempts } = await query.limit(100);

                // Fetch answers for each attempt
                const attemptIds = (attempts || []).map((a: any) => a.id);
                const { data: answers } = await supabase
                    .from('answers')
                    .select('attempt_id, selected_option, question_id')
                    .in('attempt_id', attemptIds);

                // Fetch questions to check correct answers
                const { data: questions } = await supabase
                    .from('questions')
                    .select('id, correct_option');

                const questionsMap = new Map((questions || []).map((q: any) => [q.id, q.correct_option]));

                const exportData: ExportableAttempt[] = (attempts || []).map((attempt: any) => {
                    const attemptAnswers = (answers || []).filter((a: any) => a.attempt_id === attempt.id);
                    const answered = attemptAnswers.filter((a: any) => a.selected_option !== null).length;
                    const correct = attemptAnswers.filter((a: any) =>
                        a.selected_option !== null && a.selected_option === questionsMap.get(a.question_id)
                    ).length;

                    return {
                        id: attempt.id,
                        hall_ticket: attempt.students?.hall_ticket || 'Unknown',
                        student_name: attempt.students?.user_id || 'Unknown',
                        exam_name: attempt.exams?.name || 'Unknown',
                        centre: attempt.students?.exam_center || 'Unknown',
                        status: attempt.status,
                        start_time: attempt.start_time,
                        end_time: attempt.end_time,
                        total_questions: attemptAnswers.length,
                        answered,
                        correct,
                        score: attemptAnswers.length > 0 ? Math.round((correct / attemptAnswers.length) * 100) : 0,
                    };
                });

                setPreviewData(exportData);
            } else {
                // Attendance report
                let query = supabase
                    .from('exam_attempts')
                    .select(`
            id,
            status,
            start_time,
            created_at,
            students!inner(hall_ticket, user_id, exam_center),
            exams!inner(id, name, start_time)
          `)
                    .gte('created_at', dateRange.start)
                    .lte('created_at', dateRange.end + 'T23:59:59');

                if (selectedExam !== 'all') {
                    query = query.eq('exam_id', selectedExam);
                }

                const { data: attempts } = await query.limit(100);

                const attendanceData: AttendanceRecord[] = (attempts || []).map((attempt: any) => {
                    const scheduledTime = attempt.exams?.start_time;
                    const actualStart = attempt.start_time;

                    let status: 'PRESENT' | 'ABSENT' | 'LATE' = 'ABSENT';
                    let remarks = '';

                    if (attempt.status === 'IN_PROGRESS' || attempt.status === 'SUBMITTED') {
                        if (actualStart && scheduledTime) {
                            const diff = new Date(actualStart).getTime() - new Date(scheduledTime).getTime();
                            if (diff > 15 * 60 * 1000) { // More than 15 mins late
                                status = 'LATE';
                                remarks = `Late by ${Math.round(diff / 60000)} minutes`;
                            } else {
                                status = 'PRESENT';
                                remarks = 'On time';
                            }
                        } else {
                            status = 'PRESENT';
                        }
                    } else if (attempt.status === 'TERMINATED') {
                        status = 'PRESENT';
                        remarks = 'Session terminated';
                    } else {
                        status = 'ABSENT';
                        remarks = 'Did not start';
                    }

                    return {
                        hall_ticket: attempt.students?.hall_ticket || 'Unknown',
                        student_name: attempt.students?.user_id || 'Unknown',
                        exam_name: attempt.exams?.name || 'Unknown',
                        centre: attempt.students?.exam_center || 'Unknown',
                        scheduled_time: scheduledTime || 'N/A',
                        actual_start: actualStart,
                        status,
                        remarks,
                    };
                });

                setPreviewData(attendanceData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [exportType, selectedExam, dateRange]);

    useEffect(() => {
        fetchPreviewData();
    }, [fetchPreviewData]);

    // Export to CSV
    const handleExport = async (format: 'csv' | 'json') => {
        if (!user || previewData.length === 0) return;

        setIsExporting(true);
        try {
            const timestamp = format === 'csv' ? new Date().toISOString().split('T')[0] : Date.now();
            const filename = `${exportType}_report_${timestamp}.${format}`;

            if (format === 'csv') {
                const headers = exportType === 'responses'
                    ? ['hall_ticket', 'student_name', 'exam_name', 'centre', 'status', 'start_time', 'end_time', 'total_questions', 'answered', 'correct', 'score']
                    : ['hall_ticket', 'student_name', 'exam_name', 'centre', 'scheduled_time', 'actual_start', 'status', 'remarks'];

                const csv = convertToCSV(previewData as Record<string, unknown>[], headers);
                downloadFile(csv, filename, 'text/csv');
            } else {
                const json = JSON.stringify(previewData, null, 2);
                downloadFile(json, filename, 'application/json');
            }

            await logAuditEvent(user.id, {
                action: AuditActions.REPORT_EXPORTED,
                entity: exportType === 'responses' ? 'exam_attempts' : 'attendance',
                evidence: {
                    format,
                    exam_filter: selectedExam,
                    date_range: dateRange,
                    record_count: previewData.length,
                },
            });
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const responseColumns = [
        { key: 'hall_ticket', header: 'Hall Ticket' },
        { key: 'exam_name', header: 'Exam' },
        { key: 'centre', header: 'Centre' },
        {
            key: 'status',
            header: 'Status',
            render: (item: ExportableAttempt) => (
                <Badge
                    variant={
                        item.status === 'SUBMITTED' ? 'success' :
                            item.status === 'IN_PROGRESS' ? 'info' :
                                item.status === 'TERMINATED' ? 'danger' : 'default'
                    }
                >
                    {item.status}
                </Badge>
            )
        },
        { key: 'answered', header: 'Answered' },
        { key: 'correct', header: 'Correct' },
        {
            key: 'score',
            header: 'Score',
            render: (item: ExportableAttempt) => (
                <span className={item.score >= 50 ? 'text-green-600' : 'text-red-600'}>
                    {item.score}%
                </span>
            )
        },
    ];

    const attendanceColumns = [
        { key: 'hall_ticket', header: 'Hall Ticket' },
        { key: 'exam_name', header: 'Exam' },
        { key: 'centre', header: 'Centre' },
        {
            key: 'status',
            header: 'Status',
            render: (item: AttendanceRecord) => (
                <Badge
                    variant={
                        item.status === 'PRESENT' ? 'success' :
                            item.status === 'LATE' ? 'warning' : 'danger'
                    }
                    dot
                >
                    {item.status}
                </Badge>
            )
        },
        {
            key: 'scheduled_time',
            header: 'Scheduled',
            render: (item: AttendanceRecord) => item.scheduled_time !== 'N/A'
                ? format(new Date(item.scheduled_time), 'MMM d, HH:mm')
                : 'N/A'
        },
        {
            key: 'actual_start',
            header: 'Actual Start',
            render: (item: AttendanceRecord) => item.actual_start
                ? format(new Date(item.actual_start), 'HH:mm:ss')
                : '-'
        },
        { key: 'remarks', header: 'Remarks' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                        Export Data
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Export exam responses and attendance reports
                    </p>
                </div>
            </div>

            {/* Export Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                    padding="md"
                    hover
                    className={`cursor-pointer transition-all ${exportType === 'responses' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setExportType('responses')}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${exportType === 'responses' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-surface-100 dark:bg-surface-700'}`}>
                            <FileSpreadsheet className={`w-6 h-6 ${exportType === 'responses' ? 'text-primary-600' : 'text-surface-500'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-surface-900 dark:text-white">Response Sheets</h3>
                            <p className="text-sm text-surface-500 dark:text-surface-400">
                                Export all exam attempts with scores and answers
                            </p>
                        </div>
                        {exportType === 'responses' && (
                            <CheckCircle className="w-5 h-5 text-primary-500 ml-auto" />
                        )}
                    </div>
                </Card>

                <Card
                    padding="md"
                    hover
                    className={`cursor-pointer transition-all ${exportType === 'attendance' ? 'ring-2 ring-primary-500' : ''}`}
                    onClick={() => setExportType('attendance')}
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${exportType === 'attendance' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-surface-100 dark:bg-surface-700'}`}>
                            <Users className={`w-6 h-6 ${exportType === 'attendance' ? 'text-primary-600' : 'text-surface-500'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-surface-900 dark:text-white">Attendance Report</h3>
                            <p className="text-sm text-surface-500 dark:text-surface-400">
                                Export student attendance with timing details
                            </p>
                        </div>
                        {exportType === 'attendance' && (
                            <CheckCircle className="w-5 h-5 text-primary-500 ml-auto" />
                        )}
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card padding="md">
                <CardHeader title="Filters" subtitle="Customize your export" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <Select
                        label="Exam"
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        options={[
                            { value: 'all', label: 'All Exams' },
                            ...exams.map(e => ({ value: e.id, label: e.name })),
                        ]}
                    />
                    <Input
                        label="Start Date"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        leftIcon={<Calendar className="w-4 h-4" />}
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        leftIcon={<Calendar className="w-4 h-4" />}
                    />
                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            onClick={fetchPreviewData}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                            isLoading={isLoading}
                            className="w-full"
                        >
                            Refresh
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Preview & Export */}
            <Card padding="md">
                <CardHeader
                    title={`Preview (${previewData.length} records)`}
                    subtitle="Review data before exporting"
                    action={
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handleExport('csv')}
                                leftIcon={<Download className="w-4 h-4" />}
                                isLoading={isExporting}
                                disabled={previewData.length === 0}
                            >
                                Export CSV
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => handleExport('json')}
                                leftIcon={<Download className="w-4 h-4" />}
                                isLoading={isExporting}
                                disabled={previewData.length === 0}
                            >
                                Export JSON
                            </Button>
                        </div>
                    }
                />
                <div className="mt-4">
                    <Table
                        columns={exportType === 'responses' ? responseColumns : (attendanceColumns as any)}
                        data={previewData as any[]}
                        keyExtractor={(item: any) => item.id || item.hall_ticket}
                        isLoading={isLoading}
                        emptyMessage={`No ${exportType === 'responses' ? 'exam attempts' : 'attendance records'} found for selected filters`}
                    />
                </div>
            </Card>
        </div>
    );
}
