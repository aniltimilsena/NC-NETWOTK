import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { FollowItemSkeleton } from '../../../components/ui/Skeleton';
import { formatRole } from '../../../utils';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
interface UserProfile {
    uid: string;
    name?: string;
    image?: string;
    role?: string;
}

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (userId: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onSelectUser }: NewChatModalProps) {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen)
            return;
        let isMounted = true;
        const fetchProfiles = async () => {
            setLoading(true);
            try {
                const snap = await getDocs(query(collection(db, 'profiles'), limit(30)));
                if (!isMounted) return;
                const list = snap.docs.map(d => ({
                    uid: d.id,
                    ...(d.data() as Omit<UserProfile, 'uid'>)
                }));
                setProfiles(list);
            }
            catch (err) {
                console.warn("Failed to fetch user profiles for new chat:", err);
            }
            finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchProfiles();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            isMounted = false;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen)
        return null;

    const filtered = profiles.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()));

    return (<div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-[#181818] border border-white/5 w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
          <h3 className="text-base font-bold text-white">New Conversation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5"/>
          </button>
        </div>

        
        <div className="p-3.5 border-b border-white/5">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4"/>
            </span>
            <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#141414] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-white/20 transition-all"/>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
          {loading ? (
            <FollowItemSkeleton count={4} type="follow" />
          ) : filtered.length > 0 ? (filtered.map((p) => (<div key={p.uid} onClick={() => {
                onSelectUser(p.uid);
                onClose();
            }} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                <Avatar userId={p.uid} src={p.image} name={p.name} size="sm"/>
                <div className="text-left">
                  <span className="text-sm font-bold text-white block">{p.name || 'User'}</span>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{formatRole(p.role)}</span>
                </div>
              </div>))) : (<p className="text-xs text-gray-400 text-center py-8">No users found.</p>)}
        </div>
      </div>
    </div>);
}
export type { NewChatModalProps, UserProfile };
