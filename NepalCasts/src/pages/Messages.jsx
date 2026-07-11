import React from 'react';
import { useParams } from 'react-router-dom';
import MessagesPage from './messages/MessagesPage';

export default function Messages(props) {
  const { id } = useParams();
  return <MessagesPage {...props} initialUserId={id || null} />;
}
