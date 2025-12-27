import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize2,
    Lock,
    Unlock,
    CheckCircle,
    XCircle,
    MessageSquare,
    Download,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Video,
    Camera,
    FileText,
} from 'lucide-react';
import { supabase, getStorageUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, SeverityBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { logAuditEvent, AuditActions } from '../services/auditService';

interface TimelineEvent {
    id: string;
    type: 'malpractice' | 'cctv' | 'answer';
    time: string;
    title: string;
    description?: string;
    severity?: number;
    source?: string;
    hasEvidence?: boolean;
}

interface EvidenceItem {
    id: string;
    type: 'VIDEO_CLIP' | 'IMAGE' | 'AUDIO' | 'LOG' | 'FRAME_SEQUENCE';
    url: string;
    capturedAt: string;
    hash: string;
    confidence?: number;
    severity?: number;
    isLocked: boolean;
    violation?: string;
}

export function EvidenceReview() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, permissions } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');

    const attemptId = searchParams.get('attempt');
    const malpracticeId = searchParams.get('malpractice');

    // Fetch timeline data
    const fetchTimelineData = useCallback(async () => {
        try {
            setIsLoading(true);
            const events: TimelineEvent[] = [];

            if (attemptId) {
                // Fetch malpractice events for this attempt
                const { data: malpracticeEvents } = await supabase
                    .from('malpractice_events')
                    .select('*')
                    .eq('attempt_id', attemptId)
                    .order('occurred_at');

                (malpracticeEvents || []).forEach((e: any) => {
                    events.push({
                        id: e.id,
                        type: 'malpractice',
                        time: e.occurred_at,
                        title: e.event_type.replace(/_/g, ' '),
                        description: e.description,
                        severity: e.severity,
                        source: e.source,
                        hasEvidence: true,
                    });
                });

                // Fetch answers timeline
                const { data: answers } = await supabase
                    .from('answers')
                    .select('*')
                    .eq('attempt_id', attemptId)
                    .not('answered_at', 'is', null)
                    .order('answered_at');

                (answers || []).forEach((a: any) => {
                    events.push({
                        id: a.id,
                        type: 'answer',
                        time: a.answered_at,
                        title: 'Question Answered',
                        description: a.marked_for_review ? 'Marked for review' : undefined,
                    });
                });
            }

            if (malpracticeId) {
                // Fetch single malpractice event
                const { data: event } = await supabase
                    .from('malpractice_events')
                    .select('*')
                    .eq('id', malpracticeId)
                    .single();

                if (event) {
                    events.push({
                        id: event.id,
                        type: 'malpractice',
                        time: event.occurred_at,
                        title: event.event_type.replace(/_/g, ' '),
                        description: event.description,
                        severity: event.severity,
                        source: event.source,
                        hasEvidence: true,
                    });

                    // Fetch evidence for this event
                    const { data: evidenceData } = await supabase
                        .from('evidence')
                        .select('*')
                        .eq('malpractice_id', malpracticeId);

                    const items: EvidenceItem[] = (evidenceData || []).map((e: any) => ({
                        id: e.id,
                        type: e.evidence_type,
                        url: e.storage_url,
                        capturedAt: e.captured_at,
                        hash: e.hash_sha256 || 'N/A',
                        isLocked: false,
                    }));

                    setEvidence(items);
                    if (items.length > 0) {
                        setSelectedEvidence(items[0]);
                    }
                }
            }

            // Sort by time
            events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
            setTimeline(events);

            if (events.length > 0 && !selectedEvent) {
                setSelectedEvent(events[0]);
            }
        } catch (error) {
            console.error('Error fetching timeline:', error);
        } finally {
            setIsLoading(false);
        }
    }, [attemptId, malpracticeId, selectedEvent]);

    useEffect(() => {
        fetchTimelineData();
    }, [fetchTimelineData]);

    // Video controls
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const stepFrame = (direction: 'back' | 'forward') => {
        if (videoRef.current) {
            const step = direction === 'back' ? -0.033 : 0.033; // ~30fps
            videoRef.current.currentTime += step;
        }
    };

    // Handle lock evidence
    const handleLockEvidence = async () => {
        if (!selectedEvidence || !user) return;

        await logAuditEvent(user.id, {
            action: AuditActions.EVIDENCE_LOCKED,
            entity: 'evidence',
            entity_id: selectedEvidence.id,
            evidence: { hash: selectedEvidence.hash },
        });

        setEvidence(prev => prev.map(e =>
            e.id === selectedEvidence.id ? { ...e, isLocked: true } : e
        ));
        setSelectedEvidence(prev => prev ? { ...prev, isLocked: true } : null);
    };

    // Handle decision
    const handleDecision = async (decision: 'confirm' | 'reject') => {
        if (!selectedEvent || !user) return;

        const action = decision === 'confirm'
            ? AuditActions.ALERT_RESOLVED
            : AuditActions.ALERT_FALSE_POSITIVE;

        await logAuditEvent(user.id, {
            action,
            entity: 'malpractice_events',
            entity_id: selectedEvent.id,
            evidence: {
                event_type: selectedEvent.title,
                note: noteText || undefined,
            },
        });

        setShowNoteModal(false);
        setNoteText('');
        navigate('/alerts');
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'malpractice': return <AlertTriangle className="w-4 h-4" />;
            case 'cctv': return <Video className="w-4 h-4" />;
            case 'answer': return <FileText className="w-4 h-4" />;
            default: return <Camera className="w-4 h-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
                Back
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Timeline */}
                <Card padding="md" className="lg:col-span-1">
                    <CardHeader title="Timeline" subtitle={`${timeline.length} events`} />
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {timeline.map((event) => (
                            <button
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${selectedEvent?.id === event.id
                                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                                        : 'hover:bg-surface-50 dark:hover:bg-surface-800 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-1.5 rounded-full mt-0.5 ${event.type === 'malpractice'
                                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                            : event.type === 'cctv'
                                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
                                        }`}>
                                        {getEventIcon(event.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                                {event.title}
                                            </span>
                                            {event.severity && <SeverityBadge severity={event.severity} />}
                                        </div>
                                        <p className="text-xs text-surface-500 dark:text-surface-400">
                                            {format(new Date(event.time), 'HH:mm:ss')}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Evidence Player */}
                <div className="lg:col-span-2 space-y-4">
                    <Card padding="none" className="overflow-hidden">
                        {/* Video/Image Display */}
                        <div className="aspect-video bg-surface-900 relative flex items-center justify-center">
                            {selectedEvidence?.type === 'VIDEO_CLIP' ? (
                                <video
                                    ref={videoRef}
                                    src={selectedEvidence.url}
                                    className="w-full h-full object-contain"
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    muted={isMuted}
                                />
                            ) : selectedEvidence?.type === 'IMAGE' ? (
                                <img
                                    src={selectedEvidence.url}
                                    alt="Evidence"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="text-center text-surface-400">
                                    <Camera className="w-12 h-12 mx-auto mb-4" />
                                    <p>Select an event to view evidence</p>
                                </div>
                            )}

                            {/* Lock indicator */}
                            {selectedEvidence?.isLocked && (
                                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm">
                                    <Lock className="w-4 h-4" />
                                    Locked
                                </div>
                            )}
                        </div>

                        {/* Video Controls */}
                        {selectedEvidence?.type === 'VIDEO_CLIP' && (
                            <div className="p-4 bg-surface-800 flex items-center justify-center gap-4">
                                <button
                                    onClick={() => stepFrame('back')}
                                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="Previous frame"
                                >
                                    <SkipBack className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={togglePlay}
                                    className="p-3 bg-white text-surface-900 rounded-full hover:bg-surface-200 transition-colors"
                                >
                                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                </button>
                                <button
                                    onClick={() => stepFrame('forward')}
                                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="Next frame"
                                >
                                    <SkipForward className="w-5 h-5" />
                                </button>
                                <div className="w-px h-6 bg-white/20" />
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                            </div>
                        )}
                    </Card>

                    {/* Evidence Thumbnails */}
                    {evidence.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {evidence.map((e) => (
                                <button
                                    key={e.id}
                                    onClick={() => setSelectedEvidence(e)}
                                    className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${selectedEvidence?.id === e.id
                                            ? 'border-primary-500'
                                            : 'border-transparent hover:border-surface-300 dark:hover:border-surface-600'
                                        }`}
                                >
                                    {e.type === 'IMAGE' || e.type === 'VIDEO_CLIP' ? (
                                        <img src={e.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-surface-400" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Metadata & Actions */}
                <Card padding="md" className="lg:col-span-1">
                    <CardHeader title="Evidence Details" />

                    {selectedEvidence ? (
                        <div className="space-y-4">
                            {/* Metadata */}
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                                        Type
                                    </p>
                                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                                        {selectedEvidence.type.replace(/_/g, ' ')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                                        Captured At
                                    </p>
                                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                                        {format(new Date(selectedEvidence.capturedAt), 'PPpp')}
                                    </p>
                                </div>
                                {selectedEvidence.severity && (
                                    <div>
                                        <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                                            Severity
                                        </p>
                                        <SeverityBadge severity={selectedEvidence.severity} />
                                    </div>
                                )}
                                {selectedEvidence.confidence && (
                                    <div>
                                        <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                                            AI Confidence
                                        </p>
                                        <p className="text-sm font-medium text-surface-900 dark:text-white">
                                            {(selectedEvidence.confidence * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                                        SHA-256 Hash
                                    </p>
                                    <p className="text-xs font-mono text-surface-600 dark:text-surface-400 break-all">
                                        {selectedEvidence.hash}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-surface-200 dark:border-surface-700 space-y-2">
                                {permissions.canLockEvidence && !selectedEvidence.isLocked && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleLockEvidence}
                                        leftIcon={<Lock className="w-4 h-4" />}
                                    >
                                        Lock Evidence
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setShowNoteModal(true)}
                                    leftIcon={<MessageSquare className="w-4 h-4" />}
                                >
                                    Add Note
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    leftIcon={<Download className="w-4 h-4" />}
                                >
                                    Download
                                </Button>
                            </div>

                            {/* Decision Buttons */}
                            {selectedEvent?.type === 'malpractice' && permissions.canLockEvidence && (
                                <div className="pt-4 border-t border-surface-200 dark:border-surface-700 space-y-2">
                                    <Button
                                        variant="primary"
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={() => handleDecision('confirm')}
                                        leftIcon={<CheckCircle className="w-4 h-4" />}
                                    >
                                        Confirm Violation
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => handleDecision('reject')}
                                        leftIcon={<XCircle className="w-4 h-4" />}
                                    >
                                        Mark as False Positive
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-surface-500 dark:text-surface-400 text-center py-8">
                            Select an event to view details
                        </p>
                    )}
                </Card>
            </div>

            {/* Note Modal */}
            <Modal
                isOpen={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                title="Add Note"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowNoteModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => handleDecision('confirm')}>
                            Save Note
                        </Button>
                    </>
                }
            >
                <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full h-32 p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter your notes about this evidence..."
                />
            </Modal>
        </div>
    );
}
