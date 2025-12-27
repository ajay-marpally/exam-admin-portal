import React, { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Plus, Search, Edit2, Trash2, Shield, MapPin, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    district_id?: string;
    mandal_id?: string;
    centre_id?: string;
    district_name?: string;
    mandal_name?: string;
    centre_name?: string;
    created_at: string;
}

interface District {
    id: string;
    name: string;
}

interface Mandal {
    id: string;
    name: string;
    district_id: string;
}

interface Centre {
    id: string;
    name: string;
    mandal_id: string;
}

const ROLES = [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'DISTRICT_IN_CHARGE', label: 'District In-Charge' },
    { value: 'MANDAL_IN_CHARGE', label: 'Mandal In-Charge' },
    { value: 'CENTRE_IN_CHARGE', label: 'Centre In-Charge' },
];

export function Users() {
    const { user: currentUser } = useAuth();
    const { isSuperAdmin } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [mandals, setMandals] = useState<Mandal[]>([]);
    const [centres, setCentres] = useState<Centre[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'CENTRE_IN_CHARGE',
        district_id: '',
        mandal_id: '',
        centre_id: '',
        is_active: true,
    });

    const fetchGeographicData = useCallback(async () => {
        const [districtsRes, mandalsRes, centresRes] = await Promise.all([
            supabase.from('districts').select('id, name'),
            supabase.from('mandals').select('id, name, district_id'),
            supabase.from('exam_centres').select('id, name, mandal_id'),
        ]);

        setDistricts(districtsRes.data || []);
        setMandals(mandalsRes.data || []);
        setCentres(centresRes.data || []);
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (roleFilter) {
                query = query.eq('role', roleFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Enrich with geographic names
            const enrichedUsers = (data || []).map(user => {
                const district = districts.find(d => d.id === user.district_id);
                const mandal = mandals.find(m => m.id === user.mandal_id);
                const centre = centres.find(c => c.id === user.centre_id);

                return {
                    ...user,
                    district_name: district?.name,
                    mandal_name: mandal?.name,
                    centre_name: centre?.name,
                };
            });

            setUsers(enrichedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setIsLoading(false);
        }
    }, [roleFilter, districts, mandals, centres]);

    useEffect(() => {
        fetchGeographicData();
    }, [fetchGeographicData]);

    useEffect(() => {
        if (districts.length > 0) {
            fetchUsers();
        }
    }, [fetchUsers, districts]);

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'CENTRE_IN_CHARGE',
            district_id: '',
            mandal_id: '',
            centre_id: '',
            is_active: true,
        });
    };

    const handleCreate = async () => {
        try {
            setIsSubmitting(true);

            // Create auth user first
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: formData.email,
                password: formData.password,
                email_confirm: true,
            });

            if (authError) {
                // Fallback: Just create in users table with random UUID
                const userId = crypto.randomUUID();
                const { error } = await supabase
                    .from('users')
                    .insert({
                        id: userId,
                        name: formData.name,
                        email: formData.email,
                        role: formData.role,
                        district_id: formData.district_id || null,
                        mandal_id: formData.mandal_id || null,
                        centre_id: formData.centre_id || null,
                        is_active: formData.is_active,
                    });

                if (error) throw error;
            } else if (authData.user) {
                // Create user profile
                const { error } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        name: formData.name,
                        email: formData.email,
                        role: formData.role,
                        district_id: formData.district_id || null,
                        mandal_id: formData.mandal_id || null,
                        centre_id: formData.centre_id || null,
                        is_active: formData.is_active,
                    });

                if (error) throw error;
            }

            setIsCreateModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Failed to create user. Note: Admin API requires service role key.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedUser) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('users')
                .update({
                    name: formData.name,
                    role: formData.role,
                    district_id: formData.district_id || null,
                    mandal_id: formData.mandal_id || null,
                    centre_id: formData.centre_id || null,
                    is_active: formData.is_active,
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setSelectedUser(null);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', selectedUser.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user: AdminUser) => {
        setSelectedUser(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'CENTRE_IN_CHARGE',
            district_id: user.district_id || '',
            mandal_id: user.mandal_id || '',
            centre_id: user.centre_id || '',
            is_active: user.is_active ?? true,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (user: AdminUser) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'danger';
            case 'DISTRICT_IN_CHARGE': return 'warning';
            case 'MANDAL_IN_CHARGE': return 'info';
            case 'CENTRE_IN_CHARGE': return 'success';
            default: return 'default';
        }
    };

    const filteredMandals = mandals.filter(m => !formData.district_id || m.district_id === formData.district_id);
    const filteredCentres = centres.filter(c => !formData.mandal_id || c.mandal_id === formData.mandal_id);

    const columns = [
        {
            key: 'name',
            header: 'User',
            render: (item: AdminUser) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                            {item.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div>
                        <p className="font-medium text-surface-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-surface-500">{item.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            render: (item: AdminUser) => (
                <Badge variant={getRoleBadgeVariant(item.role)}>
                    {ROLES.find(r => r.value === item.role)?.label || item.role}
                </Badge>
            ),
        },
        {
            key: 'scope',
            header: 'Scope',
            render: (item: AdminUser) => (
                <div className="text-sm text-surface-600 dark:text-surface-400">
                    {item.role === 'SUPER_ADMIN' ? (
                        <span className="flex items-center gap-1">
                            <Shield className="w-4 h-4" /> All Access
                        </span>
                    ) : item.district_name ? (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" /> {item.district_name}
                            {item.mandal_name && ` / ${item.mandal_name}`}
                            {item.centre_name && ` / ${item.centre_name}`}
                        </span>
                    ) : (
                        <span className="text-surface-400">Not assigned</span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (item: AdminUser) => (
                <Badge variant={item.is_active ? 'success' : 'danger'} dot>
                    {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: AdminUser) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                        }}
                        disabled={item.id === currentUser?.id}
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
                        disabled={item.id === currentUser?.id}
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                </div>
            ),
        },
    ];

    if (!isSuperAdmin) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Card padding="lg" className="text-center max-w-md">
                    <Shield className="w-12 h-12 text-surface-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
                        Access Restricted
                    </h2>
                    <p className="text-surface-500 dark:text-surface-400">
                        Only Super Admins can access user management.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                        User Management
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Manage admin users and their access levels
                    </p>
                </div>
                <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    Add User
                </Button>
            </div>

            {/* Filters */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            options={[
                                { value: '', label: 'All Roles' },
                                ...ROLES,
                            ]}
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {users.length}
                    </p>
                    <p className="text-sm text-surface-500">Total Users</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-red-600">
                        {users.filter(u => u.role === 'SUPER_ADMIN').length}
                    </p>
                    <p className="text-sm text-surface-500">Super Admins</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-amber-600">
                        {users.filter(u => u.role === 'DISTRICT_IN_CHARGE').length}
                    </p>
                    <p className="text-sm text-surface-500">District Officers</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                        {users.filter(u => u.is_active).length}
                    </p>
                    <p className="text-sm text-surface-500">Active</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No users found"
            />

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title="Add New User"
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting}>
                            Create User
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <Input
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min 6 characters"
                        required
                    />
                    <Select
                        label="Role"
                        options={ROLES}
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    />

                    {formData.role !== 'SUPER_ADMIN' && (
                        <>
                            <Select
                                label="District"
                                options={[
                                    { value: '', label: 'Select District' },
                                    ...districts.map(d => ({ value: d.id, label: d.name })),
                                ]}
                                value={formData.district_id}
                                onChange={(e) => setFormData({ ...formData, district_id: e.target.value, mandal_id: '', centre_id: '' })}
                            />

                            {formData.role !== 'DISTRICT_IN_CHARGE' && (
                                <Select
                                    label="Mandal"
                                    options={[
                                        { value: '', label: 'Select Mandal' },
                                        ...filteredMandals.map(m => ({ value: m.id, label: m.name })),
                                    ]}
                                    value={formData.mandal_id}
                                    onChange={(e) => setFormData({ ...formData, mandal_id: e.target.value, centre_id: '' })}
                                    disabled={!formData.district_id}
                                />
                            )}

                            {formData.role === 'CENTRE_IN_CHARGE' && (
                                <Select
                                    label="Centre"
                                    options={[
                                        { value: '', label: 'Select Centre' },
                                        ...filteredCentres.map(c => ({ value: c.id, label: c.name })),
                                    ]}
                                    value={formData.centre_id}
                                    onChange={(e) => setFormData({ ...formData, centre_id: e.target.value })}
                                    disabled={!formData.mandal_id}
                                />
                            )}
                        </>
                    )}
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                    resetForm();
                }}
                title="Edit User"
                size="lg"
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
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        disabled
                    />
                    <Select
                        label="Role"
                        options={ROLES}
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    />

                    {formData.role !== 'SUPER_ADMIN' && (
                        <>
                            <Select
                                label="District"
                                options={[
                                    { value: '', label: 'Select District' },
                                    ...districts.map(d => ({ value: d.id, label: d.name })),
                                ]}
                                value={formData.district_id}
                                onChange={(e) => setFormData({ ...formData, district_id: e.target.value, mandal_id: '', centre_id: '' })}
                            />

                            {formData.role !== 'DISTRICT_IN_CHARGE' && (
                                <Select
                                    label="Mandal"
                                    options={[
                                        { value: '', label: 'Select Mandal' },
                                        ...filteredMandals.map(m => ({ value: m.id, label: m.name })),
                                    ]}
                                    value={formData.mandal_id}
                                    onChange={(e) => setFormData({ ...formData, mandal_id: e.target.value, centre_id: '' })}
                                    disabled={!formData.district_id}
                                />
                            )}

                            {formData.role === 'CENTRE_IN_CHARGE' && (
                                <Select
                                    label="Centre"
                                    options={[
                                        { value: '', label: 'Select Centre' },
                                        ...filteredCentres.map(c => ({ value: c.id, label: c.name })),
                                    ]}
                                    value={formData.centre_id}
                                    onChange={(e) => setFormData({ ...formData, centre_id: e.target.value })}
                                    disabled={!formData.mandal_id}
                                />
                            )}
                        </>
                    )}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded border-surface-300"
                        />
                        <label htmlFor="is_active" className="text-sm text-surface-700 dark:text-surface-300">
                            Active User
                        </label>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedUser(null);
                }}
                onConfirm={handleDelete}
                title="Delete User"
                message={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isSubmitting}
            />
        </div>
    );
}
