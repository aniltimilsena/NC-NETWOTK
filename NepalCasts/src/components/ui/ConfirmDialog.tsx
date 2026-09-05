import { useEffect, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

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
                    if (!modalRef.current) return;
                    const focusableElements = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusableElements.length === 0) return;
                    const firstElement = focusableElements[0] as HTMLElement;
                    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        }
                    } else {
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

    const getIconHeader = () => {
        switch (type) {
            case 'danger':
                return (
                    <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                );
            case 'warning':
                return (
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                );
            case 'success':
                return (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                );
            case 'info':
            default:
                return (
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                );
        }
    };

    const getConfirmButtonClasses = () => {
        switch (type) {
            case 'danger':
                return 'bg-[#E41E3F] hover:bg-[#D01937] text-white';
            case 'warning':
                return 'bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold';
            case 'success':
                return 'bg-[#1877F2] hover:bg-[#166FE5] text-white';
            case 'info':
            default:
                return 'bg-[#1877F2] hover:bg-[#166FE5] text-white';
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
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 select-none"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                    aria-describedby="confirm-description"
                >
                    {/* Clean Dark Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={isLoading ? undefined : onClose}
                        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                    />

                    {/* Facebook-style Card Container */}
                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: 0.96, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 6 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="relative w-full max-w-[460px] bg-[#242526] border border-[#3E4042] rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.6)] overflow-hidden text-left"
                    >
                        {/* Header — no border, no X, no icon */}
                        <div className="px-5 pt-5 pb-3">
                            <h3 id="confirm-title" className="text-base font-bold text-[#E4E6EB] tracking-tight">
                                {title}
                            </h3>
                        </div>

                        {/* Description Content */}
                        <div className="px-5 py-4">
                            <p id="confirm-description" className="text-sm text-[#B0B3B8] leading-relaxed whitespace-pre-line">
                                {description}
                            </p>
                        </div>

                        {/* Facebook-style Action Footer Bar — no top border */}
                        <div className="px-5 py-4 flex items-center justify-end gap-3 rounded-b-xl">
                            {showCancel && (
                                <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-md bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {cancelText}
                                </button>
                            )}

                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={handleConfirmClick}
                                className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClasses()}`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
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
