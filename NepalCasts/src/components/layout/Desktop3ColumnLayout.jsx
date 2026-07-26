import React, { useState, useEffect } from 'react';
import { User, Users, Film, Bookmark, MessageSquare, Compass, ShieldCheck, ChevronRight, TrendingUp } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { getAvatar } from '../../utils/avatars';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Desktop3ColumnLayout({
  children,
  user,
  onNavigate,
  activeNav = 'discover',
  featuredTalents = [],
  trendingCalls = []
}) {
  const [profileData, setProfileData] = useState(null);

  const uid = user?.uid || user?.id;

  useEffect(() => {
    if (!uid) {
      setProfileData(null);
      return;
    }

    const unsubProfile = onSnapshot(doc(db, 'profiles', uid), (snap) => {
      if (snap.exists()) {
        setProfileData(snap.data());
      } else {
        const unsubUser = onSnapshot(doc(db, 'users', uid), (userSnap) => {
          if (userSnap.exists()) {
            setProfileData(userSnap.data());
          }
        });
        return () => unsubUser();
      }
    });

    return () => unsubProfile();
  }, [uid]);

  const realName =
    profileData?.name ||
    profileData?.fullName ||
    [profileData?.firstName, profileData?.lastName].filter(Boolean).join(' ') ||
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Talent Member';

  const realRole =
    profileData?.role ||
    profileData?.category ||
    user?.role ||
    user?.category ||
    'Actor / Model';

  const realImage =
    profileData?.image ||
    profileData?.photoURL ||
    profileData?.profileImage ||
    user?.image ||
    user?.photoURL ||
    user?.profileImage;

  const isVerified = profileData?.verified || user?.verified;
  const gender = profileData?.gender || user?.gender;

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT SIDEBAR (Desktop Only: xl+) */}
          <aside className="hidden xl:block xl:col-span-3 sticky top-24 space-y-8 h-fit">
            
            {/* Seamless User Profile Section */}
            {user ? (
              <div className="space-y-3 px-2">
                <div className="flex items-center gap-3">
                  <Avatar src={getAvatar(realImage, gender)} size="lg" className="ring-2 ring-[#00BFFF]/30 shadow-md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-white font-bold text-base truncate">{realName}</h3>
                      {isVerified && <ShieldCheck className="w-4 h-4 text-[#00BFFF] flex-shrink-0" />}
                    </div>
                    <p className="text-gray-400 text-xs font-medium truncate mt-0.5">{realRole}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate?.('profile')}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer hover:border-white/20 active:scale-[0.98]"
                >
                  <User className="w-3.5 h-3.5 text-[#00BFFF]" />
                  <span>View My Profile</span>
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl text-center space-y-4">
                <h3 className="text-white font-extrabold text-base">Join NepalCasts</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Connect with top directors and casting opportunities in Nepal.</p>
                <button
                  type="button"
                  onClick={() => onNavigate?.('signin')}
                  className="w-full py-3 bg-[#00BFFF] hover:opacity-90 text-black font-extrabold rounded-2xl text-sm transition-all cursor-pointer shadow-lg shadow-[#00BFFF]/25 active:scale-[0.98]"
                >
                  Sign In / Register
                </button>
              </div>
            )}

            {/* Quick Navigation Menu */}
            <div className="space-y-2 px-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-500 px-3 py-1 block">Quick Menu</span>
              
              <button
                type="button"
                onClick={() => onNavigate?.('home')}
                className={`w-full px-4 py-3.5 rounded-2xl text-base font-bold flex items-center justify-between transition-all cursor-pointer ${
                  activeNav === 'discover'
                    ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 shadow-lg shadow-[#00BFFF]/5'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Compass className="w-5 h-5" />
                  <span>Discover Feed</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('talent')}
                className={`w-full px-4 py-3.5 rounded-2xl text-base font-bold flex items-center justify-between transition-all cursor-pointer ${
                  activeNav === 'talent'
                    ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 shadow-lg shadow-[#00BFFF]/5'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Users className="w-5 h-5" />
                  <span>Talent Directory</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('casting')}
                className={`w-full px-4 py-3.5 rounded-2xl text-base font-bold flex items-center justify-between transition-all cursor-pointer ${
                  activeNav === 'casting'
                    ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 shadow-lg shadow-[#00BFFF]/5'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Film className="w-5 h-5" />
                  <span>Casting Calls</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>

              {user && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('messages')}
                    className={`w-full px-4 py-3.5 rounded-2xl text-base font-bold flex items-center justify-between transition-all cursor-pointer ${
                      activeNav === 'messages'
                        ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 shadow-lg shadow-[#00BFFF]/5'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <MessageSquare className="w-5 h-5" />
                      <span>Messages</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-60" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('saved-castings')}
                    className={`w-full px-4 py-3.5 rounded-2xl text-base font-bold flex items-center justify-between transition-all cursor-pointer ${
                      activeNav === 'saved-castings' || activeNav === 'saved-casting'
                        ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 shadow-lg shadow-[#00BFFF]/5'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Bookmark className="w-5 h-5" />
                      <span>Saved Calls</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-60" />
                  </button>
                </>
              )}
            </div>
          </aside>

          {/* CENTER MAIN CONTENT */}
          <main className="col-span-12 xl:col-span-6 min-w-0">
            {children}
          </main>

          {/* RIGHT SIDEBAR (Desktop Only: xl+) */}
          <aside className="hidden xl:block xl:col-span-3 sticky top-24 space-y-8 h-fit">
            
            {/* Featured Talent Widget */}
            {featuredTalents.length > 0 && (
              <div className="space-y-4 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black text-base">
                    <Users className="w-5 h-5 text-[#00BFFF]" />
                    <span>Featured Talent</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('talent')}
                    className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {featuredTalents.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate?.('profile', item.id)}
                      className="flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                    >
                      <Avatar src={getAvatar(item.image || item.photoURL, item.gender)} size="lg" />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-white text-sm font-bold group-hover:text-[#00BFFF] transition-colors truncate">
                          {item.name || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Artist'}
                        </h5>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{item.role || item.category || 'Talent'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Casting Calls Widget */}
            {trendingCalls.length > 0 && (
              <div className="space-y-4 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black text-base">
                    <TrendingUp className="w-5 h-5 text-[#00BFFF]" />
                    <span>Active Casting Calls</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('casting')}
                    className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {trendingCalls.slice(0, 3).map((call) => (
                    <div
                      key={call.id}
                      onClick={() => onNavigate?.('casting-detail', call.id)}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer group space-y-1.5"
                    >
                      <h5 className="text-white text-sm font-bold group-hover:text-[#00BFFF] transition-colors line-clamp-1">
                        {call.title}
                      </h5>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{call.type || 'General'}</span>
                        <span className="text-[#00BFFF] font-bold">{call.location || 'Nepal'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}
