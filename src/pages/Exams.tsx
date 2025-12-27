import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Search, Edit2, Trash2, Clock, Users, Calendar, Play, Pause } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';

interface Exam {
    id: string;
    name: string;
    duration_minutes: number;
    start_time?: string;
    end_time?: string;
    created_by?: string;
    created_at: string;
    question_count?: number;
    student_count?: number;
    status: 'draft' | 'scheduled' | 'active' | 'completed';
}

export function Exams() {
    const { isSuperAdmin } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [exams, setExams] = useState<Exam[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        duration_minutes: 60,
        start_time: '',
        end_time: '',
    });

    const getExamStatus = (exam: any): 'draft' | 'scheduled' | 'active' | 'completed' => {
        const now = new Date();
        if (!exam.start_time) return 'draft';

        const startTime = new Date(exam.start_time);
        const endTime = exam.end_time ? new Date(exam.end_time) : null;

        if (endTime && now > endTime) return 'completed';
        if (now >= startTime && (!endTime || now <= endTime)) return 'active';
        if (now < startTime) return 'scheduled';
        return 'draft';
    };

    const fetchExams = useCallback(async () => {
        try {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch question counts
            const { data: questions } = await supabase
                .from('questions')
                .select('exam_id');

            // Fetch student assignment counts
            const { data: assignments } = await supabase
                .from('exam_assignments')
                .select('exam_id');

            const enrichedExams = (data || []).map(exam => ({
                ...exam,
                status: getExamStatus(exam),
                question_count: (questions || []).filter(q => q.exam_id === exam.id).length,
                student_count: (assignments || []).filter(a => a.exam_id === exam.id).length,
            }));

            setExams(enrichedExams);
        } catch (error) {
            console.error('Error fetching exams:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || exam.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const resetForm = () => {
        setFormData({
            name: '',
            duration_minutes: 60,
            start_time: '',
            end_time: '',
        });
    };

    const handleCreate = async () => {
        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('exams')
                .insert({
                    name: formData.name,
                    duration_minutes: formData.duration_minutes,
                    start_time: formData.start_time || null,
                    end_time: formData.end_time || null,
                });

            if (error) throw error;

            setIsCreateModalOpen(false);
            resetForm();
            fetchExams();
        } catch (error) {
            console.error('Error creating exam:', error);
            alert('Failed to create exam');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedExam) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('exams')
                .update({
                    name: formData.name,
                    duration_minutes: formData.duration_minutes,
                    start_time: formData.start_time || null,
                    end_time: formData.end_time || null,
                })
                .eq('id', selectedExam.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setSelectedExam(null);
            resetForm();
            fetchExams();
        } catch (error) {
            console.error('Error updating exam:', error);
            alert('Failed to update exam');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedExam) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', selectedExam.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setSelectedExam(null);
            fetchExams();
        } catch (error) {
            console.error('Error deleting exam:', error);
            alert('Failed to delete exam');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (exam: Exam) => {
        setSelectedExam(exam);
        setFormData({
            name: exam.name || '',
            duration_minutes: exam.duration_minutes || 60,
            start_time: exam.start_time ? new Date(exam.start_time).toISOString().slice(0, 16) : '',
            end_time: exam.end_time ? new Date(exam.end_time).toISOString().slice(0, 16) : '',
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (exam: Exam) => {
        setSelectedExam(exam);
        setIsDeleteModalOpen(true);
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'scheduled': return 'info';
            case 'completed': return 'default';
            case 'draft': return 'warning';
            default: return 'default';
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Exam',
            render: (item: Exam) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="font-medium text-surface-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-surface-500">
                            {item.duration_minutes} minutes
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (item: Exam) => (
                <Badge variant={getStatusBadgeVariant(item.status)} dot>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Badge>
            ),
        },
        {
            key: 'schedule',
            header: 'Schedule',
            render: (item: Exam) => (
                <div className="text-sm">
                    {item.start_time ? (
                        <div className="flex items-center gap-1 text-surface-600 dark:text-surface-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(item.start_time).toLocaleDateString()}
                            <span className="text-surface-400">
                                {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ) : (
                        <span className="text-surface-400">Not scheduled</span>
                    )}
                </div>
            ),
        },
        {
            key: 'questions',
            header: 'Questions',
            render: (item: Exam) => (
                <span className="text-surface-600 dark:text-surface-400">
                    {item.question_count || 0}
                </span>
            ),
        },
        {
            key: 'students',
            header: 'Students',
            render: (item: Exam) => (
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-surface-400" />
                    <span>{item.student_count || 0}</span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: Exam) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                        }}
                        disabled={item.status === 'active'}
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
                        disabled={item.status === 'active'}
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                        Exams Management
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Create and manage examination schedules
                    </p>
                </div>
                <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    Create Exam
                </Button>
            </div>

            {/* Filters */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search exams..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            options={[
                                { value: '', label: 'All Status' },
                                { value: 'draft', label: 'Draft' },
                                { value: 'scheduled', label: 'Scheduled' },
                                { value: 'active', label: 'Active' },
                                { value: 'completed', label: 'Completed' },
                            ]}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {exams.length}
                    </p>
                    <p className="text-sm text-surface-500">Total Exams</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                        {exams.filter(e => e.status === 'active').length}
                    </p>
                    <p className="text-sm text-surface-500">Active</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                        {exams.filter(e => e.status === 'scheduled').length}
                    </p>
                    <p className="text-sm text-surface-500">Scheduled</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-400">
                        {exams.filter(e => e.status === 'completed').length}
                    </p>
                    <p className="text-sm text-surface-500">Completed</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={filteredExams}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No exams found"
            />

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title="Create New Exam"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting}>
                            Create Exam
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Exam Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Mathematics Final Exam"
                        required
                    />
                    <Input
                        label="Duration (minutes)"
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                        min={1}
                        required
                    />
                    <Input
                        label="Start Time (optional)"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                    <Input
                        label="End Time (optional)"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedExam(null);
                    resetForm();
                }}
                title="Edit Exam"
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
                        label="Exam Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Duration (minutes)"
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                        min={1}
                        required
                    />
                    <Input
                        label="Start Time"
                        type="datetime-local"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                    <Input
                        label="End Time"
                        type="datetime-local"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedExam(null);
                }}
                onConfirm={handleDelete}
                title="Delete Exam"
                message={`Are you sure you want to delete "${selectedExam?.name}"? This will also delete all questions and assignments.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isSubmitting}
            />
        </div>
    );
}
