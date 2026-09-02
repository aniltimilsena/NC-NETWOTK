import { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../../context/CallContext';
import { getProfile } from '../../../services';
import Avatar from '../../../components/ui/Avatar';
export default function IncomingCallPopup() {
    const { incomingCall, acceptCall, rejectCall } = useCall();
    const [callerProfile, setCallerProfile] = useState<any>(null);
    const callerId = incomingCall?.callerId;
    useEffect(() => {
        if (!callerId) {
            setCallerProfile(null);
            return;
        }
        let isMounted = true;
        getProfile(callerId).then((res) => {
            if (isMounted && res.data) {
                setCallerProfile(res.data);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [callerId]);
    if (!incomingCall)
        return null;
    const callerName = callerProfile?.name || incomingCall.callerName || 'Unknown Caller';
    const callerPhoto = callerProfile?.image || incomingCall.callerPhoto || '';
    const callerProfession = callerProfile?.role || 'Talent';
    return (<AnimatePresence>
      <motion.div key="incoming-call-popup" initial={{ y: -100, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -100, opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[9999] p-4 sm:p-5 rounded-3xl bg-[#12121A]/95 border border-white/15 shadow-2xl backdrop-blur-xl select-none">
        <div className="flex flex-col gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-nc-accent/30 animate-ping opacity-75" style={{ animationDuration: '2s' }}/>
              <Avatar userId={incomingCall.callerId} src={callerPhoto} name={callerName} gender={callerProfile?.gender} size="md" className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-nc-accent/40 relative z-10"/>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-base sm:text-lg font-black tracking-tight truncate leading-tight">
                {callerName}
              </h3>
              {callerProfession && (<p className="text-white/50 text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate mb-0.5">
                  {callerProfession}
                </p>)}
              <p className="text-nc-accent text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <span className="truncate">Incoming Audio Call</span>
              </p>
            </div>
          </div>

          
          <div className="flex items-center gap-2 sm:gap-3">
            
            <button onClick={rejectCall} className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-all active:scale-95">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <span>Decline</span>
            </button>

            
            <button onClick={acceptCall} className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-2xl bg-green-500 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-green-400 transition-all active:scale-95 shadow-lg shadow-green-500/30 border border-green-400/50">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <span>Accept</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>);
}
