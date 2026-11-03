import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { formatRole } from '../../../utils';
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
        followers: 'Connects',
        following: 'Connected',
        projects: 'Posted Casting Calls'
    };
    return (<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-inter" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white border border-[#E7E5E0] w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[500px] shadow-card" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#E7E5E0]">
          <h3 className="font-display text-base font-semibold text-[#202923]">{titleMap[type]}</h3>
          <button onClick={onClose} className="text-[#777C75] hover:text-[#202923] transition-colors cursor-pointer">
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
                  return (<div key={project.id} className="p-4 rounded-xl bg-[#FAF8F4] hover:bg-[#F3F0E9] border border-[#E7E5E0] transition-all cursor-pointer" onClick={() => {
                          onClose();
                          onNavigate('casting_detail', project.id);
                      }}>
                    <span className="text-sm font-semibold text-[#202923] block mb-1">{project.title}</span>
                    <div className="flex justify-between text-[10px] text-[#626860] font-semibold uppercase tracking-wider">
                      <span>{project.production}</span>
                      <span>{project.location}</span>
                    </div>
                  </div>);
                }
                const userItem = item as FollowItem;
                return (<div key={userItem.id} className="flex justify-between items-center gap-3 p-2.5 rounded-xl hover:bg-[#FAF8F4] transition-all cursor-pointer" onClick={() => {
                        onClose();
                        onNavigate('profile', userItem.id);
                    }}>
                    <div className="flex items-center gap-3">
                      <Avatar userId={userItem.id} src={userItem.image} name={userItem.name} size="sm" className="border border-[#E7E5E0]"/>
                      <div>
                        <span className="text-sm font-semibold text-[#202923] block">{userItem.name}</span>
                        <span className="text-[10px] text-[#626860] font-medium uppercase tracking-wider">{formatRole(userItem.role)}</span>
                      </div>
                    </div>
                  </div>);
            })}
            </div>) : (<p className="text-sm text-[#777C75] text-center py-8">No records found.</p>)}
        </div>
      </div>
    </div>);
}
export type { FollowItem, ProjectItem };
