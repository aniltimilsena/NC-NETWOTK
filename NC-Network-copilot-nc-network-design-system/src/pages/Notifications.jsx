import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
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
import Avatar from '../components/ui/Avatar';
import { 
  ChevronLeft, 
  MessageSquare, 
  PhoneMissed, 
  PhoneOff, 
  UserPlus, 
  Star, 
  Settings, 
  Trash2,
  Check
} from 'lucide-react';

// Helpers for notification rendering logic
const getNotificationDetails = (notif) => {
  const type = (notif.type || notif.notificationType || '').toLowerCase();
  const body = (notif.body || notif.message || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  const senderName = notif.senderName || 'Someone';

  // 1. Follow / New Follower
  if (type === 'follow' || title.includes('follow') || body.includes('following you') || body.includes('started following')) {
    return {
      type: 'follow',
      themeColor: 'emerald',
      iconName: 'follow',
      text: (
        <span>
          <span className="font-bold text-white mr-1">{senderName}</span>
          started following you
        </span>
      ),
    };
  }

  // 2. Casting alert
  if (type === 'casting' || title.includes('casting') || title.includes('application') || body.includes('casting') || body.includes('applied')) {
    let displayElement = (
      <span>
        New casting call matches your profile
      </span>
    );
    if (body.includes('applied to') || body.includes('application')) {
      const cleanBody = notif.body || notif.message || '';
      const actionText = cleanBody.startsWith(senderName) 
        ? cleanBody.substring(senderName.length) 
        : ` applied to your casting call: "${notif.title || ''}"`;

      displayElement = (
        <span>
          <span className="font-bold text-white mr-1">{senderName}</span>
          {actionText}
        </span>
      );
    }
    return {
      type: 'casting',
      themeColor: 'yellow',
      iconName: 'casting',
      text: displayElement,
    };
  }

  // 3. Messages & Calls
  if (type === 'messages' || type === 'message') {
    if (body.includes('missed') || title.includes('missed')) {
      return {
        type: 'missed_call',
        themeColor: 'red',
        iconName: 'missed_call',
        text: (
          <span>
            Missed a video call from
            <span className="font-bold text-white ml-1">{senderName}</span>
          </span>
        ),
      };
    }
    if (body.includes('cancelled') || title.includes('cancelled')) {
      return {
        type: 'call_cancelled',
        themeColor: 'amber',
        iconName: 'call_cancelled',
        text: (
          <span>
            Video call cancelled by caller
          </span>
        ),
      };
    }
    // Message received
    return {
      type: 'message_received',
      themeColor: 'blue',
      iconName: 'message_received',
      text: (
        <span>
          <span className="font-bold text-white mr-1">{senderName}</span>
          sent you a message
        </span>
      ),
    };
  }

  // 4. System / Default
  return {
    type: 'system',
    themeColor: 'gray',
    iconName: 'system',
    text: (
      <span>
        {notif.body || notif.message || "System update"}
      </span>
    ),
  };
};

const renderIconCircle = (iconName) => {
  let IconComponent = Settings;
  let colorClasses = 'bg-gray-500/10 border-gray-500/20 text-gray-400';

  if (iconName === 'message_received') {
    IconComponent = MessageSquare;
    colorClasses = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  } else if (iconName === 'missed_call') {
    IconComponent = PhoneMissed;
    colorClasses = 'bg-red-500/10 border-red-500/20 text-red-500';
  } else if (iconName === 'call_cancelled') {
    IconComponent = PhoneOff;
    colorClasses = 'bg-amber-500/10 border-amber-500/20 text-amber-500';
  } else if (iconName === 'follow') {
    IconComponent = UserPlus;
    colorClasses = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
  } else if (iconName === 'casting') {
    IconComponent = Star;
    colorClasses = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
  } else if (iconName === 'system') {
    IconComponent = Settings;
    colorClasses = 'bg-gray-500/10 border-gray-500/20 text-gray-400';
  }

  return (
    <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
      <IconComponent className="w-5 h-5" />
    </div>
  );
};

// Swipable individual notification card component
function NotificationCard({ 
  notif, 
  followingIds, 
  handleFollowBack, 
  markAsRead, 
  deleteNotification, 
  handleNotificationClick,
  timeAgo
}) {
  const controls = useAnimation();
  const [isSwiped, setIsSwiped] = useState(false);

  const details = getNotificationDetails(notif);
  const showAvatar = details.iconName === 'message_received' || details.iconName === 'missed_call' || details.iconName === 'call_cancelled';

  // Handle snapping of the swipe card
  const handleDragEnd = (event, info) => {
    if (info.offset.x < -30) {
      controls.start({ x: -80 });
      setIsSwiped(true);
    } else {
      controls.start({ x: 0 });
      setIsSwiped(false);
    }
  };

  const handleCardClick = () => {
    if (isSwiped) {
      controls.start({ x: 0 });
      setIsSwiped(false);
    } else {
      handleNotificationClick(notif);
    }
  };

  // Styling properties
  // Unread: slightly brighter bg (#1a2744), bold name text, blue left border (3px)
  // Read: dark bg #111, normal text
  const cardBgClass = notif.read 
    ? 'bg-[#111111] border-l-[3px] border-l-transparent hover:bg-white/[0.02]' 
    : 'bg-[#1a2744] border-l-[3px] border-l-[#00BFFF] hover:bg-[#203154]';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] w-full">
      {/* Delete button (revealed underneath card when swiped left) */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-600 rounded-r-2xl z-0">
        <button
          onClick={(e) => deleteNotification(e, notif.id)}
          className="w-full h-full flex items-center justify-center text-white transition-colors hover:bg-red-700 active:bg-red-800"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Main draggable Card UI */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        animate={controls}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        className={`relative z-10 p-4 cursor-pointer transition-colors duration-200 flex items-center gap-4 select-none ${cardBgClass} w-full`}
      >
        {/* Left icon / Avatar */}
        {showAvatar && (notif.senderAvatar || notif.senderName) ? (
          <Avatar 
            src={notif.senderAvatar} 
            name={notif.senderName} 
            size="sm" 
            className="!w-10 !h-10 !rounded-full border-none shrink-0" 
          />
        ) : (
          renderIconCircle(details.iconName)
        )}

        {/* Middle content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className={`text-sm leading-snug break-words ${notif.read ? 'text-[#888888] font-normal' : 'text-white font-semibold'}`}>
            {details.text}
          </div>

          {/* Follow Back Button for follow notifications */}
          {(notif.type === 'follow' || notif.notificationType === 'follow') && notif.senderId && (
            <div className="mt-2">
              {followingIds.has(notif.senderId) ? (
                <button
                  disabled
                  className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                >
                  Following
                </button>
              ) : (
                <button
                  onClick={(e) => handleFollowBack(e, notif.senderId)}
                  className="px-3 py-1 rounded-xl bg-[#00BFFF] hover:bg-[#0099e6] text-[#0A0A0A] text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                >
                  Follow Back
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side: Timestamp & Unread checkmark button */}
        <div className="flex flex-col items-end gap-1.5 self-start pt-0.5 shrink-0">
          <span className="text-[11px] text-nc-muted font-medium">
            {timeAgo(notif.createdAt?.seconds)}
          </span>
          
          {!notif.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markAsRead(notif.id);
              }}
              className="group/btn relative w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              title="Mark as read"
            >
              <span className="absolute w-2 h-2 rounded-full bg-[#00BFFF] group-hover/btn:opacity-0 transition-opacity" />
              <Check className="w-3.5 h-3.5 text-[#00BFFF] opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

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
    if (!seconds) return 'Just now';
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

  const renderSectionHeader = (label) => (
    <div className="flex items-center gap-3 my-5">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="h-[1px] w-full bg-white/5" />
    </div>
  );

  const renderGroupList = (groupItems) => (
    <ul className="space-y-3 w-full">
      <AnimatePresence initial={false}>
        {groupItems.map((notif) => (
          <motion.li
            key={notif.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <NotificationCard
              notif={notif}
              followingIds={followingIds}
              handleFollowBack={handleFollowBack}
              markAsRead={markAsRead}
              deleteNotification={deleteNotification}
              handleNotificationClick={handleNotificationClick}
              timeAgo={timeAgo}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header Container */}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pt-4 sm:pt-6">
        {/* Redesigned Header: Back Arrow on left, Centered title, Mark all read on right in cyan */}
        <div className="grid grid-cols-3 items-center mb-6 pb-2">
          <div className="flex justify-start">
            <button
              onClick={() => onNavigate('home')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-center">
            <h1 className="text-base font-bold text-white tracking-tight whitespace-nowrap">
              Notifications
            </h1>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className={`text-xs font-bold transition-colors px-3 py-1.5 rounded-lg ${
                unreadCount > 0
                  ? 'text-[#00BFFF] hover:text-[#0099e6] hover:bg-white/5 cursor-pointer'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              Mark all read
            </button>
          </div>
        </div>

        {/* Filter Tabs Pills row: All | Unread | Messages | Casting | System */}
        <div className="relative flex gap-2 border-b border-white/5 pb-3 overflow-x-auto scrollbar-hide">
          {filters.map(f => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#00BFFF] text-white shadow-[0_0_12px_rgba(0,191,255,0.25)]' 
                    : 'bg-[#111111] text-gray-400 hover:text-white hover:bg-white/[0.02] border border-white/5'
                }`}
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  {f.label}
                  {f.id === 'unread' && unreadCount > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-black/20 text-white' : 'bg-[#1a2744] text-[#00BFFF]'}`}>
                      {unreadCount}
                    </span>
                  )}
                </span>

                {/* Smooth slide underline transition */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-[-13px] left-0 right-0 h-[2.5px] bg-[#00BFFF] rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification List Container */}
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
            <div className="w-16 h-16 rounded-2xl bg-[#111111] flex items-center justify-center mx-auto mb-4 text-[#555] border border-white/5">
              <Settings className="w-8 h-8" />
            </div>
            <p className="text-white font-bold text-lg">{getEmptyStateText().title}</p>
            <p className="text-[#555] text-sm mt-1">{getEmptyStateText().desc}</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4 w-full">
            {grouped.today.length > 0 && (
              <div>
                {renderSectionHeader('Today')}
                {renderGroupList(grouped.today)}
              </div>
            )}
            {grouped.yesterday.length > 0 && (
              <div>
                {renderSectionHeader('Yesterday')}
                {renderGroupList(grouped.yesterday)}
              </div>
            )}
            {grouped.earlier.length > 0 && (
              <div>
                {renderSectionHeader('Earlier')}
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
