import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { UploadProgressModal } from '../components/ui/UploadProgressModal';

export interface DialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
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

const defaultDialogContext: DialogContextType = {
  showDialog: (options) => {
    if (typeof window !== 'undefined') {
      window.alert(options.description || options.title);
    }
  },
  showConfirmDialog: (title, description, onConfirm) => {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${description}`)) {
      onConfirm?.();
    }
  },
  showSuccessDialog: (title, description) => {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n${description}`);
    }
  },
  showErrorDialog: (title, description) => {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n${description}`);
    }
  },
  showWarningDialog: (title, description, onConfirm) => {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${description}`)) {
      onConfirm?.();
    }
  },
  showDeleteDialog: (title, description, onConfirm) => {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${description}`)) {
      onConfirm?.();
    }
  },
  closeActiveDialog: () => {}
};

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  return context || defaultDialogContext;
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
      confirmText: 'Okay',
      hideCancel: true,
      cancelText: '',
      type: 'success',
      onConfirm
    });
  }, [showDialog]);

  const showErrorDialog = useCallback((title: string, description: string) => {
    showDialog({
      title,
      description,
      confirmText: 'Okay',
      hideCancel: true,
      cancelText: '',
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

  const contextValue = React.useMemo(() => ({
    showDialog,
    showConfirmDialog,
    showSuccessDialog,
    showErrorDialog,
    showWarningDialog,
    showDeleteDialog,
    closeActiveDialog
  }), [
    showDialog,
    showConfirmDialog,
    showSuccessDialog,
    showErrorDialog,
    showWarningDialog,
    showDeleteDialog,
    closeActiveDialog
  ]);

  return (
    <DialogContext.Provider value={contextValue}>
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
          hideCancel={options.hideCancel}
          type={options.type}
          isLoading={isLoading}
        />
      )}
      <UploadProgressModal />
    </DialogContext.Provider>
  );
};
