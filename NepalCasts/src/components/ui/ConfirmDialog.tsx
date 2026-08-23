import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void | Promise<void>;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    type?: 'default' | 'danger' | 'warning' | 'success' | 'info';
    isLoading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Okay",
    cancelText = "Cancel",
    hideCancel = false,
    type = "default",
    isLoading = false
}: ConfirmDialogProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            const timer = setTimeout(() => {
                if (modalRef.current) {
                    const focusableElements = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusableElements.length > 0) {
                        (focusableElements[0] as HTMLElement).focus();
                    }
                }
            }, 50);
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    if (!isLoading) {
                        onClose();
                    }
                }
                if (e.key === 'Tab') {
                    if (!modalRef.current)
                        return;
                    const focusableElements = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusableElements.length === 0)
                        return;
                    const firstElement = focusableElements[0] as HTMLElement;
                    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        }
                    }
                    else {
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            e.preventDefault();
                        }
                    }
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('keydown', handleKeyDown);
                if (previousFocusRef.current) {
                    previousFocusRef.current.focus();
                }
            };
        }
    }, [isOpen, isLoading, onClose]);

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return (
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.2)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                );
            case 'warning':
                return (
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.2)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                );
            case 'success':
                return (
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            case 'info':
            default:
                return (
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 shadow-[0_0_24px_rgba(0,191,255,0.2)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
        }
    };

    const getConfirmButtonClasses = () => {
        switch (type) {
            case 'danger':
                return 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/25 border border-red-500/30';
            case 'warning':
                return 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-400/25 border border-amber-400/30';
            case 'success':
                return 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-lg shadow-emerald-500/25 border border-emerald-400/30';
            case 'info':
            default:
                return 'bg-[#00BFFF] hover:bg-[#0099e6] text-black shadow-lg shadow-[#00BFFF]/25 border border-[#00BFFF]/30';
        }
    };

    const showCancel = !hideCancel && Boolean(cancelText && cancelText.trim() !== '');

    const handleConfirmClick = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                    aria-describedby="confirm-description"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={isLoading ? undefined : onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: 0.94, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full max-w-[340px] sm:max-w-[360px] bg-[#181818] border border-white/10 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-6 sm:p-7 text-center"
                    >
                        {getIcon()}

                        <h3 id="confirm-title" className="text-lg font-black text-white text-center mb-1.5 tracking-tight">
                            {title}
                        </h3>

                        <p id="confirm-description" className="text-gray-300 text-xs sm:text-sm text-center leading-relaxed mb-6 font-medium">
                            {description}
                        </p>

                        <div className="flex gap-2.5 justify-end w-full">
                            {showCancel && (
                                <button
                                    disabled={isLoading}
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/10 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {cancelText}
                                </button>
                            )}

                            <button
                                disabled={isLoading}
                                onClick={handleConfirmClick}
                                className={`${showCancel ? 'flex-1' : 'w-full'} py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getConfirmButtonClasses()}`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>{confirmText || "Okay"}</span>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export function SuccessDialog(props: Omit<ConfirmDialogProps, 'type'>) {
    return <ConfirmDialog {...props} type="success" confirmText={props.confirmText || "Okay"} hideCancel={true} cancelText="" />;
}

export function ErrorDialog(props: Omit<ConfirmDialogProps, 'type'>) {
    return <ConfirmDialog {...props} type="danger" confirmText={props.confirmText || "Okay"} hideCancel={true} cancelText="" />;
}

export function DeleteDialog(props: Omit<ConfirmDialogProps, 'type'>) {
    return <ConfirmDialog {...props} type="danger" confirmText={props.confirmText || "Delete"} cancelText={props.cancelText || "Cancel"} />;
}

export function AppDialog(props: ConfirmDialogProps) {
    return <ConfirmDialog {...props} />;
}
