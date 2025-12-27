import React, { useState } from 'react';
import { format } from 'date-fns';
import {
    FileText,
    Download,
    Calendar,
    Building2,
    Users,
    AlertTriangle,
    Video,
    BarChart3,
    PieChart,
    TrendingUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Tabs, TabPanel } from '../components/ui/Tabs';
import { logAuditEvent, AuditActions } from '../services/auditService';

interface ReportType {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    category: string;
}

const reportTypes: ReportType[] = [
    {
        id: 'exam-incidents',
        title: 'Exam Incident Summary',
        description: 'Comprehensive report of all violations per exam',
        icon: AlertTriangle,
        category: 'incidents',
    },
    {
        id: 'student-malpractice',
        title: 'Student Malpractice History',
        description: 'Individual student violation records',
        icon: Users,
        category: 'incidents',
    },
    {
        id: 'centre-risk',
        title: 'Centre Risk Profile',
        description: 'Risk assessment by examination centre',
        icon: Building2,
        category: 'centres',
    },
    {
        id: 'cctv-uptime',
        title: 'CCTV Uptime Report',
        description: 'Camera connectivity and uptime statistics',
        icon: Video,
        category: 'infrastructure',
    },
    {
        id: 'daily-summary',
        title: 'Daily Operations Summary',
        description: 'End-of-day summary of all activities',
        icon: BarChart3,
        category: 'operations',
    },
    {
        id: 'severity-distribution',
        title: 'Severity Distribution',
        description: 'Breakdown of violations by severity level',
        icon: PieChart,
        category: 'incidents',
    },
];

export function Reports() {
    const { user, permissions } = useAuth();
    const [activeTab, setActiveTab] = useState('all');
    const [dateRange, setDateRange] = useState({
        start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    });
    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [exportFormat, setExportFormat] = useState('pdf');

    const handleGenerateReport = async (report: ReportType) => {
        if (!user) return;

        setSelectedReport(report);
        setIsGenerating(true);

        // Log the report generation
        await logAuditEvent(user.id, {
            action: AuditActions.REPORT_GENERATED,
            entity: 'report',
            evidence: {
                report_type: report.id,
                date_range: dateRange,
            },
        });

        // Simulate report generation
        setTimeout(() => {
            setIsGenerating(false);
        }, 2000);
    };

    const handleExport = async () => {
        if (!user || !selectedReport) return;

        await logAuditEvent(user.id, {
            action: AuditActions.REPORT_EXPORTED,
            entity: 'report',
            evidence: {
                report_type: selectedReport.id,
                format: exportFormat,
                date_range: dateRange,
            },
        });

        // Trigger download (mock)
        const link = document.createElement('a');
        link.download = `${selectedReport.id}-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
        link.click();
    };

    const tabs = [
        { id: 'all', label: 'All Reports' },
        { id: 'incidents', label: 'Incidents' },
        { id: 'centres', label: 'Centres' },
        { id: 'infrastructure', label: 'Infrastructure' },
        { id: 'operations', label: 'Operations' },
    ];

    const filteredReports = activeTab === 'all'
        ? reportTypes
        : reportTypes.filter(r => r.category === activeTab);

    if (!permissions.canExportReports) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <FileText className="w-12 h-12 text-surface-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
                        Access Restricted
                    </h2>
                    <p className="text-surface-500 dark:text-surface-400">
                        You don't have permission to access reports.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Range Filter */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-4">
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
                    </div>
                    <Select
                        label="Export Format"
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        options={[
                            { value: 'pdf', label: 'PDF' },
                            { value: 'csv', label: 'CSV' },
                            { value: 'xlsx', label: 'Excel' },
                        ]}
                    />
                </div>
            </Card>

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => (
                    <Card key={report.id} padding="md" hover>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                <report.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-surface-900 dark:text-white mb-1">
                                    {report.title}
                                </h3>
                                <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
                                    {report.description}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateReport(report)}
                                    isLoading={isGenerating && selectedReport?.id === report.id}
                                    leftIcon={<Download className="w-4 h-4" />}
                                >
                                    Generate
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Generated Report Preview (placeholder) */}
            {selectedReport && !isGenerating && (
                <Card padding="lg">
                    <CardHeader
                        title={selectedReport.title}
                        subtitle={`Generated for ${dateRange.start} to ${dateRange.end}`}
                        action={
                            <Button
                                onClick={handleExport}
                                leftIcon={<Download className="w-4 h-4" />}
                            >
                                Export {exportFormat.toUpperCase()}
                            </Button>
                        }
                    />
                    <div className="mt-6 p-8 bg-surface-50 dark:bg-surface-800 rounded-lg text-center">
                        <TrendingUp className="w-12 h-12 text-surface-400 mx-auto mb-4" />
                        <p className="text-surface-500 dark:text-surface-400">
                            Report preview would appear here with charts and data tables.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
