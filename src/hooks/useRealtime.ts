import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TableName =
    | 'malpractice_events'
    | 'cctv_events'
    | 'exam_attempts'
    | 'cctv_evidence'
    | 'evidence'
    | 'audit_logs';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T> {
    table: TableName;
    event?: ChangeEvent;
    filter?: string;
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: T) => void;
    onDelete?: (payload: { old: T }) => void;
}

export function useRealtime<T extends Record<string, unknown>>({
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
}: UseRealtimeOptions<T>) {
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const channelName = `realtime:${table}:${filter || 'all'}`;

        const realtimeChannel = supabase
            .channel(channelName)
            .on(
                'postgres_changes' as any,
                {
                    event,
                    schema: 'public',
                    table,
                    ...(filter ? { filter } : {})
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT' && onInsert) {
                        onInsert(payload.new as T);
                    } else if (payload.eventType === 'UPDATE' && onUpdate) {
                        onUpdate(payload.new as T);
                    } else if (payload.eventType === 'DELETE' && onDelete) {
                        onDelete({ old: payload.old as T });
                    }
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        setChannel(realtimeChannel);

        return () => {
            supabase.removeChannel(realtimeChannel);
        };
    }, [table, event, filter, onInsert, onUpdate, onDelete]);

    const unsubscribe = useCallback(() => {
        if (channel) {
            supabase.removeChannel(channel);
        }
    }, [channel]);

    return { isConnected, unsubscribe };
}

// Hook for subscribing to multiple tables at once
export function useRealtimeAlerts(
    onNewAlert: (alert: Record<string, unknown>) => void
) {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const channel = supabase
            .channel('alerts-channel')
            .on(
                'postgres_changes' as any,
                { event: 'INSERT', schema: 'public', table: 'malpractice_events' },
                (payload: any) => {
                    onNewAlert({ ...payload.new, source: 'malpractice' });
                }
            )
            .on(
                'postgres_changes' as any,
                { event: 'INSERT', schema: 'public', table: 'cctv_events' },
                (payload: any) => {
                    onNewAlert({ ...payload.new, source: 'cctv' });
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [onNewAlert]);

    return { isConnected };
}

// Hook for realtime exam attempt status updates
export function useRealtimeAttempts(
    onStatusChange: (attempt: Record<string, unknown>) => void
) {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const channel = supabase
            .channel('attempts-channel')
            .on(
                'postgres_changes' as any,
                { event: 'UPDATE', schema: 'public', table: 'exam_attempts' },
                (payload: any) => {
                    onStatusChange(payload.new);
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [onStatusChange]);

    return { isConnected };
}
