import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Plus, Search, Edit2, Trash2, Upload, X, FileUp, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';

interface Student {
    id: string;
    user_id: string;
    hall_ticket: string;
    name?: string;
    email?: string;
    photo_url?: string;
    exam_center?: string;
    centre_name?: string;
    created_at: string;
}

interface ExamCentre {
    id: string;
    centre_code: string;
    name: string;
}

export function Students() {
    const { isSuperAdmin, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [centres, setCentres] = useState<ExamCentre[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCentre, setSelectedCentre] = useState<string>('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    // Form state
    const [formData, setFormData] = useState({
        hall_ticket: '',
        name: '',
        email: '',
        photo_url: '',
        exam_center: '',
    });

    const fetchCentres = useCallback(async () => {
        const { data } = await supabase
            .from('exam_centres')
            .select('id, centre_code, name')
            .eq('is_active', true);
        setCentres(data || []);
    }, []);

    const fetchStudents = useCallback(async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('students')
                .select('*');

            if (selectedCentre) {
                query = query.eq('exam_center', selectedCentre);
            }

            if (!isSuperAdmin && scope.centreId) {
                // Get the centre code for scoping
                const { data: centreData } = await supabase
                    .from('exam_centres')
                    .select('centre_code')
                    .eq('id', scope.centreId)
                    .single();

                if (centreData) {
                    query = query.eq('exam_center', centreData.centre_code);
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            // Enrich with centre names
            const enrichedStudents = await Promise.all((data || []).map(async (student) => {
                if (student.exam_center) {
                    const { data: centre } = await supabase
                        .from('exam_centres')
                        .select('name')
                        .eq('centre_code', student.exam_center)
                        .single();
                    return { ...student, centre_name: centre?.name };
                }
                return student;
            }));

            setStudents(enrichedStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, scope, selectedCentre]);

    useEffect(() => {
        fetchCentres();
        fetchStudents();
    }, [fetchCentres, fetchStudents]);

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.hall_ticket?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const resetForm = () => {
        setFormData({
            hall_ticket: '',
            name: '',
            email: '',
            photo_url: '',
            exam_center: '',
        });
    };

    const handleCreate = async () => {
        if (!formData.hall_ticket.trim() || !formData.name.trim() || !formData.email.trim()) {
            alert('Please fill in hall ticket, name, and email');
            return;
        }

        try {
            setIsSubmitting(true);

            // First create a user record (required FK for students table)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert({
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    role: 'STUDENT',
                    is_active: true,
                })
                .select()
                .single();

            if (userError) {
                console.error('Error creating user:', userError);
                throw new Error(`Failed to create user: ${userError.message}`);
            }

            // Now create the student record with the user_id FK
            const { error: studentError } = await supabase
                .from('students')
                .insert({
                    user_id: userData.id,
                    hall_ticket: formData.hall_ticket.trim(),
                    photo_url: formData.photo_url || null,
                    exam_center: formData.exam_center || null,
                });

            if (studentError) {
                // Rollback: delete the user if student creation fails
                await supabase.from('users').delete().eq('id', userData.id);
                throw new Error(`Failed to create student: ${studentError.message}`);
            }

            setIsCreateModalOpen(false);
            resetForm();
            fetchStudents();
        } catch (error: any) {
            console.error('Error creating student:', error);
            alert(error.message || 'Failed to create student');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedStudent) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('students')
                .update({
                    hall_ticket: formData.hall_ticket,
                    photo_url: formData.photo_url || null,
                    exam_center: formData.exam_center || null,
                })
                .eq('id', selectedStudent.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setSelectedStudent(null);
            resetForm();
            fetchStudents();
        } catch (error) {
            console.error('Error updating student:', error);
            alert('Failed to update student');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedStudent) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', selectedStudent.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setSelectedStudent(null);
            fetchStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('Failed to delete student');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('student_photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('student_photos').getPublicUrl(fileName);
            // This updates the local form state with the new URL
            setFormData(prev => ({ ...prev, photo_url: data.publicUrl }));
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Failed to upload photo');
        }
    };

    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsSubmitting(true);
            const text = await file.text();
            // Simple logic: split by newline, then comma
            // Expected Header: hall_ticket,name,email,centre_code
            const rows = text.split('\n')
                .map(r => r.trim())
                .filter(r => r && !r.startsWith('hall_ticket')); // Skip header if present

            setUploadProgress({ current: 0, total: rows.length });

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cols = row.split(',').map(s => s.trim());
                if (cols.length < 3) continue; // Basic validation

                const [hall_ticket, name, email, centre_code] = cols;

                try {
                    // 1. Create User
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .insert({
                            name: name,
                            email: email.toLowerCase(),
                            role: 'STUDENT',
                            is_active: true,
                        })
                        .select()
                        .single();

                    if (userError) throw userError;

                    // 2. Create Student
                    const { error: studentError } = await supabase
                        .from('students')
                        .insert({
                            user_id: userData.id,
                            hall_ticket: hall_ticket,
                            exam_center: centre_code || null,
                        });

                    if (studentError) {
                        // Rollback user
                        await supabase.from('users').delete().eq('id', userData.id);
                        throw studentError;
                    }

                    successCount++;
                } catch (e) {
                    console.error(`Failed to import ${hall_ticket}:`, e);
                    failCount++;
                }

                setUploadProgress(prev => ({ ...prev, current: i + 1 }));
            }

            alert(`Import Completed.\nSuccess: ${successCount}\nFailed: ${failCount}`);
            setIsCsvModalOpen(false);
            setUploadProgress({ current: 0, total: 0 });
            fetchStudents();
        } catch (error: any) {
            console.error('CSV Import Error:', error);
            alert('Failed to process CSV file');
        } finally {
            setIsSubmitting(false);
            if (event.target) event.target.value = ''; // Reset input
        }
    };

    const openEditModal = (student: Student) => {
        setSelectedStudent(student);
        setFormData({
            hall_ticket: student.hall_ticket || '',
            name: student.name || '',
            email: student.email || '',
            photo_url: student.photo_url || '',
            exam_center: student.exam_center || '',
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (student: Student) => {
        setSelectedStudent(student);
        setIsDeleteModalOpen(true);
    };

    const columns = [
        {
            key: 'hall_ticket',
            header: 'Hall Ticket',
            render: (item: Student) => (
                <div className="flex items-center gap-3">
                    {item.photo_url ? (
                        <img
                            src={item.photo_url}
                            alt={item.hall_ticket}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                            {item.hall_ticket}
                        </p>
                        {item.name && (
                            <p className="text-xs text-surface-500">{item.name}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'exam_center',
            header: 'Exam Centre',
            render: (item: Student) => (
                <span className="text-surface-600 dark:text-surface-400">
                    {item.centre_name || item.exam_center || '-'}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            render: (item: Student) => (
                <span className="text-surface-500 text-sm">
                    {new Date(item.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: Student) => (
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
                </div>
            ),
        },
    ];

    const centreOptions = [
        { value: '', label: 'All Centres' },
        ...centres.map(c => ({ value: c.centre_code, label: `${c.name} (${c.centre_code})` })),
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                        Students Management
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Manage student records and hall tickets
                    </p>
                </div>
                <div className="flex bg-white dark:bg-surface-800 rounded-lg p-1 gap-1">
                    <Button
                        variant="secondary"
                        leftIcon={<FileUp className="w-4 h-4" />}
                        onClick={() => setIsCsvModalOpen(true)}
                    >
                        Import CSV
                    </Button>
                    <Button
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        Add Student
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by hall ticket, name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="w-full sm:w-64">
                        <Select
                            options={centreOptions}
                            value={selectedCentre}
                            onChange={(e) => setSelectedCentre(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {students.length}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Total Students</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {students.filter(s => s.photo_url).length}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">With Photos</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {new Set(students.map(s => s.exam_center).filter(Boolean)).size}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Centres</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={filteredStudents}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No students found"
            />

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title="Add New Student"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting}>
                            Create Student
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Hall Ticket Number"
                        value={formData.hall_ticket}
                        onChange={(e) => setFormData({ ...formData, hall_ticket: e.target.value })}
                        placeholder="e.g., HT2024001"
                        required
                    />
                    <div className="space-y-2">
                        <Input
                            label="Photo URL (optional)"
                            value={formData.photo_url}
                            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                            placeholder="https://..."
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-primary-50 file:text-primary-700
                                  hover:file:bg-primary-100
                                "
                            />
                        </div>
                    </div>
                    <Select
                        label="Exam Centre"
                        options={[
                            { value: '', label: 'Select Centre' },
                            ...centres.map(c => ({ value: c.centre_code, label: c.name })),
                        ]}
                        value={formData.exam_center}
                        onChange={(e) => setFormData({ ...formData, exam_center: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedStudent(null);
                    resetForm();
                }}
                title="Edit Student"
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
                        label="Hall Ticket Number"
                        value={formData.hall_ticket}
                        onChange={(e) => setFormData({ ...formData, hall_ticket: e.target.value })}
                        required
                    />
                    <div className="space-y-2">
                        <Input
                            label="Photo URL"
                            value={formData.photo_url}
                            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                            placeholder="https://..."
                        />
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="block w-full text-sm text-slate-500
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-primary-50 file:text-primary-700
                                  hover:file:bg-primary-100
                                "
                            />
                        </div>
                    </div>
                    <Select
                        label="Exam Centre"
                        options={[
                            { value: '', label: 'Select Centre' },
                            ...centres.map(c => ({ value: c.centre_code, label: c.name })),
                        ]}
                        value={formData.exam_center}
                        onChange={(e) => setFormData({ ...formData, exam_center: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedStudent(null);
                }}
                onConfirm={handleDelete}
                title="Delete Student"
                message={`Are you sure you want to delete student "${selectedStudent?.hall_ticket}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isSubmitting}
            />

            {/* CSV Import Modal */}
            <Modal
                isOpen={isCsvModalOpen}
                onClose={() => {
                    if (!isSubmitting) setIsCsvModalOpen(false);
                }}
                title="Import Students from CSV"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-semibold mb-2">CSV Format Required:</p>
                        <code className="block bg-black/10 p-2 rounded">
                            hall_ticket, name, email, centre_code
                        </code>
                        <p className="mt-2 text-xs">
                            Note: The first row is assumed to be a header and will be skipped if it starts with "hall_ticket".
                        </p>
                    </div>

                    {isSubmitting ? (
                        <div className="text-center py-8">
                            <Loader className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
                            <p className="text-lg font-medium text-surface-900 dark:text-white">
                                Importing Students...
                            </p>
                            <p className="text-surface-500">
                                Processed {uploadProgress.current} of {uploadProgress.total}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 dark:bg-gray-700">
                                <div
                                    className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                                <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <label className="block">
                                    <span className="sr-only">Choose CSV file</span>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCsvUpload}
                                        className="block w-full text-sm text-slate-500
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-full file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-primary-50 file:text-primary-700
                                          hover:file:bg-primary-100
                                          cursor-pointer
                                        "
                                    />
                                </label>
                                <p className="mt-2 text-xs text-gray-500">
                                    Upload a .csv file containing student records
                                </p>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="ghost" onClick={() => setIsCsvModalOpen(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
