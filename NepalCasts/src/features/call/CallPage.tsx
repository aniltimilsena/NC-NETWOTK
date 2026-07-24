import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCall } from '../../context/CallContext';

export default function CallPage() {
  const [searchParams] = useSearchParams();
  const { initiateCall } = useCall();
  const hasInitiated = useRef(false);

  useEffect(() => {
    const initiate = searchParams.get('initiate');
    const type = searchParams.get('type') as 'audio' | 'video';
    const calleeId = searchParams.get('calleeId');
    const calleeName = searchParams.get('calleeName');
    const calleePhoto = searchParams.get('calleePhoto');

    if (initiate === 'true' && type && calleeId && !hasInitiated.current) {
      hasInitiated.current = true;
      initiateCall({
        calleeId,
        calleeName: calleeName || 'User',
        calleePhoto: calleePhoto || '',
        callType: type,
      });
    }
  }, [searchParams, initiateCall]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center animate-pulse mb-4">
        <span className="text-2xl text-[#00BFFF]">📞</span>
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Call Session</h1>
      <p className="text-nc-muted text-sm max-w-xs">
        Active call session is running in this tab. You can keep this tab open for the duration of the call.
      </p>
    </div>
  );
}
