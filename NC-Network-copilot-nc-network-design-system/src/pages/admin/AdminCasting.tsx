import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Eye, 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Activity, 
  X,
  CheckCircle,
  XCircle,
  Calendar,
  FolderOpen
} from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { deleteCastingCallAdmin, setCastingPriorityAdmin } from '../../services/casting';
import { logAdminAction } from '../../services/admin';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

type CastingCall = {
  id: string;
  title?: string;
  production?: string;
  createdBy?: string;
  budget?: string;
  deadline?: string;
  location?: string;
  type?: string;
  description?: string;
  requirements?: string[];
  status?: string;
  highPriority?: boolean;
};

type Applicant = {
  id: string;
  userName?: string;
  userEmail?: string;
  status?: string;
  appliedAt?: any;
};

export default function AdminCasting() {
  const [castingCalls, setCastingCalls] = useState<CastingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed' | 'Approved' | 'Rejected'>('All');
  
  
  const [selectedCall, setSelectedCall] = useState<CastingCall | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const adminEmail = auth.currentUser?.email || 'admin@nepalcasts.com';

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    type: 'default' as 'default' | 'danger' | 'warning' | 'success' | 'info',
    isLoading: false,
    onConfirm: () => {},
  });

  useEffect(() => {
    const q = collection(db, "casting_calls");
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CastingCall[];
      setCastingCalls(data);
      setLoading(false);
    }, (error) => {
      console.error("Casting calls subscription error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  
  useEffect(() => {
    if (!selectedCall) {
      setApplicants([]);
      return;
    }
    
    const fetchApplicants = async () => {
      setLoadingApplicants(true);
      try {
        const q = query(
          collection(db, 'applications'),
          where('castingId', '==', selectedCall.id)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(docSnap => {
          const appData = docSnap.data();
          let dateStr = 'Just now';
          if (appData.appliedAt) {
            const date = appData.appliedAt.toDate ? appData.appliedAt.toDate() : new Date(appData.appliedAt);
            dateStr = date.toLocaleDateString();
          }
          return {
            id: docSnap.id,
            userName: appData.userName || 'Anonymous Actor',
            userEmail: appData.userEmail || 'No email',
            status: appData.status || 'pending',
            appliedAt: dateStr
          };
        });
        setApplicants(list);
      } catch (err) {
        console.error("Error fetching applicants:", err);
      } finally {
        setLoadingApplicants(false);
      }
    };

    fetchApplicants();
  }, [selectedCall]);

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Casting Call?",
      description: "Are you sure you want to delete this casting call? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        try {
          const res = await deleteCastingCallAdmin(id);
          if (res.success) {
            await logAdminAction(adminEmail, "Delete Casting Call", id, "Permanently deleted casting call");
            if (selectedCall?.id === id) setSelectedCall(null);
            alert("Casting call deleted successfully!");
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          } else {
            alert("Error deleting casting call: " + res.error);
          }
        } catch (err: any) {
          console.error("Error deleting casting call:", err);
          alert("Error deleting casting call.");
        } finally {
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const togglePriority = async (id: string, current: boolean) => {
    const res = await setCastingPriorityAdmin(id, !current);
    if (res.success) {
      const actionName = !current ? "Highlight Casting Call" : "Unhighlight Casting Call";
      await logAdminAction(adminEmail, actionName, id, `Set highPriority to ${!current}`);
      if (selectedCall?.id === id) {
        setSelectedCall(prev => prev ? { ...prev, highPriority: !current } : null);
      }
    } else {
      alert("Error setting priority: " + res.error);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'Open' | 'Closed' | 'Approved' | 'Rejected') => {
    try {
      const updateData: any = { status: nextStatus };
      if (nextStatus === 'Approved') {
        updateData.approved = true;
      } else if (nextStatus === 'Rejected') {
        updateData.approved = false;
      }
      
      await updateDoc(doc(db, "casting_calls", id), updateData);
      
      await logAdminAction(adminEmail, "Moderate Casting Call Status", id, `Set status to ${nextStatus}`);
      
      if (selectedCall?.id === id) {
        setSelectedCall(prev => prev ? { ...prev, status: nextStatus } : null);
      }
      alert(`Casting call status updated to ${nextStatus}!`);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating casting call status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filtered = castingCalls.filter(c => {
    const matchesSearch = 
      (c.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.production ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'All' || 
      (c.status || 'Open').toLowerCase() === statusFilter.toLowerCase();
      
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-6 animate-in slide-in-from-right duration-500">
      <ConfirmDialog
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Casting Board</h2>
          <p className="text-nc-muted text-sm mt-1">Orchestrate and moderate all platform projects and application flows.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nc-muted" />
             <input 
               type="text" 
               placeholder="Project name, producer, ID..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="bg-admin-surface border border-admin-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-admin-primary w-full sm:w-64" 
             />
          </div>
          
          <div className="flex bg-admin-surface border border-admin-border p-1 rounded-xl">
            {(['All', 'Open', 'Closed', 'Approved', 'Rejected'] as const).map(statusVal => (
              <button
                key={statusVal}
                onClick={() => setStatusFilter(statusVal)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === statusVal ? 'bg-admin-primary text-white' : 'text-nc-muted hover:text-white'}`}
              >
                {statusVal}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-nc-muted">Loading projects...</p>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-admin-surface rounded-2xl border border-dashed border-admin-border">
            <p className="text-nc-muted text-sm">No casting calls found matching your criteria.</p>
          </div>
        ) : (
          filtered.map((call) => {
            const currentStatus = call.status || 'Open';
            return (
              <div key={call.id} className="bg-admin-surface border border-admin-border rounded-2xl p-6 relative group overflow-hidden flex flex-col justify-between">
                {call.highPriority && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-admin-primary text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg shadow-admin-primary/20">
                    Highlighted
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-admin-surface-light border border-admin-border flex items-center justify-center text-admin-primary">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div className="overflow-hidden pr-12">
                      <h4 className="font-bold text-white truncate text-base">{call.title}</h4>
                      <p className="text-xs text-nc-muted uppercase tracking-tighter truncate">Dir: {call.production || 'Producer'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-admin-bg/50 p-3 rounded-xl border border-admin-border">
                      <div className="flex items-center gap-2 text-nc-muted mb-1 text-[9px] font-black uppercase">
                        <Users className="w-3.5 h-3.5" /> Apps
                      </div>
                      <p className="text-base font-bold text-white">Pending Telemetry</p>
                    </div>
                    <div className="bg-admin-bg/50 p-3 rounded-xl border border-admin-border">
                      <div className="flex items-center gap-2 text-nc-muted mb-1 text-[9px] font-black uppercase">
                        <Activity className="w-3.5 h-3.5" /> status
                      </div>
                      <p className={`text-base font-black uppercase ${
                        currentStatus === 'Approved' ? 'text-admin-success' :
                        currentStatus === 'Rejected' ? 'text-admin-error' :
                        currentStatus === 'Closed' ? 'text-nc-muted' :
                        'text-admin-warning'
                      }`}>{currentStatus}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedCall(call)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-admin-surface-light hover:bg-white/5 text-white text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> Moderation Details
                    </button>
                    
                    <button 
                      onClick={() => togglePriority(call.id, !!call.highPriority)}
                      className={`flex items-center justify-center p-2 rounded-lg border border-admin-border transition-all ${
                        call.highPriority 
                          ? 'bg-admin-primary text-white border-transparent shadow-[0_0_12px_rgba(56,189,248,0.2)]' 
                          : 'text-admin-primary hover:bg-admin-primary/10'
                      }`}
                      title={call.highPriority ? "Remove Highlights" : "Add Highlight Tag"}
                    >
                      <Plus className={`w-4 h-4 ${call.highPriority ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {currentStatus !== 'Approved' && (
                      <button 
                        onClick={() => handleUpdateStatus(call.id, 'Approved')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-admin-success/20 hover:bg-admin-success text-admin-success hover:text-white text-[9px] font-black uppercase rounded-lg border border-admin-success/30 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {currentStatus !== 'Rejected' && currentStatus !== 'Closed' && (
                      <button 
                        onClick={() => handleUpdateStatus(call.id, 'Rejected')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-admin-error/20 hover:bg-admin-error text-admin-error hover:text-white text-[9px] font-black uppercase rounded-lg border border-admin-error/30 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(call.id)}
                      className="p-2 bg-admin-surface-light text-admin-error border border-admin-border rounded-lg hover:bg-admin-error/10"
                      title="Delete Casting Call"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Casting Call Moderation Inspector Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-surface-light/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-admin-bg border border-admin-border flex items-center justify-center text-admin-primary">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedCall.title}</h3>
                  <p className="text-xs text-nc-muted uppercase tracking-widest font-black">Producer: {selectedCall.production || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCall(null)}
                className="p-1 text-nc-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left side details */}
                <div className="md:col-span-7 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1 mb-2">Project Description</h4>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line bg-admin-bg/30 border border-admin-border/50 p-4 rounded-xl">
                      {selectedCall.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1 mb-3">Project Requirements</h4>
                    <ul className="space-y-2">
                      {selectedCall.requirements && selectedCall.requirements.length > 0 ? (
                        selectedCall.requirements.map((req, i) => (
                          <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                            <span className="text-admin-primary font-bold">•</span>
                            {req}
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-nc-muted italic">No requirements specified.</li>
                      )}
                    </ul>
                  </div>

                  {/* Details tags */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-admin-bg/20 p-2.5 rounded-lg border border-admin-border text-center flex flex-col items-center justify-center">
                      <span className="text-admin-primary font-black text-xs h-4 leading-none mb-1">Rs.</span>
                      <span className="text-[9px] font-black text-nc-muted uppercase block">Budget</span>
                      <span className="text-xs font-bold text-white truncate block">{selectedCall.budget || 'N/A'}</span>
                    </div>
                    <div className="bg-admin-bg/20 p-2.5 rounded-lg border border-admin-border text-center">
                      <Calendar className="w-4 h-4 text-admin-primary mx-auto mb-1" />
                      <span className="text-[9px] font-black text-nc-muted uppercase block">Deadline</span>
                      <span className="text-xs font-bold text-white truncate block">{selectedCall.deadline || 'N/A'}</span>
                    </div>
                    <div className="bg-admin-bg/20 p-2.5 rounded-lg border border-admin-border text-center">
                      <FolderOpen className="w-4 h-4 text-admin-primary mx-auto mb-1" />
                      <span className="text-[9px] font-black text-nc-muted uppercase block">Type</span>
                      <span className="text-xs font-bold text-white truncate block">{selectedCall.type || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Right side applicants */}
                <div className="md:col-span-5 space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1">Applicants list</h4>
                  
                  {loadingApplicants ? (
                    <p className="text-xs text-nc-muted">Retrieving applicant rosters...</p>
                  ) : applicants.length === 0 ? (
                    <div className="py-12 border border-dashed border-admin-border rounded-xl text-center text-xs text-nc-muted">
                      No applications submitted for this project yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                      {applicants.map(app => (
                        <div key={app.id} className="p-3 bg-admin-bg/40 border border-admin-border rounded-xl text-xs space-y-1.5 hover:border-admin-primary/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-white truncate pr-2">{app.userName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              app.status === 'accepted' ? 'bg-admin-success/20 text-admin-success' :
                              app.status === 'rejected' ? 'bg-admin-error/20 text-admin-error' :
                              'bg-admin-warning/20 text-admin-warning'
                            }`}>{app.status}</span>
                          </div>
                          <div className="text-[10px] text-nc-muted truncate">{app.userEmail}</div>
                          <div className="text-[9px] text-white/30">Applied: {app.appliedAt}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 bg-admin-surface-light/20 border-t border-admin-border flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="flex gap-2">
                <button 
                  onClick={() => togglePriority(selectedCall.id, !!selectedCall.highPriority)}
                  className={`px-4 py-2 text-xs font-black uppercase rounded-lg border transition-all flex items-center gap-1.5 ${
                    selectedCall.highPriority 
                      ? 'bg-admin-primary text-white border-transparent shadow-[0_0_12px_rgba(56,189,248,0.2)]' 
                      : 'bg-admin-surface text-admin-primary border-admin-border hover:bg-admin-primary/10'
                  }`}
                >
                  {selectedCall.highPriority ? 'Highlighted Active' : 'Highlight Casting'}
                </button>

                <button 
                  onClick={() => handleDelete(selectedCall.id)}
                  className="px-4 py-2 bg-admin-surface text-admin-error hover:bg-admin-error/10 text-xs font-black uppercase border border-admin-border rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Project
                </button>
              </div>

              <div className="flex gap-2">
                {selectedCall.status !== 'Approved' && (
                  <button 
                    onClick={() => handleUpdateStatus(selectedCall.id, 'Approved')}
                    className="px-4 py-2 bg-admin-success text-white hover:bg-green-600 text-xs font-black uppercase rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                  >
                    Approve
                  </button>
                )}
                {selectedCall.status !== 'Rejected' && selectedCall.status !== 'Closed' && (
                  <button 
                    onClick={() => handleUpdateStatus(selectedCall.id, 'Rejected')}
                    className="px-4 py-2 bg-admin-error text-white hover:bg-red-600 text-xs font-black uppercase rounded-lg transition-all"
                  >
                    Reject
                  </button>
                )}
                {selectedCall.status !== 'Closed' ? (
                  <button 
                    onClick={() => handleUpdateStatus(selectedCall.id, 'Closed')}
                    className="px-4 py-2 bg-admin-surface-light hover:bg-white/5 text-white text-xs font-black uppercase rounded-lg border border-admin-border transition-colors"
                  >
                    Close Board
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpdateStatus(selectedCall.id, 'Open')}
                    className="px-4 py-2 bg-admin-surface-light hover:bg-white/5 text-white text-xs font-black uppercase rounded-lg border border-admin-border transition-colors"
                  >
                    Reopen Board
                  </button>
                )}
                
                <button 
                  onClick={() => setSelectedCall(null)}
                  className="px-4 py-2 bg-admin-surface-light text-white text-xs font-bold rounded-lg border border-admin-border hover:bg-white/5 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
