// Database type definitions matching the Supabase schema

// Geographic hierarchy
export interface State {
    id: string;
    name: string;
    created_at: string;
}

export interface District {
    id: string;
    state_id: string;
    name: string;
    created_at: string;
    state?: State;
}

export interface Mandal {
    id: string;
    district_id: string;
    name: string;
    created_at: string;
    district?: District;
}

export interface ExamCentre {
    id: string;
    centre_code: string;
    name: string;
    address_line1?: string;
    address_line2?: string;
    city: string;
    state: string;
    country: string;
    pincode?: string;
    total_labs?: number;
    total_seats?: number;
    has_cctv: boolean;
    has_biometrics: boolean;
    internet_type?: string;
    power_backup: boolean;
    is_active: boolean;
    created_at: string;
    mandal_id?: string;
    mandal?: Mandal;
}

export interface ExamLab {
    id: string;
    exam_centre_id: string;
    lab_code: string;
    floor_number?: number;
    total_seats: number;
    has_cctv: boolean;
    has_audio_monitor: boolean;
    created_at: string;
    exam_centre?: ExamCentre;
}

// Exam related
export interface Exam {
    id: string;
    name: string;
    duration_minutes: number;
    start_time?: string;
    end_time?: string;
    created_by?: string;
    created_at: string;
}

export interface Question {
    id: string;
    exam_id: string;
    question_text: string;
    options: Record<string, string>;
    correct_option: number;
    created_at: string;
}

export interface ExamAssignment {
    id: string;
    student_id: string;
    exam_id: string;
    assigned_at: string;
    student?: Student;
    exam?: Exam;
}

// Student related
export interface Student {
    id: string;
    user_id: string;
    hall_ticket: string;
    photo_url?: string;
    biometric_hash?: string;
    exam_center?: string;
    created_at: string;
}

export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'TERMINATED';

export interface ExamAttempt {
    id: string;
    student_id: string;
    exam_id: string;
    system_fingerprint?: string;
    start_time?: string;
    end_time?: string;
    status: AttemptStatus;
    created_at: string;
    student?: Student;
    exam?: Exam;
}

export interface Answer {
    id: string;
    attempt_id: string;
    question_id: string;
    selected_option?: number;
    marked_for_review: boolean;
    answered_at?: string;
}

// CCTV related
export interface CCTVCamera {
    id: string;
    ip_address: string;
    location?: string;
    exam_center?: string;
    is_active: boolean;
    created_at: string;
}

export interface CCTVEvent {
    id: string;
    camera_id?: string;
    exam_id?: string;
    event_type?: string;
    severity?: number;
    occurred_at: string;
    camera?: CCTVCamera;
}

export type CCTVEvidenceType = 'VIDEO_CLIP' | 'IMAGE' | 'FRAME_SEQUENCE';

export interface CCTVEvidence {
    id: string;
    cctv_event_id?: string;
    camera_id: string;
    exam_id?: string;
    student_id?: string;
    evidence_type: CCTVEvidenceType;
    storage_url: string;
    duration_seconds?: number;
    frame_start?: number;
    frame_end?: number;
    hash_sha256: string;
    file_size_bytes?: number;
    encoding_format?: string;
    detected_violation?: string;
    ai_confidence?: number;
    severity?: number;
    captured_at: string;
    created_at: string;
    retained_until?: string;
    is_locked: boolean;
    camera?: CCTVCamera;
    student?: Student;
}

// Malpractice related
export type MalpracticeSource = 'STUDENT_AI' | 'CCTV_AI' | 'ADMIN';

export interface MalpracticeEvent {
    id: string;
    attempt_id: string;
    event_type: string;
    severity?: number;
    source: MalpracticeSource;
    description?: string;
    occurred_at: string;
    attempt?: ExamAttempt;
}

export type EvidenceType = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'LOG';

export interface Evidence {
    id: string;
    malpractice_id?: string;
    evidence_type?: EvidenceType;
    storage_url: string;
    hash_sha256?: string;
    captured_at: string;
    malpractice?: MalpracticeEvent;
}

// Audit related
export interface AuditLog {
    id: string;
    actor_id?: string;
    action: string;
    entity: string;
    entity_id?: string;
    evidence?: Record<string, unknown>;
    ip_address?: string;
    created_at: string;
}

// Dashboard KPI types
export interface DashboardKPIs {
    activeExams: number;
    activeStudents: number;
    openAlerts: number;
    highSeverityAlerts: number;
    camerasOffline: number;
    evidenceAwaitingReview: number;
}

// Alert status for triage
export type AlertStatus = 'OPEN' | 'REVIEWED' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE';

// Extended alert type for triage queue
export interface Alert {
    id: string;
    time: string;
    studentId?: string;
    studentName?: string;
    hallTicket?: string;
    centreId?: string;
    centreName?: string;
    eventType: string;
    severity: number;
    source: MalpracticeSource;
    status: AlertStatus;
    description?: string;
}

// Risk score calculation helper
export function getSeverityLevel(severity: number): 'low' | 'medium' | 'high' | 'critical' {
    if (severity <= 3) return 'low';
    if (severity <= 6) return 'medium';
    if (severity <= 8) return 'high';
    return 'critical';
}

// Severity color mapping
export function getSeverityColor(severity: number): string {
    const level = getSeverityLevel(severity);
    switch (level) {
        case 'low': return 'bg-green-500';
        case 'medium': return 'bg-amber-500';
        case 'high': return 'bg-red-500';
        case 'critical': return 'bg-red-700';
    }
}

// Status color mapping
export function getStatusColor(status: AlertStatus): string {
    switch (status) {
        case 'OPEN': return 'bg-amber-500';
        case 'REVIEWED': return 'bg-blue-500';
        case 'ESCALATED': return 'bg-purple-500';
        case 'RESOLVED': return 'bg-green-500';
        case 'FALSE_POSITIVE': return 'bg-gray-500';
    }
}
