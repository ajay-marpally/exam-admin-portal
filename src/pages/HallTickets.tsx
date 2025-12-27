import React, { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Search, Download, Printer, Eye, Calendar, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';

interface HallTicketData {
    id: string;
    student_id: string;
    hall_ticket: string;
    exam_id: string;
    exam_name?: string;
    centre_code?: string;
    centre_name?: string;
    student_name?: string;
    photo_url?: string;
    generated_at: string;
    is_downloaded: boolean;
}

interface Exam {
    id: string;
    name: string;
}

interface Centre {
    id: string;
    centre_code: string;
    name: string;
}

export function HallTickets() {
    const { isSuperAdmin, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [hallTickets, setHallTickets] = useState<HallTicketData[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [centres, setCentres] = useState<Centre[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [selectedCentre, setSelectedCentre] = useState<string>('');

    // Modal states
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<HallTicketData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate form state
    const [generateForm, setGenerateForm] = useState({
        exam_id: '',
        centre_code: '',
    });

    const fetchExamsAndCentres = useCallback(async () => {
        const [examsRes, centresRes] = await Promise.all([
            supabase.from('exams').select('id, name'),
            supabase.from('exam_centres').select('id, centre_code, name').eq('is_active', true),
        ]);

        setExams(examsRes.data || []);
        setCentres(centresRes.data || []);
    }, []);

    const fetchHallTickets = useCallback(async () => {
        try {
            setIsLoading(true);

            // Fetch students with their exam assignments
            let query = supabase
                .from('students')
                .select(`
                    id,
                    hall_ticket,
                    photo_url,
                    exam_center,
                    created_at
                `);

            if (selectedCentre) {
                query = query.eq('exam_center', selectedCentre);
            }

            const { data: students, error } = await query;
            if (error) throw error;

            // Fetch exam assignments
            const { data: assignments } = await supabase
                .from('exam_assignments')
                .select('student_id, exam_id');

            // Create hall ticket records from students with assignments
            const ticketData: HallTicketData[] = [];

            for (const student of students || []) {
                const studentAssignments = (assignments || []).filter(a => a.student_id === student.id);

                if (studentAssignments.length > 0) {
                    for (const assignment of studentAssignments) {
                        const exam = exams.find(e => e.id === assignment.exam_id);
                        const centre = centres.find(c => c.centre_code === student.exam_center);

                        if (!selectedExam || assignment.exam_id === selectedExam) {
                            ticketData.push({
                                id: `${student.id}-${assignment.exam_id}`,
                                student_id: student.id,
                                hall_ticket: student.hall_ticket,
                                exam_id: assignment.exam_id,
                                exam_name: exam?.name,
                                centre_code: student.exam_center,
                                centre_name: centre?.name,
                                photo_url: student.photo_url,
                                generated_at: student.created_at,
                                is_downloaded: false,
                            });
                        }
                    }
                } else {
                    // Show students without assignments too
                    if (!selectedExam) {
                        const centre = centres.find(c => c.centre_code === student.exam_center);
                        ticketData.push({
                            id: student.id,
                            student_id: student.id,
                            hall_ticket: student.hall_ticket,
                            exam_id: '',
                            exam_name: 'Not Assigned',
                            centre_code: student.exam_center,
                            centre_name: centre?.name,
                            photo_url: student.photo_url,
                            generated_at: student.created_at,
                            is_downloaded: false,
                        });
                    }
                }
            }

            setHallTickets(ticketData);
        } catch (error) {
            console.error('Error fetching hall tickets:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedExam, selectedCentre, exams, centres]);

    useEffect(() => {
        fetchExamsAndCentres();
    }, [fetchExamsAndCentres]);

    useEffect(() => {
        if (exams.length > 0 && centres.length > 0) {
            fetchHallTickets();
        }
    }, [fetchHallTickets, exams, centres]);

    const filteredTickets = hallTickets.filter(ticket => {
        const matchesSearch =
            ticket.hall_ticket?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.student_name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const handleGenerate = async () => {
        try {
            setIsSubmitting(true);

            // Get students for the selected centre
            const { data: students } = await supabase
                .from('students')
                .select('id')
                .eq('exam_center', generateForm.centre_code);

            if (!students || students.length === 0) {
                alert('No students found for this centre');
                return;
            }

            // Create exam assignments for all students
            const assignments = students.map(s => ({
                student_id: s.id,
                exam_id: generateForm.exam_id,
            }));

            const { error } = await supabase
                .from('exam_assignments')
                .upsert(assignments, { onConflict: 'student_id,exam_id' });

            if (error) throw error;

            setIsGenerateModalOpen(false);
            setGenerateForm({ exam_id: '', centre_code: '' });
            fetchHallTickets();
            alert(`Generated hall tickets for ${students.length} students`);
        } catch (error) {
            console.error('Error generating hall tickets:', error);
            alert('Failed to generate hall tickets');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadPDF = (ticket: HallTicketData) => {
        // Create a simple printable hall ticket
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Hall Ticket - ${ticket.hall_ticket}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    .container { max-width: 600px; margin: 0 auto; border: 2px solid #333; padding: 30px; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                    .header h1 { margin: 0; color: #1a365d; }
                    .header p { margin: 5px 0; color: #666; }
                    .content { display: flex; gap: 30px; }
                    .photo { width: 120px; height: 150px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; background: #f5f5f5; }
                    .photo img { max-width: 100%; max-height: 100%; object-fit: cover; }
                    .details { flex: 1; }
                    .field { margin-bottom: 15px; }
                    .field label { font-weight: bold; color: #333; display: block; margin-bottom: 5px; }
                    .field span { color: #555; font-size: 16px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; font-size: 12px; color: #666; }
                    @media print { body { padding: 0; } .container { border: none; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>EXAMINATION HALL TICKET</h1>
                        <p>AI-Proctored Examination System</p>
                    </div>
                    <div class="content">
                        <div class="photo">
                            ${ticket.photo_url ? `<img src="${ticket.photo_url}" alt="Student Photo">` : 'No Photo'}
                        </div>
                        <div class="details">
                            <div class="field">
                                <label>Hall Ticket Number</label>
                                <span>${ticket.hall_ticket}</span>
                            </div>
                            <div class="field">
                                <label>Examination</label>
                                <span>${ticket.exam_name || 'Not Assigned'}</span>
                            </div>
                            <div class="field">
                                <label>Exam Centre</label>
                                <span>${ticket.centre_name || ticket.centre_code || '-'}</span>
                            </div>
                            <div class="field">
                                <label>Centre Code</label>
                                <span>${ticket.centre_code || '-'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is a computer-generated hall ticket. Please carry a valid ID proof.</p>
                        <p>Generated on: ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const openPreviewModal = (ticket: HallTicketData) => {
        setSelectedTicket(ticket);
        setIsPreviewModalOpen(true);
    };

    const columns = [
        {
            key: 'hall_ticket',
            header: 'Hall Ticket',
            render: (item: HallTicketData) => (
                <div className="flex items-center gap-3">
                    {item.photo_url ? (
                        <img
                            src={item.photo_url}
                            alt={item.hall_ticket}
                            className="w-10 h-10 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                            {item.hall_ticket}
                        </p>
                        {item.student_name && (
                            <p className="text-xs text-surface-500">{item.student_name}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'exam',
            header: 'Exam',
            render: (item: HallTicketData) => (
                <span className={item.exam_id ? 'text-surface-700 dark:text-surface-300' : 'text-surface-400'}>
                    {item.exam_name || 'Not Assigned'}
                </span>
            ),
        },
        {
            key: 'centre',
            header: 'Centre',
            render: (item: HallTicketData) => (
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-surface-400" />
                    <span className="text-surface-600 dark:text-surface-400">
                        {item.centre_name || item.centre_code || '-'}
                    </span>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (item: HallTicketData) => (
                <Badge variant={item.exam_id ? 'success' : 'warning'}>
                    {item.exam_id ? 'Assigned' : 'Pending'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: HallTicketData) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openPreviewModal(item);
                        }}
                        title="Preview"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(item);
                        }}
                        title="Download/Print"
                    >
                        <Download className="w-4 h-4" />
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
                        Hall Tickets
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Generate and manage examination hall tickets
                    </p>
                </div>
                <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsGenerateModalOpen(true)}
                >
                    Generate Hall Tickets
                </Button>
            </div>

            {/* Filters */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by hall ticket..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            options={[
                                { value: '', label: 'All Exams' },
                                ...exams.map(e => ({ value: e.id, label: e.name })),
                            ]}
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            options={[
                                { value: '', label: 'All Centres' },
                                ...centres.map(c => ({ value: c.centre_code, label: c.name })),
                            ]}
                            value={selectedCentre}
                            onChange={(e) => setSelectedCentre(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-surface-900 dark:text-white">
                        {hallTickets.length}
                    </p>
                    <p className="text-sm text-surface-500">Total Tickets</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                        {hallTickets.filter(t => t.exam_id).length}
                    </p>
                    <p className="text-sm text-surface-500">Assigned</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-amber-600">
                        {hallTickets.filter(t => !t.exam_id).length}
                    </p>
                    <p className="text-sm text-surface-500">Pending</p>
                </Card>
                <Card padding="md" className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                        {new Set(hallTickets.map(t => t.centre_code).filter(Boolean)).size}
                    </p>
                    <p className="text-sm text-surface-500">Centres</p>
                </Card>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                data={filteredTickets}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No hall tickets found"
            />

            {/* Generate Modal */}
            <Modal
                isOpen={isGenerateModalOpen}
                onClose={() => {
                    setIsGenerateModalOpen(false);
                    setGenerateForm({ exam_id: '', centre_code: '' });
                }}
                title="Generate Hall Tickets"
                size="md"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsGenerateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            isLoading={isSubmitting}
                            disabled={!generateForm.exam_id || !generateForm.centre_code}
                        >
                            Generate
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-surface-600 dark:text-surface-400 text-sm">
                        This will assign the selected exam to all students in the chosen centre and generate their hall tickets.
                    </p>
                    <Select
                        label="Select Exam"
                        options={[
                            { value: '', label: 'Choose an exam' },
                            ...exams.map(e => ({ value: e.id, label: e.name })),
                        ]}
                        value={generateForm.exam_id}
                        onChange={(e) => setGenerateForm({ ...generateForm, exam_id: e.target.value })}
                    />
                    <Select
                        label="Select Exam Centre"
                        options={[
                            { value: '', label: 'Choose a centre' },
                            ...centres.map(c => ({ value: c.centre_code, label: `${c.name} (${c.centre_code})` })),
                        ]}
                        value={generateForm.centre_code}
                        onChange={(e) => setGenerateForm({ ...generateForm, centre_code: e.target.value })}
                    />
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={isPreviewModalOpen}
                onClose={() => {
                    setIsPreviewModalOpen(false);
                    setSelectedTicket(null);
                }}
                title="Hall Ticket Preview"
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsPreviewModalOpen(false)}>
                            Close
                        </Button>
                        <Button
                            leftIcon={<Printer className="w-4 h-4" />}
                            onClick={() => selectedTicket && handleDownloadPDF(selectedTicket)}
                        >
                            Print / Download
                        </Button>
                    </>
                }
            >
                {selectedTicket && (
                    <div className="border-2 border-surface-200 dark:border-surface-700 rounded-lg p-6">
                        <div className="text-center border-b border-surface-200 dark:border-surface-700 pb-4 mb-4">
                            <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                EXAMINATION HALL TICKET
                            </h2>
                            <p className="text-sm text-surface-500">AI-Proctored Examination System</p>
                        </div>

                        <div className="flex gap-6">
                            <div className="w-32 h-40 bg-surface-100 dark:bg-surface-800 rounded-lg flex items-center justify-center overflow-hidden">
                                {selectedTicket.photo_url ? (
                                    <img
                                        src={selectedTicket.photo_url}
                                        alt="Student"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-surface-400 text-sm">No Photo</span>
                                )}
                            </div>

                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="text-xs text-surface-500 block">Hall Ticket Number</label>
                                    <p className="font-semibold text-surface-900 dark:text-white text-lg">
                                        {selectedTicket.hall_ticket}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-surface-500 block">Examination</label>
                                    <p className="font-medium text-surface-700 dark:text-surface-300">
                                        {selectedTicket.exam_name || 'Not Assigned'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-surface-500 block">Exam Centre</label>
                                    <p className="font-medium text-surface-700 dark:text-surface-300">
                                        {selectedTicket.centre_name || selectedTicket.centre_code || '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-surface-500 block">Centre Code</label>
                                    <p className="font-medium text-surface-700 dark:text-surface-300">
                                        {selectedTicket.centre_code || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-surface-200 dark:border-surface-700 text-center">
                            <p className="text-xs text-surface-500">
                                This is a computer-generated hall ticket. Please carry a valid ID proof.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
