import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Video, Users, AlertTriangle, ChevronLeft, Layers, Monitor } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';

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

    const [mandals, setMandals] = useState<{ id: string, name: string }[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        centre_code: '',
        name: '',
        city: '',
        mandal_id: '',
        total_labs: 0,
        total_seats: 0,
        has_cctv: false,
    });

    const fetchMandals = useCallback(async () => {
        const { data } = await supabase.from('mandals').select('id, name').order('name');
        setMandals(data || []);
    }, []);

    useEffect(() => {
        fetchCentres();
        fetchMandals();
    }, [fetchCentres, fetchMandals]);

    const handleCreate = async () => {
        if (!formData.centre_code || !formData.name || !formData.mandal_id) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);
            const { error } = await supabase.from('exam_centres').insert({
                centre_code: formData.centre_code,
                name: formData.name,
                city: formData.city,
                mandal_id: formData.mandal_id,
                total_labs: Number(formData.total_labs),
                total_seats: Number(formData.total_seats),
                has_cctv: formData.has_cctv,
                is_active: true,
            });

            if (error) throw error;

            setIsCreateModalOpen(false);
            setFormData({
                centre_code: '',
                name: '',
                city: '',
                mandal_id: '',
                total_labs: 0,
                total_seats: 0,
                has_cctv: false,
            });
            fetchCentres();
        } catch (error: any) {
            console.error('Error creating centre:', error);
            alert(error.message || 'Failed to create centre');
        } finally {
            setIsSubmitting(false);
        }
    };

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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    {mandalFilter && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/mandals')}
                            leftIcon={<ChevronLeft className="w-4 h-4" />}
                        >
                            Back
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                            Exam Centres {mandalName ? `- ${mandalName}` : ''}
                        </h1>
                        <p className="text-surface-500 dark:text-surface-400">
                            Manage exam centres and facilities
                        </p>
                    </div>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    Add Centre
                </Button>
            </div>

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

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Add New Exam Centre"
            >
                <div className="space-y-4">
                    <Input
                        label="Centre Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Government Polytechnic College"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Centre Code"
                            value={formData.centre_code}
                            onChange={(e) => setFormData({ ...formData, centre_code: e.target.value })}
                            placeholder="e.g. GPC001"
                        />
                        <Input
                            label="City"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="e.g. Guntur"
                        />
                    </div>
                    <Select
                        label="Mandal"
                        value={formData.mandal_id}
                        onChange={(e) => setFormData({ ...formData, mandal_id: e.target.value })}
                        options={[
                            { value: '', label: 'Select Mandal' },
                            ...mandals.map(m => ({ value: m.id, label: m.name }))
                        ]}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Total Labs"
                            type="number"
                            value={formData.total_labs}
                            onChange={(e) => setFormData({ ...formData, total_labs: Number(e.target.value) })}
                        />
                        <Input
                            label="Total Seats"
                            type="number"
                            value={formData.total_seats}
                            onChange={(e) => setFormData({ ...formData, total_seats: Number(e.target.value) })}
                        />
                    </div>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.has_cctv}
                            onChange={(e) => setFormData({ ...formData, has_cctv: e.target.checked })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Has CCTV Facilities</span>
                    </label>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting}>create Centre</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
