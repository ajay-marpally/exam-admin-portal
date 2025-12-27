import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
    Grid,
    List,
    RefreshCw,
    Maximize2,
    Camera,
    WifiOff,
    AlertTriangle,
    Play,
    Settings,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleScope } from '../hooks/useRoleScope';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';

interface CCTVCamera {
    id: string;
    ip_address: string;
    location: string | null;
    exam_center: string | null;
    is_active: boolean;
    created_at: string;
    event_count?: number;
    last_event?: string;
}

export function CCTVView() {
    const { isSuperAdmin, scope } = useRoleScope();
    const [isLoading, setIsLoading] = useState(true);
    const [cameras, setCameras] = useState<CCTVCamera[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [gridSize, setGridSize] = useState<'2x2' | '3x3' | '4x4'>('3x3');
    const [selectedCamera, setSelectedCamera] = useState<CCTVCamera | null>(null);
    const [fullscreenCamera, setFullscreenCamera] = useState<CCTVCamera | null>(null);

    // Fetch cameras
    const fetchCameras = useCallback(async () => {
        try {
            setIsLoading(true);

            let query = supabase.from('cctv_cameras').select('*');

            // Apply scope filter for non-super-admins
            if (!isSuperAdmin && scope.centreId) {
                query = query.eq('exam_center', scope.centreId);
            }

            const { data, error } = await query.order('location');

            if (error) throw error;

            // Fetch event counts
            const cameraIds = (data || []).map((c: CCTVCamera) => c.id);
            const { data: events } = await supabase
                .from('cctv_events')
                .select('camera_id, occurred_at')
                .in('camera_id', cameraIds);

            const camerasWithEvents = (data || []).map((camera: CCTVCamera) => {
                const cameraEvents = (events || []).filter((e: any) => e.camera_id === camera.id);
                const lastEvent = cameraEvents.sort((a: any, b: any) =>
                    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
                )[0];

                return {
                    ...camera,
                    event_count: cameraEvents.length,
                    last_event: lastEvent?.occurred_at,
                };
            });

            setCameras(camerasWithEvents);
        } catch (error) {
            console.error('Error fetching cameras:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, scope]);

    useEffect(() => {
        fetchCameras();
    }, [fetchCameras]);

    const getGridCols = () => {
        switch (gridSize) {
            case '2x2': return 'grid-cols-1 sm:grid-cols-2';
            case '3x3': return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
            case '4x4': return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
        }
    };

    const onlineCount = cameras.filter(c => c.is_active).length;
    const offlineCount = cameras.filter(c => !c.is_active).length;

    return (
        <div className="space-y-6">
            {/* Controls */}
            <Card padding="md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm text-surface-600 dark:text-surface-400">
                                {onlineCount} Online
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-sm text-surface-600 dark:text-surface-400">
                                {offlineCount} Offline
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={gridSize}
                            onChange={(e) => setGridSize(e.target.value as '2x2' | '3x3' | '4x4')}
                            options={[
                                { value: '2x2', label: '2x2 Grid' },
                                { value: '3x3', label: '3x3 Grid' },
                                { value: '4x4', label: '4x4 Grid' },
                            ]}
                        />
                        <div className="flex rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                        <Button
                            variant="outline"
                            onClick={fetchCameras}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                            Refresh
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Camera Grid */}
            {viewMode === 'grid' ? (
                <div className={`grid ${getGridCols()} gap-4`}>
                    {isLoading ? (
                        [...Array(9)].map((_, i) => (
                            <Card key={i} padding="none" className="aspect-video animate-pulse">
                                <div className="w-full h-full bg-surface-200 dark:bg-surface-700 rounded-xl" />
                            </Card>
                        ))
                    ) : cameras.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-surface-500 dark:text-surface-400">
                            <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No cameras available</p>
                        </div>
                    ) : (
                        cameras.map((camera) => (
                            <CameraCard
                                key={camera.id}
                                camera={camera}
                                onFullscreen={() => setFullscreenCamera(camera)}
                                onClick={() => setSelectedCamera(camera)}
                            />
                        ))
                    )}
                </div>
            ) : (
                <Card padding="none">
                    <div className="divide-y divide-surface-200 dark:divide-surface-700">
                        {cameras.map((camera) => (
                            <div
                                key={camera.id}
                                className="flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors"
                                onClick={() => setSelectedCamera(camera)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${camera.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                        <p className="font-medium text-surface-900 dark:text-white">
                                            {camera.location || camera.ip_address}
                                        </p>
                                        <p className="text-sm text-surface-500 dark:text-surface-400">
                                            {camera.exam_center || 'Unknown Centre'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {camera.event_count && camera.event_count > 0 && (
                                        <Badge variant="warning" size="sm">
                                            {camera.event_count} events
                                        </Badge>
                                    )}
                                    <Badge variant={camera.is_active ? 'success' : 'danger'} size="sm">
                                        {camera.is_active ? 'Online' : 'Offline'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Fullscreen Modal */}
            <Modal
                isOpen={!!fullscreenCamera}
                onClose={() => setFullscreenCamera(null)}
                title={fullscreenCamera?.location || 'Camera View'}
                size="full"
            >
                <div className="aspect-video bg-surface-900 rounded-lg flex items-center justify-center">
                    {fullscreenCamera?.is_active ? (
                        <div className="text-center text-surface-400">
                            <Camera className="w-16 h-16 mx-auto mb-4" />
                            <p>RTSP Stream: {fullscreenCamera.ip_address}</p>
                            <p className="text-sm mt-2">Connect to view live feed</p>
                        </div>
                    ) : (
                        <div className="text-center text-red-400">
                            <WifiOff className="w-16 h-16 mx-auto mb-4" />
                            <p>Camera Offline</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

interface CameraCardProps {
    camera: CCTVCamera;
    onFullscreen: () => void;
    onClick: () => void;
}

function CameraCard({ camera, onFullscreen, onClick }: CameraCardProps) {
    return (
        <Card padding="none" className="overflow-hidden group cursor-pointer" hover>
            {/* Video Area */}
            <div
                className="aspect-video bg-surface-900 relative flex items-center justify-center"
                onClick={onClick}
            >
                {camera.is_active ? (
                    <>
                        {/* Placeholder for RTSP stream */}
                        <div className="text-center text-surface-500">
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">RTSP: {camera.ip_address}</p>
                        </div>

                        {/* Timestamp overlay */}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {format(new Date(), 'HH:mm:ss')}
                        </div>

                        {/* Status indicator */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            LIVE
                        </div>

                        {/* Event indicator */}
                        {camera.event_count && camera.event_count > 0 && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                {camera.event_count}
                            </div>
                        )}

                        {/* Hover controls */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button
                                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFullscreen();
                                }}
                            >
                                <Maximize2 className="w-5 h-5 text-white" />
                            </button>
                            <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                                <Play className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-red-400">
                        <WifiOff className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs">Offline</p>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="font-medium text-surface-900 dark:text-white truncate text-sm">
                            {camera.location || 'Unknown'}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                            {camera.exam_center || 'Unknown Centre'}
                        </p>
                    </div>
                    <Badge variant={camera.is_active ? 'success' : 'danger'} size="sm">
                        {camera.is_active ? 'Online' : 'Offline'}
                    </Badge>
                </div>
            </div>
        </Card>
    );
}
