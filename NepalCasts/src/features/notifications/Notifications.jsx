import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, where, limit, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import Avatar from '../../components/ui/Avatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { cacheManager } from '../../utils/cacheManager';
import { NotificationSkeleton } from '../../components/ui/Skeleton';
import { ChevronLeft, MessageSquare, PhoneMissed, PhoneOff, UserPlus, Clapperboard, Settings, Check } from 'lucide-react';
import { subscribeToUserFollows, toggleFollowUser } from '../profile/services/users';
import { useApp } from '../../providers/AppProviders';
const getNotificationDetails = (notif) => {
    const type = (notif.type || notif.notificationType || '').toLowerCase();
    const body = (notif.body || notif.message || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    const senderName = notif.senderName || 'Someone';
    if (type === 'follow' || title.includes('follow') || title.includes('connect') || body.includes('following you') || body.includes('started following') || body.includes('connected with you')) {
        return {
            type: 'follow',
            themeColor: 'emerald',
            iconName: 'follow',
            text: (<span>
                <span className="font-semibold text-[#202923] mr-1">{senderName}</span>
                connected with you
            </span>),
        };
    }
    if (type === 'casting' || type === 'casting_status' || type === 'casting_application' || title.includes('casting') || title.includes('application') || body.includes('casting') || body.includes('applied') || body.includes('shortlisted') || body.includes('accepted') || body.includes('rejected')) {
        let displayElement;
        const cleanBody = notif.body || notif.message || '';
        const callTitle = notif.title || 'Casting Call';
        
        if (body.includes('shortlisted') || notif.status === 'shortlisted') {
            displayElement = (<span>
                <span className="font-semibold text-[#202923] mr-1">{senderName}</span>
                shortlisted your application for <span className="text-[#194332] font-semibold">"{callTitle}"</span>
            </span>);
        } else if (body.includes('accepted') || notif.status === 'accepted') {
            displayElement = (<span>
                <span className="font-semibold text-[#202923] mr-1">{senderName}</span>
                accepted your application for <span className="text-[#286847] font-semibold">"{callTitle}"</span>
            </span>);
        } else if (body.includes('rejected') || notif.status === 'rejected') {
            displayElement = (<span>
                <span className="font-semibold text-[#202923] mr-1">{senderName}</span>
                updated your application status for <span className="text-[#626860] font-semibold">"{callTitle}"</span>
            </span>);
        } else if (body.includes('applied to') || body.includes('applied')) {
            const roleInfo = notif.roleName ? ` for role "${notif.roleName}"` : '';
            displayElement = (<span>
                <span className="font-semibold text-[#202923] mr-1">{senderName}</span>
                applied to your casting call: <span className="text-[#194332] font-semibold">"{callTitle}"</span>{roleInfo}
            </span>);
        } else if (cleanBody) {
            displayElement = (<span>
                {cleanBody.startsWith(senderName) ? (
                    <>
                        <span className="font-semibold text-[#202923] mr-1">{senderName}</span>
                        {cleanBody.substring(senderName.length)}
                    </>
                ) : (
                    <span>{cleanBody}</span>
                )}
            </span>);
        } else {
            displayElement = (<span>
                New casting update for <span className="text-[#194332] font-semibold">"{callTitle}"</span>
            </span>);
        }

        return {
            type: 'casting',
            themeColor: body.includes('shortlisted') ? 'amber' : body.includes('accepted') ? 'emerald' : 'white',
            iconName: 'casting',
            text: displayElement,
        };
    }
    if (type === 'messages' || type === 'message') {
        if (body.includes('missed') || title.includes('missed')) {
            return {
                type: 'missed_call',
                themeColor: 'red',
                iconName: 'missed_call',
                text: (<span>
                    Missed a video call from
                    <span className="font-semibold text-[#202923] ml-1">{senderName}</span>
                </span>),
            };
        }
        if (body.includes('cancelled') || title.includes('cancelled')) {
            return {
                type: 'call_cancelled',
                themeColor: 'amber',
                iconName: 'call_cancelled',
                text: (<span>
                    Video call cancelled by caller
                </span>),
            };
        }
        return {
            type: 'message_received',
            themeColor: 'blue',
            iconName: 'message_received',
            text: (<span>
                <span className="font-semibold text-[#202923] mr-1">{senderName}</span>
                sent you a message
            </span>),
        };
    }
    return {
        type: 'system',
        themeColor: 'gray',
        iconName: 'system',
        text: (<span>
            {notif.body || notif.message || "System update"}
        </span>),
    };
};
const renderIconCircle = (iconName) => {
    let IconComponent = Settings;
    let colorClasses = 'bg-[#FAF8F4] border-[#E7E5E0] text-[#194332]';
    if (iconName === 'message_received') {
        IconComponent = MessageSquare;
        colorClasses = 'bg-[#EAF2ED] border-[#194332]/20 text-[#194332]';
    }
    else if (iconName === 'missed_call') {
        IconComponent = PhoneMissed;
        colorClasses = 'bg-red-50 border-red-200 text-red-600';
    }
    else if (iconName === 'call_cancelled') {
        IconComponent = PhoneOff;
        colorClasses = 'bg-amber-50 border-amber-200 text-amber-600';
    }
    else if (iconName === 'follow') {
        IconComponent = UserPlus;
        colorClasses = 'bg-[#EAF2ED] border-[#194332]/20 text-[#194332]';
    }
    else if (iconName === 'casting') {
        IconComponent = Clapperboard;
        colorClasses = 'bg-[#EAF2ED] border-[#194332]/20 text-[#194332]';
    }
    else if (iconName === 'system') {
        IconComponent = Settings;
        colorClasses = 'bg-[#EAF2ED] border-[#194332]/20 text-[#194332]';
    }
    return (<div className={`w-10 h-10 md:w-14 md:h-14 rounded-full border flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
        <IconComponent className="w-5 h-5 md:w-7 md:h-7" />
    </div>);
};
function NotificationCard({ notif, followingIds, handleFollowBack, markAsRead, onDeleteRequest, handleNotificationClick, timeAgo }) {
    const details = getNotificationDetails(notif);
    const showAvatar = details.iconName === 'message_received' || details.iconName === 'missed_call' || details.iconName === 'call_cancelled';
    const isConnected = Boolean(
        notif.senderId && followingIds && (
            typeof followingIds.has === 'function'
                ? followingIds.has(notif.senderId)
                : Array.isArray(followingIds) && followingIds.includes(notif.senderId)
        )
    );
    const longPressTimer = useRef(null);
    const isLongPressActive = useRef(false);
    const startPress = useCallback(() => {
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressActive.current = true;
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
            onDeleteRequest(notif.id);
        }, 600);
    }, [notif.id, onDeleteRequest]);
    const endPress = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);
    const handleTouchStart = (e) => {
        startPress();
    };
    const handleTouchEnd = (e) => {
        endPress();
        if (isLongPressActive.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    const handleMouseDown = (e) => {
        if (e.button !== 0)
            return;
        startPress();
    };
    const handleMouseUp = (e) => {
        endPress();
        if (isLongPressActive.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    const handleMouseLeave = () => {
        endPress();
    };
    const handleCardClick = (e) => {
        if (isLongPressActive.current) {
            e.stopPropagation();
            e.preventDefault();
            isLongPressActive.current = false;
            return;
        }
        handleNotificationClick(notif);
    };
    const cardBgClass = notif.read
        ? 'bg-transparent hover:bg-[#F3F0E9]/60'
        : 'bg-[#EAF2ED]/30 hover:bg-[#EAF2ED]/60';
    return (<div className="relative w-full">
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={endPress} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onClick={handleCardClick} className={`relative z-10 py-4 md:py-5 px-2 sm:px-4 md:px-6 cursor-pointer transition-colors duration-200 flex items-center gap-4 md:gap-6 select-none ${cardBgClass} w-full`}>

            {showAvatar && (notif.senderAvatar || notif.senderName || notif.senderId) ? (<Avatar userId={notif.senderId} src={notif.senderAvatar} name={notif.senderName} size="sm" className="!w-10 !h-10 md:!w-14 md:!h-14 !rounded-full border-none shrink-0" />) : (renderIconCircle(details.iconName))}


            <div className="flex-1 min-w-0 pr-2">
                <div className={`text-sm md:text-base leading-snug break-words ${notif.read ? 'text-[#626860] font-normal' : 'text-[#202923] font-semibold'}`}>
                    {details.text}
                </div>


                {(notif.type === 'follow' || notif.notificationType === 'follow') && notif.senderId && (<div className="mt-2.5">
                    <button
                        type="button"
                        onClick={(e) => handleFollowBack(e, notif.senderId)}
                        className={`px-4 sm:px-5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer shadow-none ${
                            isConnected
                                ? 'bg-[#FAF8F4] border border-[#E7E5E0] text-[#626860]'
                                : 'bg-[#194332] hover:bg-[#102F28] text-white shadow-xs'
                        }`}
                    >
                        {isConnected ? 'Connected' : 'Connect'}
                    </button>
                </div>)}
            </div>


            <div className="flex flex-col items-end gap-1.5 self-start pt-0.5 shrink-0">
                <span className="text-[11px] md:text-sm text-nc-muted font-medium whitespace-nowrap">
                    {timeAgo(notif.createdAt?.seconds)}
                </span>

                {!notif.read && (<button onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notif.id);
                }} className="group/btn relative w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full hover:bg-[#FAF8F4] transition-colors" title="Mark as read">
                    <span className="absolute w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#194332] group-hover/btn:opacity-0 transition-opacity" />
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#194332] opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0" />
                </button>)}
            </div>
        </div>
    </div>);
}
export default function Notifications({ onNavigate, user, initialFilter = 'all' }) {
    const { showToast } = useApp();
    const [filter, setFilter] = useState(initialFilter || 'all');
    
    // Instant cache-first paint: load from cacheManager if previously fetched
    const cacheKey = user?.uid ? `user_notifications_cache_${user.uid}` : null;
    const initialCached = cacheKey ? (cacheManager.getMemory?.(cacheKey) || null) : null;
    
    const [notifications, setNotifications] = useState(initialCached || []);
    const [loading, setLoading] = useState(!initialCached || initialCached.length === 0);
    const [followingIds, setFollowingIds] = useState(new Set());
    const [myFollowerIds, setMyFollowerIds] = useState(new Set());
    const [followersLoaded, setFollowersLoaded] = useState(false);
    const [visibleLimit, setVisibleLimit] = useState(15);
    const [hasMore, setHasMore] = useState(false);
    const [deletingNotifId, setDeletingNotifId] = useState(null);

    const myFollowerIdsRef = useRef(myFollowerIds);
    myFollowerIdsRef.current = myFollowerIds;
    const followersLoadedRef = useRef(followersLoaded);
    followersLoadedRef.current = followersLoaded;

    const filters = [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread' },
        { id: 'casting', label: 'Casting' },
        { id: 'system', label: 'System' },
    ];
    useEffect(() => {
        if (initialFilter) {
            setFilter(initialFilter);
        }
    }, [initialFilter]);

    useEffect(() => {
        if (!user?.uid) {
            setFollowingIds(new Set());
            setMyFollowerIds(new Set());
            setFollowersLoaded(false);
            return;
        }
        // Subscribe to who I am following via canonical service
        const unsubFollowing = subscribeToUserFollows(user.uid, (data) => {
            const set = data instanceof Set ? data : new Set(Array.isArray(data) ? data : []);

            setFollowingIds(set);
        });

        // Subscribe to who is following me (my active followers)
        const unsubFollowers = cacheManager.subscribePooled(`user_followers_${user.uid}`, (pooledCb) => {
            const qFollowers = query(collection(db, 'follows'), where('followingId', '==', user.uid));
            return onSnapshot(qFollowers, (snapshot) => {
                const ids = new Set(snapshot.docs.map(d => d.data().followerId).filter(Boolean));
                pooledCb(ids, null);
            }, (err) => {
                if (err.code !== 'permission-denied') {
                    console.error("Followers subscription failed in Notifications:", err);
                }
                pooledCb(new Set(), err);
            });
        }, (ids) => {
            setMyFollowerIds(ids || new Set());
            setFollowersLoaded(true);
        });

        return () => {
            unsubFollowing();
            unsubFollowers();
        };
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) {
            setNotifications([]);
            setLoading(false);
            return;
        }
        
        // Only trigger loading skeleton if we don't already have cached items
        const currentCached = cacheManager.getMemory?.(`user_notifications_cache_${user.uid}`);
        if (!currentCached || currentCached.length === 0) {
            setLoading(true);
        }
        
        const unsub = cacheManager.subscribePooled(`user_notifications_${user.uid}`, (pooledCb) => {
            const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), limit(100));
            return onSnapshot(q, (snapshot) => {
                const rawItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                pooledCb(rawItems, null);
            }, (err) => {
                console.error('Failed to subscribe to notifications:', err);
                pooledCb([], err);
            });
        }, (rawItems) => {
            if (!rawItems) {
                setLoading(false);
                return;
            }
            const sortedItems = [...rawItems].sort((a, b) => {
                const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return timeB - timeA;
            });

            // Deduplicate follow notifications & filter out unfollowed users using refs
            const seenFollowSenders = new Set();
            const activeFollowers = myFollowerIdsRef.current;
            const isFollowersLoaded = followersLoadedRef.current;

            const items = sortedItems.filter(item => {
                const isFollow = item.type === 'follow' || item.notificationType === 'follow';
                if (isFollow && item.senderId) {
                    if (seenFollowSenders.has(item.senderId)) {
                        deleteDoc(doc(db, 'notifications', item.id)).catch((err) => {
                            console.warn("Could not delete duplicate notification:", err);
                        });
                        return false;
                    }
                    const isStillFollower = activeFollowers && (
                        typeof activeFollowers.has === 'function'
                            ? activeFollowers.has(item.senderId)
                            : Array.isArray(activeFollowers) && activeFollowers.includes(item.senderId)
                    );
                    if (isFollowersLoaded && !isStillFollower) {
                        deleteDoc(doc(db, 'notifications', item.id)).catch((err) => {
                            console.warn("Could not delete orphaned notification:", err);
                        });
                        return false;
                    }
                    seenFollowSenders.add(item.senderId);
                }
                return true;
            });

            // Cache in memory for instant restoration next time
            cacheManager.setMemory?.(`user_notifications_cache_${user.uid}`, items);

            if (items.length > visibleLimit) {
                setHasMore(true);
                setNotifications(items.slice(0, visibleLimit));
            }
            else {
                setHasMore(false);
                setNotifications(items);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [user?.uid, visibleLimit]);
    const markAsRead = async (notifId) => {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true, isRead: true } : n));
        if (user?.uid) {
            try {
                await updateDoc(doc(db, 'notifications', notifId), { read: true, isRead: true });
            }
            catch (err) {
                console.warn("Could not mark notification as read in Firestore:", err);
            }
        }
    };
    const deleteNotification = async (notifId) => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        if (user?.uid) {
            try {
                await deleteDoc(doc(db, 'notifications', notifId));
            }
            catch (err) {
                console.warn("Could not delete notification in Firestore:", err);
            }
        }
    };
    const handleNotificationClick = async (notif) => {
        await markAsRead(notif.id);
        const target = notif.targetUrl || notif.profileUrl || notif.link;
        if (target) {
            if (target.startsWith('/profile/')) {
                const id = target.split('/').pop();
                if (id)
                    onNavigate('profile', id);
            }
            else if (target.startsWith('/messages/')) {
                const id = target.split('/').pop();
                if (id)
                    onNavigate('messages', id);
            }
            else if (target.startsWith('/casting/')) {
                const id = target.split('/').pop();
                if (id)
                    onNavigate('casting-detail', id);
            }
            else {
                onNavigate('home');
            }
        }
        else if (notif.type === 'follow' && notif.senderId) {
            onNavigate('profile', notif.senderId);
        }
    };
    const handleFollowBack = async (e, senderId) => {
        e.stopPropagation();
        if (!user?.uid || !senderId || user.uid === senderId)
            return;
        const isFollowing = Boolean(
            followingIds && (
                typeof followingIds.has === 'function'
                    ? followingIds.has(senderId)
                    : Array.isArray(followingIds) && followingIds.includes(senderId)
            )
        );
        try {
            await toggleFollowUser({
                currentUserId: user.uid,
                targetUserId: senderId,
                isCurrentlyFollowing: isFollowing,
                senderInfo: {
                    displayName: user.displayName || user.email || 'Someone',
                    photoURL: user.photoURL || ''
                }
            });
        }
        catch (err) {
            console.error("Error toggling follow in Notifications:", err);
            showToast?.('Failed to update connection. Please try again.', 'error');
        }
    };
    const handleMarkAllRead = async () => {
        const unreadNotifs = notifications.filter(n => !n.read);
        if (unreadNotifs.length === 0) return;
        const previousNotifications = notifications;
        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
        try {
            const promises = unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true, isRead: true }));
            await Promise.all(promises);
        }
        catch (err) {
            console.warn("Failed to mark all read:", err);
            setNotifications(previousNotifications);
            showToast?.('Failed to mark notifications as read.', 'error');
        }
    };
    const loadMore = () => {
        setVisibleLimit(prev => prev + 15);
    };
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
            }
            else if (time >= startOfYesterday) {
                yesterday.push(notif);
            }
            else {
                earlier.push(notif);
            }
        });
        return { today, yesterday, earlier };
    };
    const filtered = notifications.filter(n => {
        if (filter === 'all')
            return true;
        if (filter === 'unread')
            return !n.read;
        return n.type === filter || n.notificationType === filter;
    });
    const unreadCount = notifications.filter(n => !n.read).length;
    const grouped = groupNotifications(filtered);
    const timeAgo = (seconds) => {
        if (!seconds)
            return 'Just now';
        const now = Math.floor(Date.now() / 1000);
        const diff = now - seconds;
        if (diff < 60)
            return 'Just now';
        if (diff < 3600)
            return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400)
            return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800)
            return `${Math.floor(diff / 86400)}d ago`;
        return `${Math.floor(diff / 604800)}w ago`;
    };
    const getEmptyStateText = () => {
        switch (filter) {
            case 'unread': return { title: "You're all caught up!", desc: "No unread notifications." };
            case 'casting': return { title: "No casting updates", desc: "Apply to casting calls to receive notices." };
            case 'system': return { title: "No system updates", desc: "Announcements and alerts will appear here." };
            default: return { title: "No notifications", desc: "Nothing here yet. Stay tuned!" };
        }
    };
    const renderSectionHeader = (label) => (<div className="flex items-center gap-3 my-5 md:my-7">
        <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
            {label}
        </span>
        <div className="h-[1px] w-full bg-[#E7E5E0]" />
    </div>);
    const renderGroupList = (groupItems) => (<ul className="w-full">
        <AnimatePresence initial={false}>
            {groupItems.map((notif) => (<motion.li key={notif.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-full cv-auto-item">
                <NotificationCard notif={notif} followingIds={followingIds} handleFollowBack={handleFollowBack} markAsRead={markAsRead} onDeleteRequest={(id) => setDeletingNotifId(id)} handleNotificationClick={handleNotificationClick} timeAgo={timeAgo} />
            </motion.li>))}
        </AnimatePresence>
    </ul>);
    return (<div className="min-h-screen bg-[#FAF8F4] text-[#202923]">

        <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-8 md:px-12 pt-4 sm:pt-6 md:pt-10">
            {/* Top Bar Header */}
            <div className="flex items-center justify-between mb-6 md:mb-8 pb-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('back')} type="button" className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#202923] hover:bg-[#F3F0E9] transition-colors shrink-0 cursor-pointer" aria-label="Back">
                        <ChevronLeft className="w-6 h-6 text-[#202923]" strokeWidth={2.2} />
                    </button>
                    <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-[#202923] tracking-tight whitespace-nowrap">
                        Notifications
                    </h1>
                </div>
                <div className="flex items-center">
                    <button onClick={handleMarkAllRead} disabled={unreadCount === 0} className={`text-xs sm:text-sm md:text-base font-bold transition-colors px-3 md:px-4 py-1.5 md:py-2 rounded-lg ${unreadCount > 0
                        ? 'text-[#194332] hover:text-[#102F28] hover:bg-[#EAF2ED] cursor-pointer'
                        : 'text-[#777C75] cursor-not-allowed'}`}>
                        Mark all read
                    </button>
                </div>
            </div>


            {/* Notification Filter Tabs (Compact Pill Row) */}
            <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-none py-1 border-b border-[#E7E5E0] pb-3">
                {filters.map(f => {
                    const isActive = filter === f.id;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                                ? 'bg-[#194332] text-white shadow-xs'
                                : 'bg-white text-[#626860] hover:text-[#202923] border border-[#E7E5E0]'
                                }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {f.label}
                                {f.id === 'unread' && unreadCount > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-[#EAF2ED] text-[#194332]'}`}>
                                        {unreadCount}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>


        <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-8 md:px-12 pb-24">
            {loading ? (
                <NotificationSkeleton count={4} />
            ) : filtered.length === 0 ? (<div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#E7E5E0] shadow-card flex items-center justify-center mx-auto mb-4 text-[#777C75]">
                    <Settings className="w-8 h-8" />
                </div>
                <p className="font-display text-[#202923] font-semibold text-lg">{getEmptyStateText().title}</p>
                <p className="text-[#626860] text-sm mt-1">{getEmptyStateText().desc}</p>
            </div>) : (<div className="space-y-6 mt-4 w-full">
                {grouped.today.length > 0 && (<div>
                    {renderSectionHeader('Today')}
                    {renderGroupList(grouped.today)}
                </div>)}
                {grouped.yesterday.length > 0 && (<div>
                    {renderSectionHeader('Yesterday')}
                    {renderGroupList(grouped.yesterday)}
                </div>)}
                {grouped.earlier.length > 0 && (<div>
                    {renderSectionHeader('Earlier')}
                    {renderGroupList(grouped.earlier)}
                </div>)}


                {hasMore && (<div className="flex justify-center pt-4">
                    <button onClick={loadMore} className="px-6 py-2.5 rounded-xl bg-white border border-[#E7E5E0] text-[#202923] hover:bg-[#F3F0E9] text-xs font-semibold tracking-wide transition-all active:scale-95 shadow-xs cursor-pointer">
                        Load More
                    </button>
                </div>)}
            </div>)}
        </div>
        <ConfirmDialog isOpen={deletingNotifId !== null} title="Delete Notification?" description="Are you sure you want to delete this notification? This action cannot be undone." confirmText="Delete" cancelText="Cancel" type="danger" onClose={() => setDeletingNotifId(null)} onConfirm={async () => {
            if (deletingNotifId) {
                await deleteNotification(deletingNotifId);
                setDeletingNotifId(null);
            }
        }} />
    </div>);
}
