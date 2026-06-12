import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  limit, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  setDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { formatMessagePreview } from '../utils/format';

export default function Notifications({ onNavigate, user }) {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [visibleLimit, setVisibleLimit] = useState(15);
  const [hasMore, setHasMore] = useState(false);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'messages', label: 'Messages' },
    { id: 'casting', label: 'Casting' },
    { id: 'system', label: 'System' },
  ];

  // Subscribe to follows to track who the user is currently following back in real-time
  useEffect(() => {
    if (!user?.uid) {
      setFollowingIds(new Set());
      return;
    }
    const q = query(collection(db, 'follows'), where('followerId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const ids = new Set(snapshot.docs.map(docSnap => docSnap.data().followingId));
      setFollowingIds(ids);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        console.error("Follows subscription failed:", err);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to notifications collection
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Fetch visibleLimit + 1 to check if there are more items for pagination
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(visibleLimit + 1)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by createdAt desc
      items.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      if (items.length > visibleLimit) {
        setHasMore(true);
        setNotifications(items.slice(0, visibleLimit));
      } else {
        setHasMore(false);
        setNotifications(items);
      }
      setLoading(false);
    }, (err) => {
      console.error('Failed to subscribe to notifications:', err);
      setNotifications([]);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, visibleLimit]);

  const markAsRead = async (notifId) => {
    // Optimistic UI update
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, read: true, isRead: true } : n)
    );
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'notifications', notifId), { read: true, isRead: true });
      } catch (err) {
        console.warn("Could not mark notification as read in Firestore:", err);
      }
    }
  };

  const deleteNotification = async (e, notifId) => {
    e.stopPropagation();
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    if (user?.uid) {
      try {
        await deleteDoc(doc(db, 'notifications', notifId));
      } catch (err) {
        console.warn("Could not delete notification in Firestore:", err);
      }
    }
  };

  const handleNotificationClick = async (notif) => {
    await markAsRead(notif.id);
    
    // Resolve navigation target
    const target = notif.targetUrl || notif.profileUrl;
    if (target) {
      if (target.startsWith('/profile/')) {
        const id = target.split('/').pop();
        if (id) onNavigate('profile', id);
      } else if (target.startsWith('/messages/')) {
        const id = target.split('/').pop();
        if (id) onNavigate('messages', id);
      } else if (target.startsWith('/casting/')) {
        const id = target.split('/').pop();
        if (id) onNavigate('casting-detail', id);
      } else if (target === '/premium') {
        onNavigate('premium');
      } else {
        onNavigate('home');
      }
    } else if (notif.type === 'follow' && notif.senderId) {
      onNavigate('profile', notif.senderId);
    }
  };

  const handleFollowBack = async (e, senderId) => {
    e.stopPropagation();
    if (!user?.uid) return;

    const followId = `${user.uid}_${senderId}`;
    const followDocRef = doc(db, "follows", followId);

    try {
      // Create follow document
      await setDoc(followDocRef, {
        followerId: user.uid,
        followingId: senderId,
        createdAt: serverTimestamp()
      });

      // Send follow notification back (deterministic ID)
      const notifId = `${user.uid}_${senderId}_follow`;
      await setDoc(doc(db, "notifications", notifId), {
        userId: senderId,
        recipientId: senderId,
        receiverId: senderId,
        senderId: user.uid,
        notificationType: "follow",
        type: "follow",
        isRead: false,
        read: false,
        createdAt: serverTimestamp(),
        profileUrl: `/profile/${user.uid}`,
        targetUrl: `/profile/${user.uid}`,
        title: "New Follower",
        body: `${user.displayName || user.email || 'Someone'} started following you.`,
        senderName: user.displayName || 'Someone',
        senderAvatar: user.photoURL || ''
      }, { merge: true });

      // Increment counters
      await updateDoc(doc(db, "profiles", senderId), { followers: increment(1) });
      await updateDoc(doc(db, "profiles", user.uid), { following: increment(1) });
      try {
        await updateDoc(doc(db, "users", senderId), { followers: increment(1) });
        await updateDoc(doc(db, "users", user.uid), { following: increment(1) });
      } catch (err) {
        console.warn("Could not sync follows stats to user doc:", err);
      }
    } catch (err) {
      console.error("Error following back:", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    try {
      const promises = unreadNotifs.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { read: true, isRead: true })
      );
      await Promise.all(promises);
    } catch (err) {
      console.warn("Failed to mark all read:", err);
    }
  };

  const loadMore = () => {
    setVisibleLimit(prev => prev + 15);
  };

  // Grouping logic for dates
  const groupNotifications = (list) => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    list.forEach(notif => {
      const time = notif.createdAt?.seconds ? notif.createdAt.seconds * 1000 : Date.now();
      if (time >= startOfToday) {
        today.push(notif);
      } else if (time >= startOfYesterday) {
        yesterday.push(notif);
      } else {
        earlier.push(notif);
      }
    });

    return { today, yesterday, earlier };
  };

  // Filter logic based on active tab
  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter || n.notificationType === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const grouped = groupNotifications(filtered);

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

  const getEmptyStateText = () => {
    switch (filter) {
      case 'unread': return { title: "You're all caught up!", desc: "No unread notifications." };
      case 'messages': return { title: "No messages yet", desc: "Start conversations to see updates." };
      case 'casting': return { title: "No casting updates", desc: "Apply to casting calls to receive notices." };
      case 'system': return { title: "No system updates", desc: "Announcements and alerts will appear here." };
      default: return { title: "No notifications", desc: "Nothing here yet. Stay tuned!" };
    }
  };

  const typeIcon = (notif) => {
    const type = notif.type || notif.notificationType;
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
      case 'follow':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  const typeColor = (notif) => {
    const type = notif.type || notif.notificationType;
    switch (type) {
      case 'messages': return 'text-purple-400 bg-purple-400/10';
      case 'casting': return 'text-nc-accent bg-nc-accent/10';
      case 'follow': return 'text-nc-accent bg-nc-accent/10';
      case 'system': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-white bg-white/10';
    }
  };

  const renderGroupList = (groupItems) => (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {groupItems.map((notif) => (
          <motion.li
            key={notif.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleNotificationClick(notif)}
            className={`relative p-4 rounded-2xl cursor-pointer transition-all border group ${
              notif.read
                ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                : 'bg-white/5 border-nc-accent/20 hover:bg-white/10'
            }`}
          >
            {/* Unread dot */}
            {!notif.read && (
              <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-nc-accent shadow-[0_0_8px_rgba(0,200,255,0.4)]" />
            )}

            <div className="flex items-start gap-4">
              {/* Icon / Avatar */}
              {notif.senderAvatar ? (
                <img 
                  src={notif.senderAvatar} 
                  alt={notif.senderName || 'Avatar'} 
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor(notif)}`}>
                  {typeIcon(notif)}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className={`text-sm font-bold truncate ${notif.read ? 'text-[#aaa]' : 'text-white'}`}>
                    {notif.title}
                  </h3>
                </div>
                <p className={`text-xs leading-relaxed ${notif.read ? 'text-[#555]' : 'text-[#888]'}`}>
                  {formatMessagePreview(notif.body || notif.message)}
                </p>

                {/* Follow Back Button for follow notifications */}
                {(notif.type === 'follow' || notif.notificationType === 'follow') && notif.senderId && (
                  <div className="mt-3">
                    {followingIds.has(notif.senderId) ? (
                      <button
                        disabled
                        className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[#555] text-xs font-bold uppercase tracking-wide cursor-not-allowed"
                      >
                        Following
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleFollowBack(e, notif.senderId)}
                        className="px-4 py-1.5 rounded-xl bg-nc-accent hover:bg-sky-400 text-[#0A0A0A] text-xs font-black uppercase tracking-wide transition-all active:scale-95"
                      >
                        Follow Back
                      </button>
                    )}
                  </div>
                )}

                <span className="text-[10px] text-[#444] mt-2 block font-medium">
                  {timeAgo(notif.createdAt?.seconds)}
                </span>
              </div>

              {/* Inline Action Controls (Mark read, Delete) */}
              <div className="absolute right-4 bottom-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notif.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notif.id);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-nc-accent/15 text-nc-muted hover:text-nc-accent transition-colors"
                    title="Mark as read"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={(e) => deleteNotification(e, notif.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-nc-muted hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );

  return (
    <div className="min-h-screen bg-nc-dark">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pt-24 sm:pt-28 pb-4">
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
              onClick={handleMarkAllRead}
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
            <p className="text-white font-bold text-lg">{getEmptyStateText().title}</p>
            <p className="text-[#555] text-sm mt-1">{getEmptyStateText().desc}</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {grouped.today.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Today</h4>
                {renderGroupList(grouped.today)}
              </div>
            )}
            {grouped.yesterday.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Yesterday</h4>
                {renderGroupList(grouped.yesterday)}
              </div>
            )}
            {grouped.earlier.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Earlier</h4>
                {renderGroupList(grouped.earlier)}
              </div>
            )}

            {/* Load More Pagination Trigger */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-bold tracking-wide transition-all active:scale-95"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
