import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export default function PermissionModal({ isOpen, onClose, onGrant, type = 'media' }) {
    const configs = {
        media: {
            title: 'Enable Experience',
            description: 'NepalCasts needs access to your camera and microphone for professional video calls and voice messaging.',
            icon: (<div className="flex gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-nc-accent/10 flex items-center justify-center text-nc-accent">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
          </div>
        </div>),
            permissions: [
                { label: 'Camera', detail: 'For high-quality video auditions' },
                { label: 'Microphone', detail: 'For crystal clear communication' }
            ]
        },
        photos: {
            title: 'Build Your Portfolio',
            description: 'Grant access to your photos to upload headshots, showreels, and professional media assets.',
            icon: (<div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>),
            permissions: [
                { label: 'Photo Library', detail: 'Select and upload existing media' },
                { label: 'Storage', detail: 'Save project files and assets' }
            ]
        },
        'media-blocked': {
            title: 'Permissions Blocked',
            description: 'Camera and microphone access is blocked in your browser settings. Please allow access in your browser address bar to make video and audio calls.',
            icon: (<div className="flex gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
          </div>
        </div>),
            permissions: [
                { label: '1. Click Address Bar Icon', detail: 'Click the lock or site settings icon next to the URL.' },
                { label: '2. Change to Allow', detail: 'Set Camera and Microphone permissions to "Allow".' }
            ]
        }
    };
    const config = configs[type] || configs.media;
    const isBlocked = type === 'media-blocked';
    const grantLabel = isBlocked ? 'Try Again' : 'Enable Access';
    const closeLabel = isBlocked ? 'Close' : 'Maybe Later';
    return (<AnimatePresence>
      {isOpen && (<div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0A0A0A]/90 backdrop-blur-md"/>

          
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="relative w-full max-w-[340px] bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5">{config.icon}</div>
              
              <h2 className="text-xl font-black text-white mb-2 tracking-tight">
                {config.title}
              </h2>
              <p className="text-nc-muted text-xs leading-relaxed mb-5 max-w-[270px]">
                {config.description}
              </p>

              
              <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-3 mb-6">
                {config.permissions.map((p, idx) => (<div key={idx} className="flex items-start gap-3 text-left">
                    <div className="w-1.5 h-1.5 rounded-full bg-nc-accent mt-1.5 shadow-[0_0_8px_rgba(56,189,248,0.5)] shrink-0"/>
                    <div>
                      <div className="text-white text-xs font-bold leading-none">{p.label}</div>
                      <div className="text-[#666] text-[10px] mt-1.5 font-medium">{p.detail}</div>
                    </div>
                  </div>))}
              </div>

              
              <div className="flex gap-2.5 w-full">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-bold text-nc-muted hover:text-white hover:bg-white/5 transition-all">
                  {closeLabel}
                </button>
                <button onClick={onGrant} className="flex-1 py-3 rounded-xl bg-nc-accent hover:bg-nc-accent/90 text-black text-xs font-bold shadow-lg shadow-nc-accent/15 transition-all active:scale-[0.98]">
                  {grantLabel}
                </button>
              </div>
            </div>

            
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-nc-accent/5 rounded-full blur-[80px]"/>
          </motion.div>
        </div>)}
    </AnimatePresence>);
}
