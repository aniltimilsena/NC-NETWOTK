import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { FollowItemSkeleton } from '../../../components/ui/Skeleton';
interface FollowItem {
    id: string;
    name: string;
    image: string;
    role: string;
}
interface ProjectItem {
    id: string;
    title: string;
    production: string;
    status: string;
    location: string;
}
interface FollowModalProps {
    type: 'followers' | 'following' | 'projects';
    isOpen: boolean;
    onClose: () => void;
    list: (FollowItem | ProjectItem)[];
    loading: boolean;
    onNavigate: (page: string, param?: any) => void;
}
export default function FollowModal({ type, isOpen, onClose, list, loading, onNavigate }: FollowModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen)
        return null;
    const titleMap = {
        followers: 'Followers',
        following: 'Following',
        projects: 'Posted Casting Calls'
    };
    return (<div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-[#0E0E0E] border border-white/5 w-full max-w-md rounded-[2.2rem] overflow-hidden flex flex-col max-h-[500px]" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/5">
          <h3 className="text-lg font-bold text-gray-100">{titleMap[type]}</h3>
          <button onClick={onClose} className="text-nc-muted hover:text-white transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <FollowItemSkeleton count={3} type={type} />
          ) : list.length > 0 ? (<div className="space-y-3.5">
              {list.map((item) => {
                if (type === 'projects') {
                  const project = item as ProjectItem;
                  return (<div key={project.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer" onClick={() => {
                          onClose();
                          onNavigate('casting_detail', project.id);
                      }}>
                    <span className="text-sm font-bold text-gray-100 block mb-1">{project.title}</span>
                    <div className="flex justify-between text-[10px] text-nc-muted font-bold uppercase tracking-wider">
                      <span>{project.production}</span>
                      <span>{project.location}</span>
                    </div>
                  </div>);
                }
                const userItem = item as FollowItem;
                return (<div key={userItem.id} className="flex justify-between items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer" onClick={() => {
                        onClose();
                        onNavigate('profile', userItem.id);
                    }}>
                    <div className="flex items-center gap-3">
                      <Avatar userId={userItem.id} src={userItem.image} name={userItem.name} size="sm"/>
                      <div>
                        <span className="text-sm font-bold text-gray-100 block">{userItem.name}</span>
                        <span className="text-[10px] text-nc-muted font-semibold uppercase tracking-wider">{userItem.role}</span>
                      </div>
                    </div>
                  </div>);
            })}
            </div>) : (<p className="text-sm text-nc-muted text-center py-8">No records found.</p>)}
        </div>
      </div>
    </div>);
}
export type { FollowItem, ProjectItem };
