import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertTriangle, Building2, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card, CardHeader } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';

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

interface State {
    id: string;
    name: string;
}

// All States and Union Territories of India
const INDIAN_STATES = [
    { id: 'AP', name: 'Andhra Pradesh' },
    { id: 'AR', name: 'Arunachal Pradesh' },
    { id: 'AS', name: 'Assam' },
    { id: 'BR', name: 'Bihar' },
    { id: 'CG', name: 'Chhattisgarh' },
    { id: 'GA', name: 'Goa' },
    { id: 'GJ', name: 'Gujarat' },
    { id: 'HR', name: 'Haryana' },
    { id: 'HP', name: 'Himachal Pradesh' },
    { id: 'JH', name: 'Jharkhand' },
    { id: 'KA', name: 'Karnataka' },
    { id: 'KL', name: 'Kerala' },
    { id: 'MP', name: 'Madhya Pradesh' },
    { id: 'MH', name: 'Maharashtra' },
    { id: 'MN', name: 'Manipur' },
    { id: 'ML', name: 'Meghalaya' },
    { id: 'MZ', name: 'Mizoram' },
    { id: 'NL', name: 'Nagaland' },
    { id: 'OD', name: 'Odisha' },
    { id: 'PB', name: 'Punjab' },
    { id: 'RJ', name: 'Rajasthan' },
    { id: 'SK', name: 'Sikkim' },
    { id: 'TN', name: 'Tamil Nadu' },
    { id: 'TS', name: 'Telangana' },
    { id: 'TR', name: 'Tripura' },
    { id: 'UP', name: 'Uttar Pradesh' },
    { id: 'UK', name: 'Uttarakhand' },
    { id: 'WB', name: 'West Bengal' },
    // Union Territories
    { id: 'AN', name: 'Andaman and Nicobar Islands' },
    { id: 'CH', name: 'Chandigarh' },
    { id: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
    { id: 'DL', name: 'Delhi' },
    { id: 'JK', name: 'Jammu and Kashmir' },
    { id: 'LA', name: 'Ladakh' },
    { id: 'LD', name: 'Lakshadweep' },
    { id: 'PY', name: 'Puducherry' },
];

export function Districts() {
    const navigate = useNavigate();
    const { isSuperAdmin, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [districts, setDistricts] = useState<District[]>([]);
    const [states, setStates] = useState<State[]>([]);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        state_id: '',
    });

    const fetchStates = useCallback(() => {
        // Use hardcoded Indian states instead of database query
        setStates(INDIAN_STATES);
    }, []);

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
        fetchStates();
        fetchDistricts();
    }, [fetchStates, fetchDistricts]);

    const resetForm = () => {
        setFormData({ name: '', state_id: '' });
    };

    const handleCreate = async () => {
        if (!formData.name.trim() || !formData.state_id) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('districts')
                .insert({
                    name: formData.name.trim(),
                    state_id: formData.state_id,
                });

            if (error) throw error;

            setIsCreateModalOpen(false);
            resetForm();
            fetchDistricts();
        } catch (error) {
            console.error('Error creating district:', error);
            alert('Failed to create district');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedDistrict || !formData.name.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('districts')
                .update({
                    name: formData.name.trim(),
                    state_id: formData.state_id,
                })
                .eq('id', selectedDistrict.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setSelectedDistrict(null);
            resetForm();
            fetchDistricts();
        } catch (error) {
            console.error('Error updating district:', error);
            alert('Failed to update district');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedDistrict) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('districts')
                .delete()
                .eq('id', selectedDistrict.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setSelectedDistrict(null);
            fetchDistricts();
        } catch (error) {
            console.error('Error deleting district:', error);
            alert('Failed to delete district. It may have associated mandals.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (district: District) => {
        setSelectedDistrict(district);
        setFormData({
            name: district.name,
            state_id: district.state_id,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (district: District) => {
        setSelectedDistrict(district);
        setIsDeleteModalOpen(true);
    };

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
            header: 'Actions',
            render: (item: District) => (
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
                            navigate(`/mandals?district=${item.id}`);
                        }}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                        View
                    </Button>
                </div>
            ),
        },
    ];

    const stateOptions = states.map(s => ({ value: s.id, label: s.name }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                        Districts
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Manage district administrative areas
                    </p>
                </div>
                {isSuperAdmin && (
                    <Button
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                    >
                        Add District
                    </Button>
                )}
            </div>

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

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title="Add New District"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting}>
                            Create District
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="District Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter district name"
                        required
                    />
                    <Select
                        label="State"
                        options={[
                            { value: '', label: 'Select State' },
                            ...stateOptions,
                        ]}
                        value={formData.state_id}
                        onChange={(e) => setFormData({ ...formData, state_id: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedDistrict(null);
                    resetForm();
                }}
                title="Edit District"
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
                        label="District Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter district name"
                        required
                    />
                    <Select
                        label="State"
                        options={[
                            { value: '', label: 'Select State' },
                            ...stateOptions,
                        ]}
                        value={formData.state_id}
                        onChange={(e) => setFormData({ ...formData, state_id: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedDistrict(null);
                }}
                onConfirm={handleDelete}
                title="Delete District"
                message={`Are you sure you want to delete "${selectedDistrict?.name}"? This will also delete all associated mandals and centres. This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isSubmitting}
            />
        </div>
    );
}
