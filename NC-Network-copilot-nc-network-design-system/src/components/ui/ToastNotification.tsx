import { motion } from 'framer-motion';
import { CheckCircle, LogOut, Info, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'logout' | 'info' | 'error';
  onClose: () => void;
}

export default function ToastNotification({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { 
      icon: CheckCircle, 
      color: 'text-nc-accent', 
      bg: 'bg-nc-accent/10', 
      border: 'border-nc-accent/20',
      shadow: 'shadow-nc-accent/10',
      title: 'Success'
    },
    logout: { 
      icon: LogOut, 
      color: 'text-red-400', 
      bg: 'bg-red-400/10', 
      border: 'border-red-400/20',
      shadow: 'shadow-red-400/10',
      title: 'Profile Status'
    },
    info: { 
      icon: Info, 
      color: 'text-sky-400', 
      bg: 'bg-sky-400/10', 
      border: 'border-sky-400/20',
      shadow: 'shadow-sky-400/10',
      title: 'Information'
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      shadow: 'shadow-red-500/10',
      title: 'Alert'
    }
  };

  const { icon: Icon, color, bg, border, shadow, title } = config[type];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
        className={`w-full max-w-sm bg-[#0D0D0D]/90 backdrop-blur-2xl border ${border} ${shadow} rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center pointer-events-auto`}
      >
        <div className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center mb-4`}>
          <Icon className={`w-8 h-8 ${color}`} strokeWidth={1.5} />
        </div>
        
        <h4 className="text-[#888] text-[10px] uppercase font-black tracking-[0.3em] mb-1">{title}</h4>
        <p className="text-white text-lg font-bold tracking-tight leading-tight">{message}</p>
        
        <div className="mt-6 w-12 h-0.5 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ x: '-100%' }}
               animate={{ x: '100%' }}
               transition={{ duration: 2.5, ease: "linear" }}
               className={`w-full h-full ${bg} ${color.replace('text', 'bg')}`}
             />
        </div>
      </motion.div>
    </div>
  );
}
