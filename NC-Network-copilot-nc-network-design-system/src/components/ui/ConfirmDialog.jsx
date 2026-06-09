import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "default" // 'default', 'danger'
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-[240px] bg-[#1A1A1A]/90 border border-white/10 backdrop-blur-xl rounded-[1.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-4">
              <h3 className="text-base font-bold text-white mb-1">{title}</h3>
              <p className="text-white/60 text-[12px] leading-relaxed mb-5">
                {description}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[12px] font-medium transition-colors border border-white/5"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all transform active:scale-95 shadow-lg ${
                    type === 'danger' 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                      : 'bg-nc-accent hover:opacity-90 text-[#0A0A0A]'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
