import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const Messages = lazy(() => import('../features/messages/MessagesPage'));

interface MessagesRouteProps {
  user?: any;
  onNavigate?: (page: string, param?: any) => void;
  showAlert?: any;
}

const MessagesWrapper = ({ onNavigate, user, showAlert }: MessagesRouteProps) => {
  const params = useParams();
  const conversationId = params.conversationId || params.id;
  const subView = params.sub;

  return (
    <Messages
      onNavigate={onNavigate || (() => {})}
      user={user}
      showAlert={showAlert}
      initialConversationId={conversationId}
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
