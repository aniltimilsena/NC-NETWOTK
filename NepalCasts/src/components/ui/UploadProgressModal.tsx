import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, AlertCircle, X, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';

interface UploadState {
    fileName: string;
    fileType: 'image' | 'video' | 'media';
    fileSize: number;
    folder: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    previewUrl?: string | null;
    errorMsg?: string;
}

const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function UploadProgressModal() {
    const [uploadState, setUploadState] = useState<UploadState | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleStart = (e: Event) => {
            const { fileName, fileType, fileSize, folder, previewUrl } = (e as CustomEvent).detail || {};
            if (folder === 'chat') return;

            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }

            const type = fileType === 'video' ? 'video' : fileType === 'image' ? 'image' : 'media';
            setIsMinimized(false);
            setUploadState({
                fileName: fileName || 'Photo',
                fileType: type,
                fileSize: fileSize || 0,
                folder: folder || 'general',
                progress: 0,
                status: 'uploading',
                previewUrl: previewUrl || null,
            });
        };

        const handleProgress = (e: Event) => {
            const { folder, progress } = (e as CustomEvent).detail || {};
            if (folder === 'chat') return;

            const numericProgress = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0;
            setUploadState(prev => {
                if (!prev) return null;
                const nextStatus = numericProgress >= 99 ? 'processing' : 'uploading';
                return {
                    ...prev,
                    progress: numericProgress,
                    status: nextStatus,
                };
            });
        };

        const handleComplete = (e: Event) => {
            const { folder } = (e as CustomEvent).detail || {};
            if (folder === 'chat') return;

            setUploadState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    progress: 100,
                    status: 'completed'
                };
            });

            closeTimeoutRef.current = setTimeout(() => {
                setUploadState(null);
                setIsMinimized(false);
            }, 2500);
        };

        const handleError = (e: Event) => {
            const { folder, error } = (e as CustomEvent).detail || {};
            if (folder === 'chat') return;

            setUploadState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    status: 'error',
                    errorMsg: error || 'Upload could not be completed'
                };
            });

            closeTimeoutRef.current = setTimeout(() => {
                setUploadState(null);
                setIsMinimized(false);
            }, 4000);
        };

        window.addEventListener('nc-upload-start', handleStart);
        window.addEventListener('nc-upload-progress', handleProgress);
        window.addEventListener('nc-upload-complete', handleComplete);
        window.addEventListener('nc-upload-error', handleError);

        return () => {
            window.removeEventListener('nc-upload-start', handleStart);
            window.removeEventListener('nc-upload-progress', handleProgress);
            window.removeEventListener('nc-upload-complete', handleComplete);
            window.removeEventListener('nc-upload-error', handleError);
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    if (!uploadState) return null;

    const { fileName, fileType, fileSize, folder, progress, status, previewUrl, errorMsg } = uploadState;

    const getDialogTitle = () => {
        if (status === 'completed') return 'Upload Complete';
        if (status === 'error') return 'Upload Failed';
        if (folder === 'avatars' || folder === 'profiles') return 'Updating Profile Photo...';
        if (folder === 'cover') return 'Updating Cover Photo...';
        if (folder === 'applications') return 'Uploading Audition Media...';
        return `Uploading ${fileType === 'video' ? 'Video' : 'Photo'}...`;
    };

    const getStatusSubtext = () => {
        if (status === 'completed') return 'Photo uploaded successfully.';
        if (status === 'error') return errorMsg || 'Upload failed. Please try again.';
        if (progress > 0 && fileSize > 0) {
            const loadedBytes = Math.round((progress / 100) * fileSize);
            return `${formatBytes(loadedBytes)} of ${formatBytes(fileSize)} • Uploading...`;
        }
        return 'Uploading...';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-[400px] z-[99999] select-none"
            >
                <div className="bg-[#1C1E21] border border-white/10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] overflow-hidden text-white backdrop-blur-xl ring-1 ring-white/5">
                    
                    {/* Facebook-style Header Bar */}
                    <div className="bg-[#242526] px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                status === 'completed' 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : status === 'error'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-blue-600/20 text-blue-400'
                            }`}>
                                {status === 'completed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : status === 'error' ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                ) : (
                                    <Camera className="w-3.5 h-3.5 animate-pulse" />
                                )}
                            </div>
                            <span className="text-xs font-bold text-gray-200 tracking-wide truncate max-w-[240px]">
                                {getDialogTitle()}
                            </span>
                        </div>

                        {/* Minimize & Dismiss Actions */}
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setIsMinimized(prev => !prev)}
                                className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title={isMinimized ? 'Expand' : 'Minimize'}
                            >
                                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadState(null)}
                                className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Body */}
                    {!isMinimized && (
                        <div className="p-4 space-y-3.5">
                            <div className="flex items-center gap-3.5">
                                {/* Thumbnail Image with Shimmer/Progress Ring */}
                                <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center shadow-inner">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt={fileName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/30 to-purple-900/30 text-blue-400">
                                            <Camera className="w-7 h-7 opacity-80" />
                                        </div>
                                    )}

                                    {/* Uploading Shimmer Overlay */}
                                    {status === 'uploading' && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                                        </div>
                                    )}

                                    {/* Completed Badge */}
                                    {status === 'completed' && (
                                        <div className="absolute inset-0 bg-emerald-950/60 flex items-center justify-center backdrop-blur-[1px] text-emerald-400">
                                            <CheckCircle2 className="w-7 h-7 drop-shadow-md animate-in zoom-in-75 duration-200" />
                                        </div>
                                    )}
                                </div>

                                {/* Text Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-white truncate max-w-[180px]">
                                            {fileName}
                                        </p>
                                        <span className={`text-xs font-bold tabular-nums ${
                                            status === 'completed' 
                                                ? 'text-emerald-400' 
                                                : status === 'error'
                                                ? 'text-rose-400'
                                                : 'text-blue-400'
                                        }`}>
                                            {status === 'completed' ? '100%' : `${progress}%`}
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-gray-400 leading-tight truncate">
                                        {getStatusSubtext()}
                                    </p>
                                </div>
                            </div>

                            {/* Facebook-style Progress Bar */}
                            <div className="space-y-1 pt-1">
                                <div className="relative w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <motion.div
                                        className={`h-full rounded-full transition-all duration-200 ${
                                            status === 'completed'
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                                : status === 'error'
                                                ? 'bg-rose-500'
                                                : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 shadow-[0_0_12px_rgba(37,99,235,0.6)]'
                                        }`}
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ ease: 'easeOut', duration: 0.2 }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Minimized Pill View */}
                    {isMinimized && (
                        <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-300">
                            <span className="truncate max-w-[260px] text-[11px]">
                                {fileName} ({progress}%)
                            </span>
                            <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden ml-2">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-200"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
export default UploadProgressModal;
