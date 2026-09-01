import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, where, limit, doc, updateDoc, deleteDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import Avatar from '../../components/ui/Avatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { cacheManager } from '../../utils/cacheManager';
import { NotificationSkeleton } from '../../components/ui/Skeleton';
import { ChevronLeft, MessageSquare, PhoneMissed, PhoneOff, UserPlus, Clapperboard, Settings, Check } from 'lucide-react';
const getNotificationDetails = (notif) => {
    const type = (notif.type || notif.notificationType || '').toLowerCase();
    const body = (notif.body || notif.message || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    const senderName = notif.senderName || 'Someone';
    if (type === 'follow' || title.includes('follow') || body.includes('following you') || body.includes('started following')) {
        return {
            type: 'follow',
            themeColor: 'emerald',
            iconName: 'follow',
            text: (<span>
                <span className="font-bold text-white mr-1">{senderName}</span>
                started following you
            </span>),
        };
    }
    if (type === 'casting' || type === 'casting_status' || type === 'casting_application' || title.includes('casting') || title.includes('application') || body.includes('casting') || body.includes('applied') || body.includes('shortlisted') || body.includes('accepted') || body.includes('rejected')) {
        let displayElement;
        const cleanBody = notif.body || notif.message || '';
        const callTitle = notif.title || 'Casting Call';
        
        if (body.includes('shortlisted') || notif.status === 'shortlisted') {
            displayElement = (<span>
                <span className="font-bold text-white mr-1">{senderName}</span>
                shortlisted your application for <span className="text-[#522C69] font-semibold">"{callTitle}"</span>
            </span>);
        } else if (body.includes('accepted') || notif.status === 'accepted') {
            displayElement = (<span>
                <span className="font-bold text-white mr-1">{senderName}</span>
                accepted your application for <span className="text-emerald-400 font-semibold">"{callTitle}"</span>
            </span>);
        } else if (body.includes('rejected') || notif.status === 'rejected') {
            displayElement = (<span>
                <span className="font-bold text-white mr-1">{senderName}</span>
                updated your application status for <span className="text-gray-300 font-semibold">"{callTitle}"</span>
            </span>);
        } else if (body.includes('applied to') || body.includes('applied')) {
            const roleInfo = notif.roleName ? ` for role "${notif.roleName}"` : '';
            displayElement = (<span>
                <span className="font-bold text-white mr-1">{senderName}</span>
                applied to your casting call: <span className="text-[#522C69] font-semibold">"{callTitle}"</span>{roleInfo}
            </span>);
        } else if (cleanBody) {
            displayElement = (<span>
                {cleanBody.startsWith(senderName) ? (
                    <>
                        <span className="font-bold text-white mr-1">{senderName}</span>
                        {cleanBody.substring(senderName.length)}
                    </>
                ) : (
                    <span>{cleanBody}</span>
                )}
            </span>);
        } else {
            displayElement = (<span>
                New casting update for <span className="text-[#522C69]">"{callTitle}"</span>
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
                    <span className="font-bold text-white ml-1">{senderName}</span>
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
                <span className="font-bold text-white mr-1">{senderName}</span>
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
    let colorClasses = 'bg-white/10 border-white/20 text-white';
    if (iconName === 'message_received') {
        IconComponent = MessageSquare;
        colorClasses = 'bg-white/10 border-white/20 text-white';
    }
    else if (iconName === 'missed_call') {
        IconComponent = PhoneMissed;
        colorClasses = 'bg-red-500/10 border-red-500/20 text-red-500';
    }
    else if (iconName === 'call_cancelled') {
        IconComponent = PhoneOff;
        colorClasses = 'bg-amber-500/10 border-amber-500/20 text-amber-500';
    }
    else if (iconName === 'follow') {
        IconComponent = UserPlus;
        colorClasses = 'bg-white/10 border-white/20 text-white';
    }
    else if (iconName === 'casting') {
        IconComponent = Clapperboard;
        colorClasses = 'bg-white/10 border-white/20 text-white';
    }
    else if (iconName === 'system') {
        IconComponent = Settings;
        colorClasses = 'bg-white/10 border-white/20 text-white';
    }
    return (<div className={`w-10 h-10 md:w-14 md:h-14 rounded-full border flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
        <IconComponent className="w-5 h-5 md:w-7 md:h-7 text-white" />
    </div>);
};
function NotificationCard({ notif, followingIds, handleFollowBack, markAsRead, onDeleteRequest, handleNotificationClick, timeAgo }) {
    const details = getNotificationDetails(notif);
    const showAvatar = details.iconName === 'message_received' || details.iconName === 'missed_call' || details.iconName === 'call_cancelled';
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
        ? 'bg-transparent hover:bg-white/[0.02]'
        : 'bg-[#522C69]/[0.03] hover:bg-[#522C69]/[0.06]';
    return (<div className="relative w-full">
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={endPress} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onClick={handleCardClick} className={`relative z-10 py-4 md:py-5 px-2 sm:px-4 md:px-6 cursor-pointer transition-colors duration-200 flex items-center gap-4 md:gap-6 select-none ${cardBgClass} w-full`}>

            {showAvatar && (notif.senderAvatar || notif.senderName || notif.senderId) ? (<Avatar userId={notif.senderId} src={notif.senderAvatar} name={notif.senderName} size="sm" className="!w-10 !h-10 md:!w-14 md:!h-14 !rounded-full border-none shrink-0" />) : (renderIconCircle(details.iconName))}


            <div className="flex-1 min-w-0 pr-2">
                <div className={`text-sm md:text-base leading-snug break-words ${notif.read ? 'text-[#888888] font-normal' : 'text-white font-semibold'}`}>
                    {details.text}
                </div>


                {(notif.type === 'follow' || notif.notificationType === 'follow') && notif.senderId && (<div className="mt-2">
                    {followingIds.has(notif.senderId) ? (<button disabled className="px-3 py-1 md:px-5 md:py-2 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-xs md:text-sm font-bold uppercase tracking-wider cursor-not-allowed">
                        Following
                    </button>) : (<button onClick={(e) => handleFollowBack(e, notif.senderId)} className="px-3 py-1 md:px-5 md:py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 border border-[#522C69]/40 text-white shadow-sm text-xs md:text-sm font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer">
                        Follow Back
                    </button>)}
                </div>)}
            </div>


            <div className="flex flex-col items-end gap-1.5 self-start pt-0.5 shrink-0">
                <span className="text-[11px] md:text-sm text-nc-muted font-medium whitespace-nowrap">
                    {timeAgo(notif.createdAt?.seconds)}
                </span>

                {!notif.read && (<button onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notif.id);
                }} className="group/btn relative w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Mark as read">
                    <span className="absolute w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#522C69] group-hover/btn:opacity-0 transition-opacity" />
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0" />
                </button>)}
            </div>
        </div>
    </div>);
}
export default function Notifications({ onNavigate, user, initialFilter = 'all' }) {
    const [filter, setFilter] = useState(initialFilter || 'all');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState(new Set());
    const [myFollowerIds, setMyFollowerIds] = useState(new Set());
    const [followersLoaded, setFollowersLoaded] = useState(false);
    const [visibleLimit, setVisibleLimit] = useState(15);
    const [hasMore, setHasMore] = useState(false);
    const [deletingNotifId, setDeletingNotifId] = useState(null);
    const filters = [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread' },
        { id: 'messages', label: 'Messages' },
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
        // Subscribe to who I am following
        const unsubFollowing = cacheManager.subscribePooled(`user_follows_${user.uid}`, (pooledCb) => {
            const q = query(collection(db, 'follows'), where('followerId', '==', user.uid));
            return onSnapshot(q, (snapshot) => {
                const ids = snapshot.docs.map(docSnap => docSnap.data().followingId);
                pooledCb(ids, null);
            }, (err) => {
                if (err.code !== 'permission-denied') {
                    console.error("Follows subscription failed in Notifications:", err);
                }
                pooledCb([], err);
            });
        }, (ids) => {
            setFollowingIds(new Set(ids));
        });

        // Subscribe to who is following me (my active followers)
        const qFollowers = query(collection(db, 'follows'), where('followingId', '==', user.uid));
        const unsubFollowers = onSnapshot(qFollowers, (snapshot) => {
            const ids = new Set(snapshot.docs.map(d => d.data().followerId).filter(Boolean));
            setMyFollowerIds(ids);
            setFollowersLoaded(true);
        }, (err) => {
            if (err.code !== 'permission-denied') {
                console.error("Followers subscription failed in Notifications:", err);
            }
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
        setLoading(true);
        const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), limit(100));
        const unsub = onSnapshot(q, (snapshot) => {
            const rawItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            rawItems.sort((a, b) => {
                const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return timeB - timeA;
            });

            // Deduplicate follow notifications & filter out unfollowed users
            const seenFollowSenders = new Set();
            const items = rawItems.filter(item => {
                const isFollow = item.type === 'follow' || item.notificationType === 'follow';
                if (isFollow && item.senderId) {
                    // If we already have a newer follow notification from this sender, drop and delete older duplicate
                    if (seenFollowSenders.has(item.senderId)) {
                        deleteDoc(doc(db, 'notifications', item.id)).catch(() => {});
                        return false;
                    }
                    // If followers list is loaded and this person is no longer following, drop and delete notification
                    if (followersLoaded && !myFollowerIds.has(item.senderId)) {
                        deleteDoc(doc(db, 'notifications', item.id)).catch(() => {});
                        return false;
                    }
                    seenFollowSenders.add(item.senderId);
                }
                return true;
            });

            if (items.length > visibleLimit) {
                setHasMore(true);
                setNotifications(items.slice(0, visibleLimit));
            }
            else {
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
    }, [user?.uid, visibleLimit, myFollowerIds, followersLoaded]);
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
        const followId = `${user.uid}_${senderId}`;
        const followDocRef = doc(db, "follows", followId);
        try {
            await setDoc(followDocRef, {
                followerId: user.uid,
                followingId: senderId,
                createdAt: serverTimestamp()
            });
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
        }
        catch (err) {
            console.error("Error following back:", err);
        }
    };
    const handleMarkAllRead = async () => {
        const unreadNotifs = notifications.filter(n => !n.read);
        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
        try {
            const promises = unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true, isRead: true }));
            await Promise.all(promises);
        }
        catch (err) {
            console.warn("Failed to mark all read:", err);
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
            case 'messages': return { title: "No messages yet", desc: "Start conversations to see updates." };
            case 'casting': return { title: "No casting updates", desc: "Apply to casting calls to receive notices." };
            case 'system': return { title: "No system updates", desc: "Announcements and alerts will appear here." };
            default: return { title: "No notifications", desc: "Nothing here yet. Stay tuned!" };
        }
    };
    const renderSectionHeader = (label) => (<div className="flex items-center gap-3 my-5 md:my-7">
        <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
            {label}
        </span>
        <div className="h-[1px] w-full bg-white/5" />
    </div>);
    const renderGroupList = (groupItems) => (<ul className="w-full">
        <AnimatePresence initial={false}>
            {groupItems.map((notif) => (<motion.li key={notif.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-full">
                <NotificationCard notif={notif} followingIds={followingIds} handleFollowBack={handleFollowBack} markAsRead={markAsRead} onDeleteRequest={(id) => setDeletingNotifId(id)} handleNotificationClick={handleNotificationClick} timeAgo={timeAgo} />
            </motion.li>))}
        </AnimatePresence>
    </ul>);
    return (<div className="min-h-screen bg-[#0a0a0a] text-white">

        <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-8 md:px-12 pt-4 sm:pt-6 md:pt-10">
            {/* Top Bar Header */}
            <div className="flex items-center justify-between mb-6 md:mb-8 pb-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => onNavigate('back')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer" aria-label="Back">
                        <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight whitespace-nowrap">
                        Notifications
                    </h1>
                </div>
                <div className="flex items-center">
                    <button onClick={handleMarkAllRead} disabled={unreadCount === 0} className={`text-xs sm:text-sm md:text-base font-bold transition-colors px-3 md:px-4 py-1.5 md:py-2 rounded-lg ${unreadCount > 0
                        ? 'text-[#522C69] hover:text-amber-300 hover:bg-white/5 cursor-pointer'
                        : 'text-gray-600 cursor-not-allowed'}`}>
                        Mark all read
                    </button>
                </div>
            </div>


            {/* Notification Filter Tabs (Compact Pill Row) */}
            <div className="relative flex items-center gap-2 overflow-x-auto scrollbar-none py-1 border-b border-white/5 pb-3">
                {filters.map(f => {
                    const isActive = filter === f.id;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                                ? 'bg-[#522C69] text-[#0A0A0A] shadow-sm shadow-[#522C69]/20'
                                : 'bg-[#18181c] text-gray-400 hover:text-white border border-white/5'
                                }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {f.label}
                                {f.id === 'unread' && unreadCount > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-black/20 text-black' : 'bg-[#522C69]/20 text-[#522C69]'}`}>
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
                <div className="w-16 h-16 rounded-2xl bg-[#111111] flex items-center justify-center mx-auto mb-4 text-[#555] border border-white/5">
                    <Settings className="w-8 h-8" />
                </div>
                <p className="text-white font-bold text-lg">{getEmptyStateText().title}</p>
                <p className="text-[#555] text-sm mt-1">{getEmptyStateText().desc}</p>
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
                    <button onClick={loadMore} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-bold tracking-wide transition-all active:scale-95">
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
