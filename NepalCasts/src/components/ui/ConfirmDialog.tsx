import { useEffect, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  description?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  type?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmText = "Okay",
  cancelText = "Cancel",
  hideCancel = false,
  type = "default",
  variant,
  isLoading = false
}: ConfirmDialogProps) {
  const handleClose = onClose || onCancel || (() => {});
  const dialogType = variant || type || "default";
  const bodyText = description || message || "";
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (!isLoading) {
            handleClose();
          }
        }
        if (e.key === 'Tab') {
          if (!modalRef.current) return;
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
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
  }, [isOpen, isLoading, onClose, onCancel]);

  const getConfirmButtonClasses = () => {
    switch (dialogType) {
      case 'danger':
        return 'bg-[#B42318] hover:bg-[#911B12] text-white';
      case 'warning':
        return 'bg-[#946019] hover:bg-[#784D12] text-white';
      case 'success':
      case 'info':
      default:
        return 'bg-[#194332] hover:bg-[#102F28] text-white';
    }
  };

  const showCancel = !hideCancel && Boolean(cancelText && cancelText.trim() !== '');

  const handleConfirmClick = async () => {
    if (onConfirm) {
      try {
        await onConfirm();
      } catch (err) {
        console.error('[ConfirmDialog] Action failed:', err);
      }
    } else {
      handleClose();
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
          {/* Refined Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={isLoading ? undefined : handleClose}
            className="absolute inset-0 bg-[#202923]/40 backdrop-blur-sm"
          />

          {/* Quiet Luxury Modal Container */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-[460px] bg-white border border-[#E7E5E0] rounded-2xl shadow-elevated overflow-hidden text-left"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-2">
              <h3 id="confirm-title" className="text-xl font-display font-semibold text-[#202923] tracking-tight">
                {title}
              </h3>
            </div>

            {/* Description Content */}
            <div className="px-6 py-3">
              <p id="confirm-description" className="text-sm text-[#414840] leading-relaxed whitespace-pre-line font-inter">
                {bodyText}
              </p>
            </div>

            {/* Action Footer Bar */}
            <div className="px-6 py-4 mt-2 bg-[#FAF8F4] border-t border-[#E7E5E0] flex items-center justify-end gap-3 rounded-b-2xl">
              {showCancel && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#F3F0E9] active:bg-[#E7E5E0] text-[#202923] border border-[#D5D1C7] text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-inter"
                >
                  {cancelText}
                </button>
              )}

              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirmClick}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-inter ${getConfirmButtonClasses()}`}
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
