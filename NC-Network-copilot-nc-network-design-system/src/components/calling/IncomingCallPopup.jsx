import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';

export default function IncomingCallPopup() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <AnimatePresence>
      <motion.div
        key="incoming-call"
        initial={{ y: -100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[9999] md:max-w-sm"
      >
        <div className="bg-[#111]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/50">
          {/* Top indicator line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-nc-accent rounded-full -translate-y-3 animate-pulse" />

          {/* Caller info */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            {/* Avatar with ring animation */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1.5 rounded-full border-2 border-green-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-white/10 bg-[#1A1A1A]">
                {incomingCall.callerPhoto ? (
                  <img
                    src={incomingCall.callerPhoto}
                    alt={incomingCall.callerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg sm:text-xl font-black text-white/30">
                    {(incomingCall.callerName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-black text-sm sm:text-base truncate">
                {incomingCall.callerName || 'Unknown Caller'}
              </h3>
              <p className="text-nc-accent text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                {isVideo ? (
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                )}
                <span className="truncate">Incoming {isVideo ? 'Video' : 'Audio'} Call</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Decline */}
            <button
              onClick={rejectCall}
              className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-all active:scale-95"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Decline</span>
            </button>

            {/* Accept */}
            <button
              onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl bg-green-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all active:scale-95"
            >
              {isVideo ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              )}
              <span>Accept</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
