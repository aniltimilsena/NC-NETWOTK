import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

export default function PermissionModal({ isOpen, onClose, onGrant, type = 'media' }) {
  const configs = {
    media: {
      title: 'Enable Experience',
      description: 'NC Network needs access to your camera and microphone for professional video calls and voice messaging.',
      icon: (
        <div className="flex gap-2">
          <div className="w-12 h-12 rounded-2xl bg-nc-accent/10 flex items-center justify-center text-nc-accent">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>
      ),
      permissions: [
        { label: 'Camera', detail: 'For high-quality video auditions' },
        { label: 'Microphone', detail: 'For crystal clear communication' }
      ]
    },
    photos: {
      title: 'Build Your Portfolio',
      description: 'Grant access to your photos to upload headshots, showreels, and professional media assets.',
      icon: (
        <div className="w-14 h-14 rounded-[1.5rem] bg-purple-500/10 flex items-center justify-center text-purple-400">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ),
      permissions: [
        { label: 'Photo Library', detail: 'Select and upload existing media' },
        { label: 'Storage', detail: 'Save project files and assets' }
      ]
    }
  };

  const config = configs[type] || configs.media;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-6">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0A0A0A]/90 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl p-8"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-8">{config.icon}</div>
              
              <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                {config.title}
              </h2>
              <p className="text-nc-muted text-sm leading-relaxed mb-8">
                {config.description}
              </p>

              <div className="w-full space-y-4 mb-10">
                {config.permissions.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-left p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-nc-accent shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                    <div>
                      <div className="text-white text-xs font-black uppercase tracking-wider">{p.label}</div>
                      <div className="text-[#666] text-[10px] font-medium">{p.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full space-y-3">
                <Button 
                  fullWidth 
                  onClick={onGrant}
                  className="rounded-2xl py-4 font-black uppercase tracking-[0.15em] shadow-xl shadow-nc-accent/20"
                >
                  Enable Access
                </Button>
                <button 
                  onClick={onClose}
                  className="text-[#555] hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors py-2"
                >
                  Maybe Later
                </button>
              </div>
            </div>

            {/* Subtle glow background */}
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-nc-accent/10 rounded-full blur-[80px]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
