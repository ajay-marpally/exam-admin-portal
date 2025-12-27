import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileQuestion, Plus, Edit2, Trash2, ChevronLeft, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal, ConfirmModal } from '../components/ui/Modal';

interface Question {
    id: string;
    exam_id: string;
    exam_name?: string;
    question_text: string;
    options: string[]; // JSONB stored as array of strings
    correct_option: number; // 0-indexed
    created_at: string;
}

interface Exam {
    id: string;
    name: string;
}

export function Questions() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const examIdFilter = searchParams.get('exam');

    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamName, setSelectedExamName] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        exam_id: '',
        question_text: '',
        options: ['', '', '', ''], // 4 options by default
        correct_option: 0,
    });

    const fetchExams = useCallback(async () => {
        const { data } = await supabase
            .from('exams')
            .select('id, name')
            .order('created_at', { ascending: false });
        setExams(data || []);

        // Set exam name if filtered
        if (examIdFilter && data) {
            const exam = data.find(e => e.id === examIdFilter);
            if (exam) setSelectedExamName(exam.name);
        }
    }, [examIdFilter]);

    const fetchQuestions = useCallback(async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('questions')
                .select('*')
                .order('created_at', { ascending: false });

            if (examIdFilter) {
                query = query.eq('exam_id', examIdFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Enrich with exam names
            const enrichedQuestions: Question[] = (data || []).map((q: any) => {
                const exam = exams.find(e => e.id === q.exam_id);
                return {
                    ...q,
                    exam_name: exam?.name,
                    options: Array.isArray(q.options) ? q.options : [],
                };
            });

            setQuestions(enrichedQuestions);
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setIsLoading(false);
        }
    }, [examIdFilter, exams]);

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    useEffect(() => {
        if (exams.length > 0) {
            fetchQuestions();
        }
    }, [fetchQuestions, exams]);

    const resetForm = () => {
        setFormData({
            exam_id: examIdFilter || '',
            question_text: '',
            options: ['', '', '', ''],
            correct_option: 0,
        });
    };

    const handleCreate = async () => {
        if (!formData.exam_id || !formData.question_text.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        // Validate options (at least 2 non-empty)
        const validOptions = formData.options.filter(o => o.trim());
        if (validOptions.length < 2) {
            alert('Please provide at least 2 options');
            return;
        }

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('questions')
                .insert({
                    exam_id: formData.exam_id,
                    question_text: formData.question_text.trim(),
                    options: validOptions, // Store as JSONB array
                    correct_option: formData.correct_option,
                });

            if (error) throw error;

            setIsCreateModalOpen(false);
            resetForm();
            fetchQuestions();
        } catch (error) {
            console.error('Error creating question:', error);
            alert('Failed to create question');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedQuestion || !formData.question_text.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        const validOptions = formData.options.filter(o => o.trim());
        if (validOptions.length < 2) {
            alert('Please provide at least 2 options');
            return;
        }

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('questions')
                .update({
                    exam_id: formData.exam_id,
                    question_text: formData.question_text.trim(),
                    options: validOptions,
                    correct_option: formData.correct_option,
                })
                .eq('id', selectedQuestion.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setSelectedQuestion(null);
            resetForm();
            fetchQuestions();
        } catch (error) {
            console.error('Error updating question:', error);
            alert('Failed to update question');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedQuestion) return;

        try {
            setIsSubmitting(true);

            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', selectedQuestion.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setSelectedQuestion(null);
            fetchQuestions();
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Failed to delete question');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (question: Question) => {
        setSelectedQuestion(question);
        // Ensure 4 option slots, fill empty if needed
        const options = [...question.options];
        while (options.length < 4) options.push('');
        setFormData({
            exam_id: question.exam_id,
            question_text: question.question_text,
            options,
            correct_option: question.correct_option,
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (question: Question) => {
        setSelectedQuestion(question);
        setIsDeleteModalOpen(true);
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const addOption = () => {
        if (formData.options.length < 6) {
            setFormData({ ...formData, options: [...formData.options, ''] });
        }
    };

    const removeOption = (index: number) => {
        if (formData.options.length > 2) {
            const newOptions = formData.options.filter((_, i) => i !== index);
            // Adjust correct_option if needed
            let newCorrect = formData.correct_option;
            if (index === formData.correct_option) {
                newCorrect = 0;
            } else if (index < formData.correct_option) {
                newCorrect = formData.correct_option - 1;
            }
            setFormData({ ...formData, options: newOptions, correct_option: newCorrect });
        }
    };

    const columns = [
        {
            key: 'question',
            header: 'Question',
            render: (item: Question) => (
                <div className="max-w-md">
                    <p className="font-medium text-surface-900 dark:text-white line-clamp-2">
                        {item.question_text}
                    </p>
                    {!examIdFilter && item.exam_name && (
                        <p className="text-xs text-surface-500 mt-1">Exam: {item.exam_name}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'options',
            header: 'Options',
            render: (item: Question) => (
                <div className="text-sm space-y-1">
                    {item.options.slice(0, 4).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            {idx === item.correct_option ? (
                                <Check className="w-3 h-3 text-green-500" />
                            ) : (
                                <span className="w-3 h-3 text-surface-400 text-xs">{idx + 1}.</span>
                            )}
                            <span className={idx === item.correct_option ? 'text-green-600 dark:text-green-400 font-medium' : 'text-surface-600 dark:text-surface-400'}>
                                {opt.length > 30 ? opt.substring(0, 30) + '...' : opt}
                            </span>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            key: 'correct',
            header: 'Answer',
            render: (item: Question) => (
                <Badge variant="success">
                    Option {item.correct_option + 1}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: Question) => (
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

    const examOptions = [
        { value: '', label: 'Select Exam' },
        ...exams.map(e => ({ value: e.id, label: e.name })),
    ];

    const FormContent = () => (
        <div className="space-y-4">
            <Select
                label="Exam"
                options={examOptions}
                value={formData.exam_id}
                onChange={(e) => setFormData({ ...formData, exam_id: e.target.value })}
            />

            <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    placeholder="Enter your question..."
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                        Options <span className="text-red-500">*</span>
                    </label>
                    {formData.options.length < 6 && (
                        <Button variant="ghost" size="sm" onClick={addOption}>
                            <Plus className="w-4 h-4 mr-1" /> Add Option
                        </Button>
                    )}
                </div>
                <div className="space-y-2">
                    {formData.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, correct_option: idx })}
                                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${formData.correct_option === idx
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-surface-300 dark:border-surface-600 text-surface-400 hover:border-green-400'
                                    }`}
                                title={formData.correct_option === idx ? 'Correct answer' : 'Mark as correct'}
                            >
                                {formData.correct_option === idx ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs">{idx + 1}</span>
                                )}
                            </button>
                            <Input
                                value={option}
                                onChange={(e) => updateOption(idx, e.target.value)}
                                placeholder={`Option ${idx + 1}`}
                                className="flex-1"
                            />
                            {formData.options.length > 2 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeOption(idx)}
                                >
                                    <X className="w-4 h-4 text-red-400" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-surface-500 mt-2">
                    Click the circle to mark the correct answer (green = correct)
                </p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    {examIdFilter && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/exams')}
                            leftIcon={<ChevronLeft className="w-4 h-4" />}
                        >
                            Back to Exams
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
                            Questions
                            {selectedExamName && (
                                <span className="text-surface-500 font-normal"> / {selectedExamName}</span>
                            )}
                        </h1>
                        <p className="text-surface-500 dark:text-surface-400">
                            Manage exam questions and answers
                        </p>
                    </div>
                </div>
                <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                        resetForm();
                        if (examIdFilter) {
                            setFormData(prev => ({ ...prev, exam_id: examIdFilter }));
                        }
                        setIsCreateModalOpen(true);
                    }}
                >
                    Add Question
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {questions.length}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Total Questions</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {new Set(questions.map(q => q.exam_id)).size}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Exams</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {Math.round(questions.reduce((sum, q) => sum + q.options.length, 0) / (questions.length || 1))}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">Avg Options/Question</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={questions}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No questions found. Add your first question!"
            />

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title="Add New Question"
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting}>
                            Create Question
                        </Button>
                    </>
                }
            >
                <FormContent />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedQuestion(null);
                    resetForm();
                }}
                title="Edit Question"
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
                <FormContent />
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedQuestion(null);
                }}
                onConfirm={handleDelete}
                title="Delete Question"
                message={`Are you sure you want to delete this question? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                isLoading={isSubmitting}
            />
        </div>
    );
}
