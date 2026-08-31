import React from 'react';
import { Route, useParams } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const CallPage = lazyWithRetry(() => import('../features/call/CallPage'));

const CallWrapper = () => {
  const { callId } = useParams();
  return <CallPage initialCallId={callId} />;
};

export const CallsRoutes = () => (
  <>
    <Route path="/call" element={<CallPage />} />
    <Route path="/calls" element={<CallPage />} />
    <Route path="/calls/history" element={<CallPage filter="history" />} />
    <Route path="/calls/missed" element={<CallPage filter="missed" />} />
    <Route path="/calls/:callId" element={<CallWrapper />} />
  </>
);
