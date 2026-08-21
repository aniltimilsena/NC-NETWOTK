import React, { useState, useEffect } from 'react';
import { useProfile } from './hooks/useProfile';
import SEO from '../../components/SEO';
import ProfileHeader from './components/ProfileHeader';
import ProfileAbout, { ProfileSpecsSidebar } from './components/ProfileAbout';
import ProfileMedia from './components/ProfileMedia';
import ProfileExperience from './components/ProfileExperience';
import FollowModal from './components/FollowModal';
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp, increment, updateDoc, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { updateProfileData, uploadProfileMedia } from '../../services';
interface ProfilePageProps {
    onNavigate: (page: string, param?: any) => void;
    user: any;
    profileId: string | null;
    isAdmin: boolean;
    showAlert: (message: string, type?: any, detail?: string, action?: any) => void;
    initialTab?: string;
}
export default function ProfilePage({ onNavigate, user, profileId, isAdmin, showAlert, initialTab }: ProfilePageProps) {
    const { profile, setProfile, resolvedUid, resolvingUid, loading, isOwnProfile, targetUid, isFollowing, followerCount, followingCount, savedCount, toggleFollow } = useProfile(profileId, user);
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    const [activeTab, setActiveTab] = useState(initialTab || (isDesktop ? 'media' : 'about'));
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        } else {
            setActiveTab(window.innerWidth >= 1024 ? 'media' : 'about');
        }
    }, [resolvedUid, initialTab]);
    const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | 'projects' | null>(null);
    const [followList, setFollowList] = useState<any[]>([]);
    const [loadingFollowList, setLoadingFollowList] = useState(false);
    const handleFollowModalClose = () => {
        setShowFollowModal(null);
        setFollowList([]);
    };
    const handleFollowModalOpen = async (type: 'followers' | 'following' | 'projects') => {
        setShowFollowModal(type);
        setLoadingFollowList(true);
        try {
            if (type === 'projects') {
                const q = query(collection(db, "casting_calls"), where("createdBy", "==", targetUid));
                const snap = await getDocs(q);
                const list = snap.docs.map(docSnap => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        title: data.title || 'Untitled Project',
                        production: data.production || 'Independent',
                        status: data.status || 'Open',
                        location: data.location || 'Remote',
                    };
                });
                setFollowList(list);
            }
            else {
                const fieldName = type === 'followers' ? 'followingId' : 'followerId';
                const queryField = type === 'followers' ? 'followerId' : 'followingId';
                const q = query(collection(db, "follows"), where(fieldName, "==", targetUid));
                const snap = await getDocs(q);
                const userIds = snap.docs
                    .map((docSnap: any) => docSnap.data()[queryField])
                    .filter((id: string) => id && id !== targetUid);
                if (userIds.length === 0) {
                    setFollowList([]);
                    return;
                }
                const fetchedProfiles: any[] = [];
                const chunks = [];
                for (let i = 0; i < userIds.length; i += 30) {
                    chunks.push(userIds.slice(i, i + 30));
                }
                const profileMap = new Map<string, any>();
                await Promise.all(chunks.map(async (chunk) => {
                    try {
                        const q = query(collection(db, "profiles"), where(documentId(), "in", chunk));
                        const snap = await getDocs(q);
                        snap.docs.forEach(docSnap => {
                            profileMap.set(docSnap.id, docSnap.data());
                        });
                    } catch (err) {
                        console.warn("Failed to batch fetch follow profiles chunk:", err);
                    }
                }));

                userIds.forEach(uid => {
                    const pData = profileMap.get(uid);
                    if (pData) {
                        fetchedProfiles.push({
                            id: uid,
                            name: pData.name || 'Discovery User',
                            image: pData.image || '',
                            role: pData.role || 'Talent'
                        });
                    }
                });
                setFollowList(fetchedProfiles);
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoadingFollowList(false);
        }
    };
    const handleFollowToggle = async () => {
        if (!user) {
            onNavigate('signin');
            return;
        }
        const res = await toggleFollow();
        if (res.success) {
            if (!isFollowing && targetUid) {
                try {
                    const notifId = `${user.uid}_${targetUid}_follow`;
                    await setDoc(doc(db, "notifications", notifId), {
                        userId: targetUid,
                        recipientId: targetUid,
                        receiverId: targetUid,
                        senderId: user.uid,
                        notificationType: "follow",
                        type: "follow",
                        isRead: false,
                        read: false,
                        createdAt: serverTimestamp(),
                        profileUrl: `/profile/${user.uid}`,
                        title: "New Follower",
                        body: `${user.displayName || 'Someone'} started following you.`,
                        senderName: user.displayName || 'Someone',
                        senderAvatar: user.photoURL || ''
                    }, { merge: true });
                }
                catch (err) {
                    console.warn("Could not dispatch follow notification:", err);
                }
            }
        }
        else {
            showAlert(res.error || 'Failed to update follow status', 'error');
        }
    };
    const handleUploadMedia = async (files: FileList) => {
        const activeUid = CurrentUser.id || user?.uid || profile?.uid;
        if (!activeUid)
            return;
        const newUrls: string[] = [];
        let failedCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const url = await uploadProfileMedia(activeUid, file);
                if (url) {
                    newUrls.push(url);
                }
                else {
                    failedCount++;
                }
            }
            catch (err) {
                console.error("Photo upload error:", err);
                failedCount++;
            }
        }
        if (newUrls.length > 0) {
            const currentMedia = Array.isArray(profile?.media) ? profile.media : [];
            const updatedMedia = [...currentMedia, ...newUrls];
            setProfile((prev: any) => prev ? { ...prev, media: updatedMedia } : prev);
            await updateProfileData(activeUid, { media: updatedMedia });
        }
        else if (failedCount > 0) {
            showAlert('Upload Failed', 'error', 'Failed to upload photo(s). Please check your file size or network connection.');
        }
    };
    const handleDeleteMedia = async (src: string) => {
        const activeUid = CurrentUser.id || user?.uid || profile?.uid;
        if (!activeUid || !profile)
            return;
        try {
            const currentMedia = Array.isArray(profile.media) ? profile.media : [];
            const updatedMedia = currentMedia.filter(item => item !== src);
            setProfile((prev: any) => prev ? { ...prev, media: updatedMedia } : prev);
            await updateProfileData(activeUid, { media: updatedMedia });
        }
        catch (err) {
            console.error(err);
        }
    };
    const handleUploadIntroVideo = async (file: File) => {
        const activeUid = CurrentUser.id || user?.uid || profile?.uid;
        if (!activeUid)
            return;
        try {
            const url = await uploadProfileMedia(activeUid, file);
            if (url) {
                setProfile((prev: any) => prev ? {
                    ...prev,
                    introVideo: url,
                    introVideoUrl: url,
                    showreel: url,
                    showreelUrl: url
                } : prev);
                await updateProfileData(activeUid, {
                    introVideo: url,
                    introVideoUrl: url,
                    showreel: url,
                    showreelUrl: url
                });
            }
            else {
                showAlert('Upload Failed', 'error', 'Failed to upload intro video.');
            }
        }
        catch (err) {
            console.error("Video upload error:", err);
            showAlert('Failed to upload video.', 'error');
        }
    };
    const handleDeleteIntroVideo = async () => {
        const activeUid = CurrentUser.id || user?.uid || profile?.uid;
        if (!activeUid)
            return;
        try {
            setProfile((prev: any) => prev ? {
                ...prev,
                introVideo: null,
                introVideoUrl: null,
                showreel: null,
                showreelUrl: null
            } : prev);
            await updateProfileData(activeUid, {
                introVideo: null,
                introVideoUrl: null,
                showreel: null,
                showreelUrl: null
            });
        }
        catch (err) {
            console.error(err);
        }
    };
    if (loading || resolvingUid) {
        return (<div className="min-h-screen bg-nc-dark pb-6 text-left animate-pulse">

            <div className="block h-[220px] sm:h-[320px] relative w-full overflow-hidden bg-[#0A0A0F] select-none">
                <div className="absolute inset-0 skeleton" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/30 to-transparent" />
            </div>


            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-24 relative z-20 flex flex-col items-center text-center">
                <div className="relative z-10 mb-3 shrink-0">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#0E0F15] bg-[#0E0F15] skeleton"/>
                </div>

                <div className="space-y-3 pb-6 border-b border-white/5 w-full flex flex-col items-center">
                    <div className="h-7 skeleton w-56 rounded-xl" />
                    <div className="h-4 skeleton w-24 rounded-lg" />
                    <div className="h-3.5 skeleton w-44 rounded-md" />
                </div>


                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-white/5 w-full max-w-md mx-auto">
                    {[1, 2, 3].map(i => (<div key={i} className="flex flex-col items-center justify-center py-1 space-y-1.5">
                        <div className="h-5 skeleton w-12 rounded" />
                        <div className="h-3.5 skeleton w-16 rounded" />
                    </div>))}
                </div>


                <div className="w-full mt-8">
                    <div className="flex border-b border-white/10 gap-8 mb-8 justify-center sm:justify-start">
                        {[1, 2, 3].map(i => (<div key={i} className="h-8 skeleton w-20 rounded pb-3" />))}
                    </div>

                    <div className="bg-[#111]/80 border border-white/5 rounded-[2rem] p-6 sm:p-8 space-y-6">
                        <div className="h-5 skeleton w-32 rounded" />
                        <div className="space-y-3">
                            <div className="h-3.5 skeleton w-full rounded" />
                            <div className="h-3.5 skeleton w-11/12 rounded" />
                            <div className="h-3.5 skeleton w-4/5 rounded" />
                        </div>
                    </div>
                </div>
            </div>
        </div>);
    }
    if (!profile) {
        return (<div className="min-h-screen bg-nc-dark pb-6 flex flex-col items-center justify-center text-center p-6">
            <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
            <p className="text-nc-muted text-sm max-w-xs mb-6">
                The profile you are looking for does not exist or has been deleted.
            </p>
            <button onClick={() => onNavigate('home')} className="px-6 py-2.5 bg-[#00BFFF] text-black font-bold rounded-2xl">
                Go Back Home
            </button>
        </div>);
    }
    const showContact = isOwnProfile || isFollowing || profile.showContactInfo === true;
    const tabs = ['about', 'media', 'experience'];
    const tabLabelMap: Record<string, string> = {
        about: 'About',
        media: 'Media',
        experience: 'Experience',
    };
    return (
        <div className="min-h-screen bg-[#08080A] pb-10 text-white">
            <SEO
                title={`${profile.name || 'Talent'} | NepalCasts Profile`}
                description={profile.bio || `View ${profile.name || 'this talent'}'s portfolio, auditions, and experience on NepalCasts.`}
                image={profile.image || undefined}
                noindex={(profile as any).isPrivate === true}
            />
            <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} isFollowing={isFollowing} followerCount={followerCount} followingCount={followingCount} savedCount={savedCount} onFollowToggle={handleFollowToggle} onNavigate={onNavigate} showAlert={showAlert} onFollowClick={handleFollowModalOpen} />

            {/* Profile Main Content Container (2-Side Full Screen Layout on PC) */}
            <div className="w-full px-1.5 sm:px-3 lg:px-6 mt-3">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                    
                    {/* Left Column on PC: Profile Specs Sidebar */}
                    <div className="hidden lg:block lg:col-span-5 xl:col-span-4.5">
                        <ProfileSpecsSidebar profile={profile} showContact={showContact} />
                    </div>

                    {/* Right Column on PC (Full Width on Mobile): Tabs + Active Tab Content */}
                    <div className="col-span-12 lg:col-span-7 xl:col-span-7.5 flex flex-col gap-2.5">
                        
                        {/* Clean Professional Tab Navigation */}
                        <div className="flex border border-white/10 gap-6 sm:gap-8 overflow-x-auto scrollbar-none justify-start px-4 sm:px-5 bg-[#121215] rounded-2xl pt-3 pb-1 shadow-xl backdrop-blur-md">
                            {tabs.map((tab) => {
                                const isSelected = activeTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            const base = isOwnProfile && !profileId ? '/profile' : `/profile/${resolvedUid || profileId}`;
                                            if (tab === 'about') {
                                                onNavigate(base);
                                            } else {
                                                onNavigate(`${base}/${tab}`);
                                            }
                                        }}
                                        className={`pb-2.5 text-xs sm:text-sm font-bold capitalize tracking-wide transition-all relative whitespace-nowrap cursor-pointer ${
                                            tab === 'about' ? 'lg:hidden' : ''
                                        } ${
                                            isSelected ? 'text-[#0088CC]' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {tabLabelMap[tab] || tab}
                                        {isSelected && (
                                            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0088CC] rounded-full shadow-[0_0_12px_rgba(0,136,204,0.7)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Active Tab Content */}
                        <div className="animate-fade-in">
                            {activeTab === 'about' && (
                                <div className="lg:hidden">
                                    <ProfileAbout profile={profile} showContact={showContact} />
                                </div>
                            )}
                            {(activeTab === 'media' || activeTab === 'about') && (
                                <div className={activeTab === 'about' ? 'hidden lg:block' : ''}>
                                    <ProfileMedia profile={profile} isOwnProfile={isOwnProfile} onUploadMedia={handleUploadMedia} onDeleteMedia={handleDeleteMedia} onUploadIntroVideo={handleUploadIntroVideo} onDeleteIntroVideo={handleDeleteIntroVideo} />
                                </div>
                            )}
                            {activeTab === 'experience' && (
                                <ProfileExperience profile={profile} isOwnProfile={isOwnProfile} showAlert={showAlert} />
                            )}
                        </div>

                    </div>

                </div>
            </div>


            <FollowModal type={showFollowModal || 'followers'} isOpen={!!showFollowModal} onClose={handleFollowModalClose} list={followList} loading={loadingFollowList} onNavigate={onNavigate} />
        </div>);
}
