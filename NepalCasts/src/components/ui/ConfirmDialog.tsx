import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'default' | 'danger' | 'warning' | 'success' | 'info';
    isLoading?: boolean;
}
export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmText = "Confirm", cancelText = "Cancel", type = "default", isLoading = false }: ConfirmDialogProps) {
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
                return (<div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>);
            case 'warning':
                return (<div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>);
            case 'success':
                return (<div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>);
            case 'info':
            default:
                return (<div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-nc-accent/10 text-nc-accent border border-nc-accent/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>);
        }
    };
    const getConfirmButtonClasses = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 focus:ring-red-500/50';
            case 'warning':
                return 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20 focus:ring-amber-500/50';
            case 'success':
                return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 focus:ring-emerald-500/50';
            case 'info':
            default:
                return 'bg-nc-accent hover:opacity-90 text-[#0A0A0F] shadow-nc-accent/20 focus:ring-nc-accent/50';
        }
    };
    return (<AnimatePresence>
      {isOpen && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} onClick={isLoading ? undefined : onClose} className="absolute inset-0 bg-black/70 backdrop-blur-md"/>

          
          <motion.div ref={modalRef} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.22, ease: "easeOut" }} className="relative w-full max-w-[360px] bg-[#0E0E12]/95 border border-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl p-6">
            
            {getIcon()}

            <h3 id="confirm-title" className="text-lg font-bold text-white text-center mb-2">
              {title}
            </h3>

            <p id="confirm-description" className="text-nc-secondary text-sm text-center leading-relaxed mb-6">
              {description}
            </p>

            
            <div className="flex gap-3 justify-end">
              <button disabled={isLoading} onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-all border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {cancelText}
              </button>
              
              <button disabled={isLoading} onClick={onConfirm} className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClasses()}`}>
                {isLoading ? (<>
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Processing...</span>
                  </>) : (<span>{confirmText}</span>)}
              </button>
            </div>
          </motion.div>
        </div>)}
    </AnimatePresence>);
}

export function SuccessDialog(props: Omit<ConfirmDialogProps, 'type'>) {
    return <ConfirmDialog {...props} type="success" confirmText={props.confirmText || "OK"} cancelText={props.cancelText || "Dismiss"} />;
}

export function ErrorDialog(props: Omit<ConfirmDialogProps, 'type'>) {
    return <ConfirmDialog {...props} type="danger" confirmText={props.confirmText || "OK"} cancelText={props.cancelText || "Close"} />;
}

export function DeleteDialog(props: Omit<ConfirmDialogProps, 'type'>) {
    return <ConfirmDialog {...props} type="danger" confirmText={props.confirmText || "Delete"} cancelText={props.cancelText || "Cancel"} />;
}

export function AppDialog(props: ConfirmDialogProps) {
    return <ConfirmDialog {...props} />;
}
