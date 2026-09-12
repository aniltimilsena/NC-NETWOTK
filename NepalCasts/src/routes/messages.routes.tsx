import React from 'react';
import { Route, useParams, useSearchParams } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const Messages = lazyWithRetry(() => import('../features/messages/MessagesPage'));

interface MessagesRouteProps {
  user?: any;
  onNavigate?: (page: string, param?: any) => void;
  showAlert?: any;
}

const MessagesWrapper = ({ onNavigate, user, showAlert }: MessagesRouteProps) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const queryUserId = searchParams.get('userId') || searchParams.get('user') || searchParams.get('id') || searchParams.get('recipientId');
  const conversationId = params.conversationId || params.id || queryUserId;
  const subView = params.sub;

  return (
    <Messages
      onNavigate={onNavigate || (() => {})}
      user={user}
      showAlert={showAlert}
      initialConversationId={conversationId}
      initialUserId={queryUserId || conversationId}
      activeSubView={subView}
    />
  );
};

export const MessagesRoutes = ({ onNavigate, user, showAlert }: MessagesRouteProps) => (
  <>
    <Route path="/messages" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId/:sub" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
  </>
);
