import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    BookOpen,
    AlertTriangle,
    AlertOctagon,
    Video,
    FileSearch,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRoleScope } from '../hooks/useRoleScope';
import { useRealtimeAlerts } from '../hooks/useRealtime';
import { KPICard } from '../components/dashboard/KPICard';
import { RiskHeatmap } from '../components/dashboard/RiskHeatmap';
import { AlertTimeline } from '../components/dashboard/AlertTimeline';
import { SystemHealth } from '../components/dashboard/SystemHealth';

interface DashboardData {
    activeExams: number;
    activeStudents: number;
    openAlerts: number;
    highSeverityAlerts: number;
    camerasOffline: number;
    camerasTotal: number;
    evidenceAwaitingReview: number;
}

interface AlertItem {
    id: string;
    time: string;
    type: string;
    source: 'STUDENT_AI' | 'CCTV_AI' | 'ADMIN';
    severity: number;
    studentName?: string;
    centreName?: string;
    description?: string;
}

interface RiskNode {
    name: string;
    value: number;
    severity: 'low' | 'medium' | 'high';
    [key: string]: unknown;
}

export function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isSuperAdmin, scope } = useRoleScope();

    const [isLoading, setIsLoading] = useState(true);
    const [kpis, setKpis] = useState<DashboardData>({
        activeExams: 0,
        activeStudents: 0,
        openAlerts: 0,
        highSeverityAlerts: 0,
        camerasOffline: 0,
        camerasTotal: 0,
        evidenceAwaitingReview: 0,
    });
    const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
    const [riskData, setRiskData] = useState<RiskNode[]>([]);

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            setIsLoading(true);

            // Fetch active exams count
            const now = new Date().toISOString();
            const { count: activeExams } = await supabase
                .from('exams')
                .select('*', { count: 'exact', head: true })
                .lte('start_time', now)
                .gte('end_time', now);

            // Fetch active students (IN_PROGRESS attempts)
            const { count: activeStudents } = await supabase
                .from('exam_attempts')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'IN_PROGRESS');

            // Fetch malpractice events (as alerts)
            const { data: malpracticeEvents, count: openAlerts } = await supabase
                .from('malpractice_events')
                .select('*, exam_attempts(students(hall_ticket))', { count: 'exact' })
                .order('occurred_at', { ascending: false })
                .limit(20);

            // Count high severity alerts (>= 7)
            const { count: highSeverityAlerts } = await supabase
                .from('malpractice_events')
                .select('*', { count: 'exact', head: true })
                .gte('severity', 7);

            // Fetch cameras
            const { data: cameras } = await supabase
                .from('cctv_cameras')
                .select('id, is_active');

            const camerasTotal = cameras?.length || 0;
            const camerasOffline = cameras?.filter(c => !c.is_active).length || 0;

            // Fetch evidence awaiting review (not locked)
            const { count: evidenceAwaitingReview } = await supabase
                .from('cctv_evidence')
                .select('*', { count: 'exact', head: true })
                .eq('is_locked', false);

            setKpis({
                activeExams: activeExams || 0,
                activeStudents: activeStudents || 0,
                openAlerts: openAlerts || 0,
                highSeverityAlerts: highSeverityAlerts || 0,
                camerasOffline,
                camerasTotal,
                evidenceAwaitingReview: evidenceAwaitingReview || 0,
            });

            // Transform malpractice events to alerts
            const alerts: AlertItem[] = (malpracticeEvents || []).map((event: any) => ({
                id: event.id,
                time: event.occurred_at,
                type: event.event_type,
                source: event.source,
                severity: event.severity || 5,
                studentName: event.exam_attempts?.students?.hall_ticket,
                description: event.description,
            }));

            setRecentAlerts(alerts);

            // Fetch districts for risk data
            const { data: districts } = await supabase
                .from('districts')
                .select('id, name');

            // Get alert counts by district (simplified - would need proper joins in real app)
            const riskNodes: RiskNode[] = (districts || []).map((d: any) => ({
                name: d.name,
                value: Math.floor(Math.random() * 50) + 5, // Placeholder - replace with actual data
                severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
            }));

            setRiskData(riskNodes);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Handle real-time alerts
    const handleNewAlert = useCallback((alert: Record<string, unknown>) => {
        const newAlert: AlertItem = {
            id: alert.id as string,
            time: (alert.occurred_at as string) || new Date().toISOString(),
            type: (alert.event_type as string) || 'Unknown',
            source: (alert.source as 'STUDENT_AI' | 'CCTV_AI' | 'ADMIN') || 'STUDENT_AI',
            severity: (alert.severity as number) || 5,
            description: alert.description as string,
        };

        setRecentAlerts(prev => [newAlert, ...prev].slice(0, 20));
        setKpis(prev => ({
            ...prev,
            openAlerts: prev.openAlerts + 1,
            highSeverityAlerts: newAlert.severity >= 7 ? prev.highSeverityAlerts + 1 : prev.highSeverityAlerts,
        }));
    }, []);

    const { isConnected } = useRealtimeAlerts(handleNewAlert);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KPICard
                    title="Active Exams"
                    value={kpis.activeExams}
                    icon={BookOpen}
                    color="primary"
                    isLoading={isLoading}
                />
                <KPICard
                    title="Active Students"
                    value={kpis.activeStudents}
                    icon={Users}
                    color="success"
                    isLoading={isLoading}
                />
                <KPICard
                    title="Open Alerts"
                    value={kpis.openAlerts}
                    icon={AlertTriangle}
                    color="warning"
                    isLoading={isLoading}
                />
                <KPICard
                    title="High Severity"
                    value={kpis.highSeverityAlerts}
                    icon={AlertOctagon}
                    color="danger"
                    isLoading={isLoading}
                />
                <KPICard
                    title="Cameras Offline"
                    value={`${kpis.camerasOffline}/${kpis.camerasTotal}`}
                    icon={Video}
                    color={kpis.camerasOffline > 0 ? 'danger' : 'success'}
                    isLoading={isLoading}
                />
                <KPICard
                    title="Evidence Pending"
                    value={kpis.evidenceAwaitingReview}
                    icon={FileSearch}
                    color="purple"
                    isLoading={isLoading}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Heatmap */}
                <div className="lg:col-span-2">
                    <RiskHeatmap
                        data={riskData}
                        title="Risk Distribution by District"
                        isLoading={isLoading}
                    />
                </div>

                {/* System Health */}
                <div>
                    <SystemHealth
                        status={{
                            database: 'healthy',
                            realtime: isConnected ? 'connected' : 'disconnected',
                            cameras: { online: kpis.camerasTotal - kpis.camerasOffline, total: kpis.camerasTotal },
                            lastSync: 'Just now',
                        }}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Alert Timeline */}
            <AlertTimeline
                alerts={recentAlerts}
                isLoading={isLoading}
                maxItems={10}
                onViewAll={() => navigate('/alerts')}
            />
        </div>
    );
}
