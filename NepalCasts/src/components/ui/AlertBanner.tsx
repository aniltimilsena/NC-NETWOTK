import { useEffect, useRef, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, LogOut, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info' | 'logout';

export interface AlertPayload {
  id: string;
  message: string;
  type: AlertType;
  detail?: string;
  onAction?: () => void;
}

interface InlineAlertProps {
  type: AlertType | null;
  message: string | null;
  detail?: string | null;
  onDismiss?: () => void;
  className?: string;
}

const INLINE_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'bg-[#EAF2ED]',
    border: 'border-[#C8DFD2]',
    icon_color: 'text-[#286847]',
    text_color: 'text-[#202923]',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-[#FEE4E2]',
    border: 'border-[#FECDCA]',
    icon_color: 'text-[#B42318]',
    text_color: 'text-[#202923]',
  },
  info: {
    icon: Info,
    bg: 'bg-[#F3F0E9]',
    border: 'border-[#D5D1C7]',
    icon_color: 'text-[#194332]',
    text_color: 'text-[#202923]',
  },
  logout: {
    icon: LogOut,
    bg: 'bg-[#FAF4EC]',
    border: 'border-[#EADBC8]',
    icon_color: 'text-[#946019]',
    text_color: 'text-[#202923]',
  },
};

export function InlineAlert({ type, message, detail, onDismiss, className = '' }: InlineAlertProps) {
  if (!type || !message) return null;
  const cfg = INLINE_CONFIG[type];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={`${type}-${message}`}
        initial={{ opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={`flex items-start gap-3 rounded-xl border ${cfg.bg} ${cfg.border} px-4 py-3.5 shadow-sm ${className}`}
        role="alert"
        aria-live="polite"
      >
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.icon_color}`} strokeWidth={2} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${cfg.text_color}`}>{message}</p>
          {detail && <p className="text-xs text-[#626860] mt-0.5 leading-relaxed">{detail}</p>}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[#777C75] hover:text-[#202923] transition-colors flex-shrink-0 mt-0.5"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const BANNER_CONFIG = {
  success: {
    Icon: CheckCircle,
    bar: 'bg-[#286847]',
    icon_bg: 'bg-[#EAF2ED]',
    icon_color: 'text-[#286847]',
    label: 'Success',
  },
  error: {
    Icon: AlertCircle,
    bar: 'bg-[#B42318]',
    icon_bg: 'bg-[#FEE4E2]',
    icon_color: 'text-[#B42318]',
    label: 'Error',
  },
  info: {
    Icon: Info,
    bar: 'bg-[#194332]',
    icon_bg: 'bg-[#F3F0E9]',
    icon_color: 'text-[#194332]',
    label: 'Info',
  },
  logout: {
    Icon: LogOut,
    bar: 'bg-[#946019]',
    icon_bg: 'bg-[#FAF4EC]',
    icon_color: 'text-[#946019]',
    label: 'Signed Out',
  },
};

const DURATION = 3500;

interface AlertBannerProps {
  alerts: AlertPayload[];
  onDismiss: (id: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  return (
    <div
      className="fixed bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="sync">
        {alerts.map((alert) => (
          <SingleBanner key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function SingleBanner({
  alert,
  onDismiss,
}: {
  alert: AlertPayload;
  onDismiss: (id: string) => void;
}) {
  const cfg = BANNER_CONFIG[alert.type];
  const { Icon } = cfg;
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        onDismiss(alert.id);
      }
    }, 30);
    return () => clearInterval(intervalRef.current!);
  }, [alert.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onClick={() => {
        if (alert.onAction) {
          alert.onAction();
          onDismiss(alert.id);
        }
      }}
      className={`pointer-events-auto w-[320px] sm:w-[360px] bg-white border border-[#E7E5E0] rounded-2xl shadow-elevated overflow-hidden transition-all duration-200 ${
        alert.onAction
          ? 'cursor-pointer hover:bg-[#FAF8F4] active:scale-[0.98]'
          : ''
      }`}
    >
      <div className="h-[2px] w-full bg-[#E7E5E0]">
        <motion.div className={`h-full ${cfg.bar}`} style={{ width: `${progress}%` }} transition={{ duration: 0.03 }} />
      </div>

      <div className="flex items-start gap-3 p-4">
        <div className={`w-8 h-8 rounded-lg ${cfg.icon_bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4 ${cfg.icon_color}`} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[#202923] text-sm font-semibold leading-snug font-inter">{alert.message}</p>
          {alert.detail && <p className="text-[#626860] text-xs mt-0.5 leading-relaxed font-inter">{alert.detail}</p>}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(alert.id);
          }}
          className="text-[#777C75] hover:text-[#202923] transition-colors flex-shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
