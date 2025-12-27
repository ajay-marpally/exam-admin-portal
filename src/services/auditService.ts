import { supabase } from '../lib/supabase';

interface AuditEntry {
    action: string;
    entity: string;
    entity_id?: string;
    evidence?: Record<string, unknown>;
}

export async function logAuditEvent(
    actorId: string | null,
    entry: AuditEntry
): Promise<void> {
    try {
        const { error } = await supabase.from('audit_logs').insert({
            actor_id: actorId,
            action: entry.action,
            entity: entry.entity,
            entity_id: entry.entity_id,
            evidence: entry.evidence,
            ip_address: await getClientIP(),
        });

        if (error) {
            console.error('Failed to log audit event:', error);
        }
    } catch (err) {
        console.error('Error in audit logging:', err);
    }
}

// Get client IP (best effort)
async function getClientIP(): Promise<string | null> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return null;
    }
}

// Common audit actions
export const AuditActions = {
    // Auth
    LOGIN: 'USER_LOGIN',
    LOGOUT: 'USER_LOGOUT',
    LOGIN_FAILED: 'USER_LOGIN_FAILED',

    // Evidence
    EVIDENCE_VIEWED: 'EVIDENCE_VIEWED',
    EVIDENCE_LOCKED: 'EVIDENCE_LOCKED',
    EVIDENCE_DOWNLOADED: 'EVIDENCE_DOWNLOADED',

    // Alerts
    ALERT_ACKNOWLEDGED: 'ALERT_ACKNOWLEDGED',
    ALERT_ESCALATED: 'ALERT_ESCALATED',
    ALERT_RESOLVED: 'ALERT_RESOLVED',
    ALERT_FALSE_POSITIVE: 'ALERT_MARKED_FALSE_POSITIVE',

    // Student actions
    ATTEMPT_TERMINATED: 'EXAM_ATTEMPT_TERMINATED',

    // Reports
    REPORT_GENERATED: 'REPORT_GENERATED',
    REPORT_EXPORTED: 'REPORT_EXPORTED',

    // Admin actions
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    EXAM_CREATED: 'EXAM_CREATED',
    CENTRE_CREATED: 'CENTRE_CREATED',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];
