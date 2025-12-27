import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, AlertTriangle, Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface Mandal {
    id: string;
    name: string;
    district_id: string;
    district_name?: string;
    centre_count: number;
    active_exams: number;
    alert_count: number;
}

export function Mandals() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isSuperAdmin, isDistrictLevel, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [mandals, setMandals] = useState<Mandal[]>([]);
    const [districtName, setDistrictName] = useState<string>('');

    const districtFilter = searchParams.get('district') || scope.districtId;

    const fetchMandals = useCallback(async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('mandals')
                .select(`
          id,
          name,
          district_id,
          districts!inner(name)
        `);

            if (districtFilter) {
                query = query.eq('district_id', districtFilter);
            } else if (!isSuperAdmin && scope.mandalId) {
                query = query.eq('id', scope.mandalId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Get district name
            if (data && data.length > 0) {
                setDistrictName((data[0] as any).districts?.name || '');
            }

            // Fetch centre counts
            const mandalIds = (data || []).map((m: any) => m.id);
            const { data: centres } = await supabase
                .from('exam_centres')
                .select('id, mandal_id, is_active');

            const mandalsWithStats: Mandal[] = (data || []).map((m: any) => {
                const mandalCentres = (centres || []).filter((c: any) => c.mandal_id === m.id);
                return {
                    id: m.id,
                    name: m.name,
                    district_id: m.district_id,
                    district_name: m.districts?.name,
                    centre_count: mandalCentres.length,
                    active_exams: Math.floor(Math.random() * 5), // Mock
                    alert_count: Math.floor(Math.random() * 10), // Mock
                };
            });

            setMandals(mandalsWithStats);
        } catch (error) {
            console.error('Error fetching mandals:', error);
        } finally {
            setIsLoading(false);
        }
    }, [districtFilter, isSuperAdmin, scope]);

    useEffect(() => {
        fetchMandals();
    }, [fetchMandals]);

    const columns = [
        {
            key: 'name',
            header: 'Mandal',
            render: (item: Mandal) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-surface-900 dark:text-white">{item.name}</span>
                </div>
            ),
        },
        {
            key: 'centre_count',
            header: 'Centres',
            sortable: true,
        },
        {
            key: 'active_exams',
            header: 'Active Exams',
            sortable: true,
            render: (item: Mandal) => (
                item.active_exams > 0 ? (
                    <Badge variant="info" dot>{item.active_exams} active</Badge>
                ) : (
                    <span className="text-surface-400">None</span>
                )
            ),
        },
        {
            key: 'alert_count',
            header: 'Alerts',
            sortable: true,
            render: (item: Mandal) => (
                item.alert_count > 0 ? (
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>{item.alert_count}</span>
                    </div>
                ) : (
                    <span className="text-surface-400">0</span>
                )
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (item: Mandal) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/centres?mandal=${item.id}`)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                    View Centres
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Back button */}
            {districtFilter && (
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/districts')}
                        leftIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                        Back to Districts
                    </Button>
                    {districtName && (
                        <span className="text-surface-500 dark:text-surface-400">
                            / {districtName}
                        </span>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {mandals.length}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Total Mandals</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {mandals.reduce((sum, m) => sum + m.centre_count, 0)}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Total Centres</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {mandals.reduce((sum, m) => sum + m.active_exams, 0)}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Active Exams</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={mandals}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No mandals found"
                onRowClick={(item) => navigate(`/centres?mandal=${item.id}`)}
            />
        </div>
    );
}
