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

    return (<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-inter" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white border border-[#E7E5E0] w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[480px] shadow-card" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex justify-between items-center px-5 py-4 border-b border-[#E7E5E0]">
          <h3 className="font-display text-base font-semibold text-[#202923]">New Conversation</h3>
          <button onClick={onClose} className="text-[#777C75] hover:text-[#202923] transition-colors cursor-pointer">
            <X className="w-5 h-5"/>
          </button>
        </div>

        
        <div className="p-3.5 border-b border-[#E7E5E0] bg-[#FAF8F4]">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777C75]">
              <Search className="w-4 h-4"/>
            </span>
            <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white rounded-xl py-2 pl-9 pr-4 text-xs text-[#202923] placeholder-[#777C75] border border-[#E7E5E0] outline-none focus:ring-1 focus:ring-[#194332] focus:border-[#194332] transition-all"/>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1">
          {loading ? (
            <FollowItemSkeleton count={4} type="follow" />
          ) : filtered.length > 0 ? (filtered.map((p) => (<div key={p.uid} onClick={() => {
                onSelectUser(p.uid);
                onClose();
            }} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[#FAF8F4] transition-all">
                <Avatar userId={p.uid} src={p.image} name={p.name} size="sm" className="border border-[#E7E5E0]"/>
                <div className="text-left">
                  <span className="text-sm font-semibold text-[#202923] block">{p.name || 'User'}</span>
                  <span className="text-[10px] text-[#626860] font-medium uppercase tracking-wider">{formatRole(p.role)}</span>
                </div>
              </div>))) : (<p className="text-xs text-[#777C75] text-center py-8">No users found.</p>)}
        </div>
      </div>
    </div>);
}
export type { NewChatModalProps, UserProfile };
