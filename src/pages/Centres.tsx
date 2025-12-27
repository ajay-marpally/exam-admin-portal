import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Video, Users, AlertTriangle, ChevronLeft, Layers, Monitor } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface Centre {
    id: string;
    centre_code: string;
    name: string;
    city: string;
    mandal_id?: string;
    mandal_name?: string;
    total_labs: number;
    total_seats: number;
    has_cctv: boolean;
    is_active: boolean;
    camera_count: number;
    active_students: number;
    alert_count: number;
}

export function Centres() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isSuperAdmin, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [centres, setCentres] = useState<Centre[]>([]);
    const [mandalName, setMandalName] = useState<string>('');

    const mandalFilter = searchParams.get('mandal') || scope.mandalId;

    const fetchCentres = useCallback(async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('exam_centres')
                .select(`
          id,
          centre_code,
          name,
          city,
          mandal_id,
          total_labs,
          total_seats,
          has_cctv,
          is_active,
          mandals(name)
        `);

            if (mandalFilter) {
                query = query.eq('mandal_id', mandalFilter);
            } else if (!isSuperAdmin && scope.centreId) {
                query = query.eq('id', scope.centreId);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                setMandalName((data[0] as any).mandals?.name || '');
            }

            // Fetch camera counts
            const { data: cameras } = await supabase.from('cctv_cameras').select('id, exam_center');

            const centresWithStats: Centre[] = (data || []).map((c: any) => ({
                id: c.id,
                centre_code: c.centre_code,
                name: c.name,
                city: c.city,
                mandal_id: c.mandal_id,
                mandal_name: c.mandals?.name,
                total_labs: c.total_labs || 0,
                total_seats: c.total_seats || 0,
                has_cctv: c.has_cctv,
                is_active: c.is_active,
                camera_count: (cameras || []).filter((cam: any) => cam.exam_center === c.centre_code).length,
                active_students: Math.floor(Math.random() * 50), // Mock
                alert_count: Math.floor(Math.random() * 5), // Mock
            }));

            setCentres(centresWithStats);
        } catch (error) {
            console.error('Error fetching centres:', error);
        } finally {
            setIsLoading(false);
        }
    }, [mandalFilter, isSuperAdmin, scope]);

    useEffect(() => {
        fetchCentres();
    }, [fetchCentres]);

    const columns = [
        {
            key: 'name',
            header: 'Centre',
            render: (item: Centre) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="font-medium text-surface-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                            {item.centre_code} • {item.city}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'labs',
            header: 'Labs',
            render: (item: Centre) => (
                <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-surface-400" />
                    <span>{item.total_labs}</span>
                </div>
            ),
        },
        {
            key: 'seats',
            header: 'Seats',
            render: (item: Centre) => (
                <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-surface-400" />
                    <span>{item.total_seats}</span>
                </div>
            ),
        },
        {
            key: 'cameras',
            header: 'Cameras',
            render: (item: Centre) => (
                <div className="flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-surface-400" />
                    <span>{item.camera_count}</span>
                    {!item.has_cctv && (
                        <Badge variant="danger" size="sm">No CCTV</Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'active_students',
            header: 'Active',
            render: (item: Centre) => (
                item.active_students > 0 ? (
                    <Badge variant="info" dot>{item.active_students}</Badge>
                ) : (
                    <span className="text-surface-400">0</span>
                )
            ),
        },
        {
            key: 'alerts',
            header: 'Alerts',
            render: (item: Centre) => (
                item.alert_count > 0 ? (
                    <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{item.alert_count}</span>
                    </div>
                ) : (
                    <span className="text-surface-400">0</span>
                )
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (item: Centre) => (
                <Badge variant={item.is_active ? 'success' : 'danger'} dot>
                    {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Back button */}
            {mandalFilter && (
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/mandals')}
                        leftIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                        Back to Mandals
                    </Button>
                    {mandalName && (
                        <span className="text-surface-500 dark:text-surface-400">
                            / {mandalName}
                        </span>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {centres.length}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Centres</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {centres.reduce((sum, c) => sum + c.total_labs, 0)}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Labs</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {centres.reduce((sum, c) => sum + c.total_seats, 0)}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Seats</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {centres.reduce((sum, c) => sum + c.camera_count, 0)}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Cameras</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={centres}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No centres found"
            />
        </div>
    );
}
