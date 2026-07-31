import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const Messages = lazy(() => import('../features/messages/MessagesPage'));

const MessagesWrapper = ({ onNavigate, user, showAlert }: any) => {
  const params = useParams();
  const conversationId = params.conversationId || params.id;
  const subView = params.sub;

  return (
    <Messages
      onNavigate={onNavigate}
      user={user}
      showAlert={showAlert}
      initialConversationId={conversationId}
      activeSubView={subView}
    />
  );
};

export const MessagesRoutes = ({ onNavigate, user, showAlert }: any) => (
  <>
    <Route path="/messages" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId/media" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId/files" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId/links" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId/info" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:conversationId/search" element={<MessagesWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
  </>
);
