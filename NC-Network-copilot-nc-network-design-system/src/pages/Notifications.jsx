import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit, doc, updateDoc } from 'firebase/firestore';

export default function Notifications({ onNavigate, user }) {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'messages', label: 'Messages' },
    { id: 'casting', label: 'Casting' },
    { id: 'system', label: 'System' },
  ];

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          limit(100) // Fetch more to allow client-side sorting
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Client-side sort by createdAt desc
        items.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setNotifications(items);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.uid]);

  const getDemoNotifications = () => [];

  const markAsRead = async (notifId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'notifications', notifId), { read: true });
      } catch (err) {
        // Silently fail — already updated locally
      }
    }
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const timeAgo = (seconds) => {
    if (!seconds) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - seconds;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 604800)}w ago`;
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'messages':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'casting':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const typeColor = (type) => {
    switch (type) {
      case 'messages': return 'text-purple-400 bg-purple-400/10';
      case 'casting': return 'text-nc-accent bg-nc-accent/10';
      case 'system': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-white bg-white/10';
    }
  };

  return (
    <div className="min-h-screen bg-nc-dark">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('home')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-nc-accent font-medium">{unreadCount} unread</p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-bold text-nc-accent hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-nc-accent text-black'
                  : 'bg-white/5 text-[#888] hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {f.label}
              {f.id === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pb-24">
        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-3 bg-white/5 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-[#555]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-white font-bold text-lg">No notifications</p>
            <p className="text-[#555] text-sm mt-1">
              {filter === 'unread' ? "You're all caught up!" : "Nothing here yet. Stay tuned!"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2 mt-4">
            <AnimatePresence>
              {filtered.map((notif, i) => (
                <motion.li
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => markAsRead(notif.id)}
                  className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                    notif.read
                      ? 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                      : 'bg-white/5 border-nc-accent/20 hover:bg-white/10'
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-nc-accent shadow-[0_0_8px_rgba(0,200,255,0.4)]" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor(notif.type)}`}>
                      {typeIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-sm font-bold truncate ${notif.read ? 'text-[#aaa]' : 'text-white'}`}>
                          {notif.title}
                        </h3>
                      </div>
                      <p className={`text-xs leading-relaxed ${notif.read ? 'text-[#555]' : 'text-[#888]'}`}>
                        {notif.body}
                      </p>
                      <span className="text-[10px] text-[#444] mt-2 block font-medium">
                        {timeAgo(notif.createdAt?.seconds)}
                      </span>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
