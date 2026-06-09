import React, { useState, useEffect } from 'react';
import { Briefcase, Eye, Users, Plus, AlertCircle, MoreVertical, Search, Filter, Trash2, Activity } from 'lucide-react';
import { subscribeToCastingCalls, deleteCastingCallAdmin, setCastingPriorityAdmin } from '../../services/casting';

export default function AdminCasting() {
  const [castingCalls, setCastingCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = subscribeToCastingCalls('All', (data) => {
      setCastingCalls(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this casting call?')) {
      await deleteCastingCallAdmin(id);
    }
  };

  const togglePriority = async (id: string, current: boolean) => {
    await setCastingPriorityAdmin(id, !current);
  };

  const filtered = castingCalls.filter(c => 
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.production?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="p-8 space-y-6 animate-in slide-in-from-right duration-500">
       <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Casting Board</h2>
          <p className="text-nc-muted text-sm mt-1">Orchestrate all platform projects and application flows.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nc-muted" />
             <input 
               type="text" 
               placeholder="Project name..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-admin-surface border border-admin-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none w-64" 
             />
          </div>
          <button className="p-2 bg-admin-surface border border-admin-border rounded-xl text-white">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-nc-muted">Loading projects...</p>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-admin-surface rounded-2xl border border-dashed border-admin-border">
            <p className="text-nc-muted">No casting calls found matching your criteria.</p>
          </div>
        ) : (
          filtered.map((call) => (
            <div key={call.id} className="bg-admin-surface border border-admin-border rounded-2xl p-6 relative group overflow-hidden">
              {call.highPriority && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-admin-primary text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg">
                  Highlighted
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-admin-surface-light border border-admin-border flex items-center justify-center text-admin-primary">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-white truncate text-lg pr-8">{call.title}</h4>
                  <p className="text-xs text-nc-muted uppercase tracking-tighter">Dir: {call.production || 'Verified Producer'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-admin-bg/50 p-3 rounded-xl border border-admin-border">
                  <div className="flex items-center gap-2 text-nc-muted mb-1 text-[10px] font-black uppercase">
                    <Users className="w-3.5 h-3.5" /> Apps
                  </div>
                  <p className="text-lg font-bold text-white">{call.applications?.length || 0}</p>
                </div>
                <div className="bg-admin-bg/50 p-3 rounded-xl border border-admin-border">
                  <div className="flex items-center gap-2 text-nc-muted mb-1 text-[10px] font-black uppercase">
                    <Activity className="w-3.5 h-3.5" /> Status
                  </div>
                  <p className={`text-lg font-bold text-admin-success`}>Active</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-admin-surface-light hover:bg-white/5 text-white text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all">
                  <Eye className="w-3.5 h-3.5" /> Moderation
                </button>
                <button 
                  onClick={() => togglePriority(call.id, call.highPriority)}
                  className={`flex items-center justify-center p-2.5 rounded-lg border border-admin-border transition-all ${call.highPriority ? 'bg-admin-primary text-white border-transparent' : 'text-admin-primary hover:bg-admin-primary/10'}`}
                >
                  <Plus className={`w-4 h-4 ${call.highPriority ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={() => handleDelete(call.id)}
                  className="flex items-center justify-center p-2.5 bg-admin-surface-light text-admin-error border border-admin-border rounded-lg hover:bg-admin-error/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
