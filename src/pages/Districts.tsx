import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertTriangle, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card, CardHeader } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface District {
    id: string;
    name: string;
    state_id: string;
    state_name?: string;
    mandal_count: number;
    centre_count: number;
    alert_count: number;
    risk_level: 'low' | 'medium' | 'high';
}

export function Districts() {
    const navigate = useNavigate();
    const { isSuperAdmin, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [districts, setDistricts] = useState<District[]>([]);

    const fetchDistricts = useCallback(async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('districts')
                .select(`
          id,
          name,
          state_id,
          states!inner(name)
        `);

            // For district in-charge, only show their district
            if (!isSuperAdmin && scope.districtId) {
                query = query.eq('id', scope.districtId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch mandal counts
            const districtIds = (data || []).map((d: any) => d.id);
            const { data: mandals } = await supabase
                .from('mandals')
                .select('id, district_id');

            // Fetch centre counts via mandals
            const { data: centres } = await supabase
                .from('exam_centres')
                .select('id, mandal_id');

            // Calculate counts and risk
            const districtsWithStats: District[] = (data || []).map((d: any) => {
                const districtMandals = (mandals || []).filter((m: any) => m.district_id === d.id);
                const mandalIds = districtMandals.map((m: any) => m.id);
                const districtCentres = (centres || []).filter((c: any) => mandalIds.includes(c.mandal_id));

                // Mock alert count and risk level - would come from real data
                const alert_count = Math.floor(Math.random() * 20);
                const risk_level = alert_count > 15 ? 'high' : alert_count > 5 ? 'medium' : 'low';

                return {
                    id: d.id,
                    name: d.name,
                    state_id: d.state_id,
                    state_name: d.states?.name,
                    mandal_count: districtMandals.length,
                    centre_count: districtCentres.length,
                    alert_count,
                    risk_level,
                };
            });

            setDistricts(districtsWithStats);
        } catch (error) {
            console.error('Error fetching districts:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, scope]);

    useEffect(() => {
        fetchDistricts();
    }, [fetchDistricts]);

    const columns = [
        {
            key: 'name',
            header: 'District',
            render: (item: District) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                        <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <p className="font-medium text-surface-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">{item.state_name}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'mandal_count',
            header: 'Mandals',
            sortable: true,
            render: (item: District) => (
                <span className="text-surface-700 dark:text-surface-300">{item.mandal_count}</span>
            ),
        },
        {
            key: 'centre_count',
            header: 'Centres',
            sortable: true,
            render: (item: District) => (
                <span className="text-surface-700 dark:text-surface-300">{item.centre_count}</span>
            ),
        },
        {
            key: 'alert_count',
            header: 'Alerts',
            sortable: true,
            render: (item: District) => (
                <div className="flex items-center gap-2">
                    {item.alert_count > 0 ? (
                        <>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>{item.alert_count}</span>
                        </>
                    ) : (
                        <span className="text-surface-400">0</span>
                    )}
                </div>
            ),
        },
        {
            key: 'risk_level',
            header: 'Risk',
            render: (item: District) => (
                <Badge
                    variant={item.risk_level === 'high' ? 'danger' : item.risk_level === 'medium' ? 'warning' : 'success'}
                    dot
                >
                    {item.risk_level.charAt(0).toUpperCase() + item.risk_level.slice(1)}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (item: District) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/mandals?district=${item.id}`)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                    View
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {districts.length}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Total Districts</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {districts.reduce((sum, d) => sum + d.mandal_count, 0)}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Total Mandals</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {districts.reduce((sum, d) => sum + d.centre_count, 0)}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Total Centres</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={districts}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No districts found"
                onRowClick={(item) => navigate(`/mandals?district=${item.id}`)}
            />
        </div>
    );
}
