import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { db } from '../../../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export default function NewChatModal({
  isOpen,
  onClose,
  onSelectUser
}: NewChatModalProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'profiles'), limit(30)));
        const list = snap.docs.map(d => ({
          uid: d.id,
          ...d.data()
        }));
        setProfiles(list);
      } catch (err) {
        console.warn("Failed to fetch user profiles for new chat:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = profiles.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0E0E0E] border border-white/5 w-full max-w-md rounded-[2.2rem] overflow-hidden flex flex-col max-h-[480px]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/5">
          <h3 className="text-lg font-black text-white">New Conversation</h3>
          <button 
            onClick={onClose} 
            className="text-nc-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nc-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/20 outline-none focus:border-[#00BFFF]/20 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          {loading ? (
            <div className="w-6 h-6 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto my-8" />
          ) : filtered.length > 0 ? (
            filtered.map((p) => (
              <div
                key={p.uid}
                onClick={() => {
                  onSelectUser(p.uid);
                  onClose();
                }}
                className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-all"
              >
                <Avatar src={p.image} name={p.name} size="sm" />
                <div className="text-left">
                  <span className="text-sm font-bold text-white block">{p.name}</span>
                  <span className="text-[10px] text-nc-muted font-semibold uppercase tracking-wider">{p.role || 'Talent'}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-nc-muted text-center py-8">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
export type { NewChatModalProps };
