import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadState {
    isUploading: boolean;
    fileName: string;
    fileType: 'image' | 'video' | 'media';
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    errorMsg?: string;
}

export function UploadProgressModal() {
    const [uploadState, setUploadState] = useState<UploadState | null>(null);

    useEffect(() => {
        const handleStart = (e: Event) => {
            const { fileName, fileType, folder } = (e as CustomEvent).detail || {};
            if (folder === 'chat') return; // Exclude chat uploads

            const type = fileType === 'video' ? 'video' : fileType === 'image' ? 'image' : 'media';
            setUploadState({
                isUploading: true,
                fileName: fileName || 'file',
                fileType: type,
                progress: 0,
                status: 'uploading'
            });
        };

        const handleProgress = (e: Event) => {
            const { folder, progress } = (e as CustomEvent).detail || {};
            if (folder === 'chat') return;

            setUploadState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    progress: typeof progress === 'number' ? progress : prev.progress
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

            setTimeout(() => {
                setUploadState(null);
            }, 1200);
        };

        const handleError = (e: Event) => {
            const { folder, error } = (e as CustomEvent).detail || {};
            if (folder === 'chat') return;

            setUploadState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    status: 'error',
                    errorMsg: error || 'Upload failed'
                };
            });

            setTimeout(() => {
                setUploadState(null);
            }, 3000);
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
        };
    }, []);

    if (!uploadState) return null;

    const { fileName, fileType, progress, status, errorMsg } = uploadState;
    const title = status === 'completed'
        ? 'Upload Complete!'
        : status === 'error'
        ? 'Upload Failed'
        : `Uploading ${fileType === 'image' ? 'Photo' : fileType === 'video' ? 'Video' : 'Media'}...`;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-sm bg-[#111116] border border-white/10 rounded-3xl p-6 text-white shadow-2xl space-y-5 text-center relative overflow-hidden"
                >
                    {/* Glowing background accent */}
                    <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#00BFFF]/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Icon Header */}
                    <div className="flex justify-center relative z-10">
                        {status === 'completed' ? (
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                        ) : status === 'error' ? (
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                <AlertCircle className="w-7 h-7" />
                            </div>
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF] shadow-[0_0_20px_rgba(0,191,255,0.2)] relative">
                                <Upload className="w-6 h-6 animate-bounce" />
                                <Loader2 className="w-10 h-10 animate-spin absolute text-[#00BFFF]/40" />
                            </div>
                        )}
                    </div>

                    {/* Title & Details */}
                    <div className="space-y-1 relative z-10">
                        <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
                        <p className="text-xs text-nc-muted truncate max-w-[260px] mx-auto">
                            {status === 'error' ? errorMsg : fileName}
                        </p>
                    </div>

                    {/* Progress Bar & Percentage */}
                    {status === 'uploading' && (
                        <div className="space-y-2 relative z-10">
                            <div className="flex justify-between items-center text-xs font-bold text-[#00BFFF]">
                                <span>Uploading to NepalCasts</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-[#00BFFF] rounded-full transition-all duration-200 shadow-[0_0_10px_#00BFFF]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
