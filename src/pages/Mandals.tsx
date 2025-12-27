import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, AlertTriangle, Building2, ChevronRight, ChevronLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';

interface Mandal {
    id: string;
    name: string;
    district_id: string;
    district_name?: string;
    centre_count: number;
    active_exams: number;
    alert_count: number;
}

interface District {
    id: string;
    name: string;
}

export function Mandals() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isSuperAdmin, isDistrictLevel, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [mandals, setMandals] = useState<Mandal[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [districtName, setDistrictName] = useState<string>('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedMandal, setSelectedMandal] = useState<Mandal | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        district_id: '',
    });

    const districtFilter = searchParams.get('district') || scope.districtId;

    const fetchDistricts = useCallback(async () => {
        let query = supabase.from('districts').select('id, name').order('name');

        // If not super admin, only show accessible districts
        if (!isSuperAdmin && scope.districtId) {
            query = query.eq('id', scope.districtId);
        }

        const { data } = await query;
        setDistricts(data || []);
    }, [isSuperAdmin, scope]);

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
        fetchDistricts();
        fetchMandals();
    }, [fetchDistricts, fetchMandals]);

    // Set default district_id in form when districtFilter changes
    useEffect(() => {
        if (districtFilter && !formData.district_id) {
            setFormData(prev => ({ ...prev, district_id: districtFilter }));
        }
    }, [districtFilter]);

    const resetForm = () => {
        setFormData({
            name: '',
            district_id: districtFilter || '',
        });
    };

    const handleCreate = async () => {
        if (!formData.name.trim() || !formData.district_id) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('mandals')
                .insert({
                    name: formData.name.trim(),
                    district_id: formData.district_id,
                });

            if (error) throw error;

            setIsCreateModalOpen(false);
            resetForm();
            fetchMandals();
        } catch (error) {
            console.error('Error creating mandal:', error);
            alert('Failed to create mandal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedMandal || !formData.name.trim() || !formData.district_id) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('mandals')
                .update({
                    name: formData.name.trim(),
                    district_id: formData.district_id,
                })
                .eq('id', selectedMandal.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setSelectedMandal(null);
            resetForm();
            fetchMandals();
        } catch (error) {
            console.error('Error updating mandal:', error);
            alert('Failed to update mandal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedMandal) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('mandals')
                .delete()
                .eq('id', selectedMandal.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setSelectedMandal(null);
            fetchMandals();
        } catch (error) {
            console.error('Error deleting mandal:', error);
            alert('Failed to delete mandal. It may have associated centres.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (mandal: Mandal) => {
        setSelectedMandal(mandal);
        setFormData({
            name: mandal.name,
            district_id: mandal.district_id,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (mandal: Mandal) => {
        setSelectedMandal(mandal);
        setIsDeleteModalOpen(true);
    };

    const columns = [
        {
            key: 'name',
            header: 'Mandal',
            render: (item: Mandal) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <span className="font-medium text-surface-900 dark:text-white">{item.name}</span>
                        {!districtFilter && (
                            <p className="text-xs text-surface-500">{item.district_name}</p>
                        )}
                    </div>
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
            header: 'Actions',
            render: (item: Mandal) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                        }}
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(item);
                        }}
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/centres?mandal=${item.id}`);
                        }}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                        View Centres
                    </Button>
                </div>
            ),
        },
    ];

    const districtOptions = districts.map(d => ({ value: d.id, label: d.name }));

    return (
        <div className="space-y-6">
            {/* Header with back button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    {districtFilter && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/districts')}
                            leftIcon={<ChevronLeft className="w-4 h-4" />}
                        >
                            Back to Districts
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                            Mandals
                            {districtName && <span className="text-surface-500 font-normal"> / {districtName}</span>}
                        </h1>
                        <p className="text-surface-500 dark:text-surface-400">
                            Manage mandal administrative areas
                        </p>
                    </div>
                </div>
                {(isSuperAdmin || isDistrictLevel) && (
                    <Button
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                    >
                        Add Mandal
                    </Button>
                )}
            </div>

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

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title="Add New Mandal"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting}>
                            Create Mandal
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Mandal Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter mandal name"
                        required
                    />
                    <Select
                        label="District"
                        options={[
                            { value: '', label: 'Select District' },
                            ...districtOptions,
                        ]}
                        value={formData.district_id}
                        onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedMandal(null);
                    resetForm();
                }}
                title="Edit Mandal"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit} isLoading={isSubmitting}>
                            Save Changes
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Mandal Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter mandal name"
                        required
                    />
                    <Select
                        label="District"
                        options={[
                            { value: '', label: 'Select District' },
                            ...districtOptions,
                        ]}
                        value={formData.district_id}
                        onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedMandal(null);
                }}
                onConfirm={handleDelete}
                title="Delete Mandal"
                message={`Are you sure you want to delete "${selectedMandal?.name}"? This will also delete all associated centres. This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isSubmitting}
            />
        </div>
    );
}
