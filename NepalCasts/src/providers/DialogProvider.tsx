import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export interface DialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning' | 'success' | 'info';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => void;
  showConfirmDialog: (title: string, description: string, onConfirm: () => void | Promise<void>, onCancel?: () => void) => void;
  showSuccessDialog: (title: string, description: string, onConfirm?: () => void) => void;
  showErrorDialog: (title: string, description: string) => void;
  showWarningDialog: (title: string, description: string, onConfirm: () => void | Promise<void>, onCancel?: () => void) => void;
  showDeleteDialog: (title: string, description: string, onConfirm: () => void | Promise<void>) => void;
  closeActiveDialog: () => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within a DialogProvider');
  return context;
};

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showDialog = useCallback((opt: DialogOptions) => {
    setOptions(opt);
    setIsOpen(true);
    setIsLoading(false);
  }, []);

  const closeActiveDialog = useCallback(() => {
    setIsOpen(false);
    if (options?.onCancel) {
      options.onCancel();
    }
  }, [options]);

  const handleConfirm = async () => {
    if (options?.onConfirm) {
      setIsLoading(true);
      try {
        await options.onConfirm();
      } catch (err) {
        console.error("Error confirming dialog action:", err);
      } finally {
        setIsLoading(false);
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const showConfirmDialog = useCallback((title: string, description: string, onConfirm: () => void | Promise<void>, onCancel?: () => void) => {
    showDialog({
      title,
      description,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'default',
      onConfirm,
      onCancel
    });
  }, [showDialog]);

  const showSuccessDialog = useCallback((title: string, description: string, onConfirm?: () => void) => {
    showDialog({
      title,
      description,
      confirmText: 'OK',
      cancelText: 'Dismiss',
      type: 'success',
      onConfirm
    });
  }, [showDialog]);

  const showErrorDialog = useCallback((title: string, description: string) => {
    showDialog({
      title,
      description,
      confirmText: 'OK',
      cancelText: 'Close',
      type: 'danger'
    });
  }, [showDialog]);

  const showWarningDialog = useCallback((title: string, description: string, onConfirm: () => void | Promise<void>, onCancel?: () => void) => {
    showDialog({
      title,
      description,
      confirmText: 'Continue',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm,
      onCancel
    });
  }, [showDialog]);

  const showDeleteDialog = useCallback((title: string, description: string, onConfirm: () => void | Promise<void>) => {
    showDialog({
      title,
      description,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm
    });
  }, [showDialog]);

  return (
    <DialogContext.Provider value={{
      showDialog,
      showConfirmDialog,
      showSuccessDialog,
      showErrorDialog,
      showWarningDialog,
      showDeleteDialog,
      closeActiveDialog
    }}>
      {children}
      {options && (
        <ConfirmDialog
          isOpen={isOpen}
          onClose={closeActiveDialog}
          onConfirm={handleConfirm}
          title={options.title}
          description={options.description}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          type={options.type}
          isLoading={isLoading}
        />
      )}
    </DialogContext.Provider>
  );
};
