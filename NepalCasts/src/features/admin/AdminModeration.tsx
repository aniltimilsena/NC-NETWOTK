import React, { useState, useEffect } from 'react';
import { ShieldAlert, User, AlertTriangle, CheckCircle, Trash2, ShieldX, X, Eye, AlertCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { logAdminAction } from '../../services';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
type SafetyReport = {
    id: string;
    reporter?: string;
    reporterId?: string;
    subject?: string;
    reason?: string;
    type?: string;
    priority?: 'Critical' | 'High' | 'Low';
    status?: 'Pending' | 'Resolved' | 'Dismissed';
    targetUserId?: string;
    targetContentId?: string;
    contentType?: string;
    createdAt?: any;
    actionTaken?: string;
};
export default function AdminModeration() {
    const [reports, setReports] = useState<SafetyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'Pending' | 'Resolved' | 'Dismissed' | 'All'>('Pending');
    const [selectedReport, setSelectedReport] = useState<SafetyReport | null>(null);
    const adminEmail = CurrentUser.email || '';
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        description: '',
        confirmText: '',
        cancelText: '',
        type: 'default' as 'default' | 'danger' | 'warning' | 'success' | 'info',
        isLoading: false,
        onConfirm: () => { },
    });
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "reports"), (snap) => {
            const data = snap.docs.map(docSnap => {
                const r = docSnap.data();
                return {
                    id: docSnap.id,
                    status: 'Pending',
                    ...r
                } as SafetyReport;
            });
            setReports(data);
            setLoading(false);
        }, (error) => {
            console.error("Failed to sync reports", error);
            setLoading(false);
        });
        return () => unsub();
    }, []);
    const handleResolveReport = async (reportId: string, actionType: string = 'Resolved') => {
        try {
            await updateDoc(doc(db, "reports", reportId), {
                status: 'Resolved',
                actionTaken: actionType,
                resolvedAt: new Date(),
                resolvedBy: adminEmail
            });
            await logAdminAction(adminEmail, "Resolve Report", reportId, `Marked report as Resolved. Action: ${actionType}`);
            if (selectedReport?.id === reportId) {
                setSelectedReport(prev => prev ? { ...prev, status: 'Resolved', actionTaken: actionType } : null);
            }
            alert(`Report resolved with status: ${actionType}!`);
        }
        catch (err) {
            console.error("Failed to resolve report:", err);
            alert("Error resolving report.");
        }
    };
    const handleDismissReport = async (reportId: string) => {
        try {
            await updateDoc(doc(db, "reports", reportId), {
                status: 'Dismissed',
                actionTaken: 'Dismissed',
                resolvedAt: new Date(),
                resolvedBy: adminEmail
            });
            await logAdminAction(adminEmail, "Dismiss Report", reportId, "Dismissed report (no violation)");
            if (selectedReport?.id === reportId) {
                setSelectedReport(prev => prev ? { ...prev, status: 'Dismissed', actionTaken: 'Dismissed' } : null);
            }
            alert("Report dismissed successfully!");
        }
        catch (err) {
            console.error("Failed to dismiss report:", err);
            alert("Error dismissing report.");
        }
    };
    const handleWarnUser = async (reportId: string, userId: string, subjectName: string) => {
        if (!userId) {
            alert("No target user found in this report.");
            return;
        }
        try {
            await updateDoc(doc(db, "users", userId), { status: 'Warned', warned: true });
            await updateDoc(doc(db, "profiles", userId), { status: 'Warned', warned: true });
            await handleResolveReport(reportId, 'User Warned');
            await logAdminAction(adminEmail, "Warn User", userId, `Issued formal warning to user ${subjectName}`);
            alert(`Warning registered for user ${subjectName || 'user'} and report resolved!`);
        }
        catch (err) {
            console.error("Failed to warn:", err);
            alert("Error sending warning.");
        }
    };
    const handleBanEntity = async (reportId: string, targetId: string) => {
        if (!targetId) {
            alert("No target entity specified in this report.");
            return;
        }
        try {
            await updateDoc(doc(db, "users", targetId), { status: 'Banned' });
            await updateDoc(doc(db, "profiles", targetId), { status: 'Banned' });
            await handleResolveReport(reportId, 'User Banned');
            await logAdminAction(adminEmail, "Ban User", targetId, "Banned user account and profile");
            alert("User banned and report resolved!");
        }
        catch (err) {
            console.error("Failed to ban entity:", err);
            alert("Error banning entity.");
        }
    };
    const handleDeleteContent = (reportId: string, contentType: string, contentId: string) => {
        if (!contentId || !contentType) {
            alert("No content details available to delete.");
            return;
        }
        setConfirmConfig({
            isOpen: true,
            title: "Delete Content?",
            description: `Are you sure you want to delete the reported content (${contentType})? This cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            type: "danger",
            isLoading: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                try {
                    if (contentType.toLowerCase() === 'casting_call' || contentType.toLowerCase() === 'casting call') {
                        await deleteDoc(doc(db, "casting_calls", contentId));
                    }
                    else if (contentType.toLowerCase() === 'profile' || contentType.toLowerCase() === 'talent content') {
                        await updateDoc(doc(db, "profiles", contentId), { bio: '[Bio deleted by admin moderation]', media: [] });
                    }
                    else {
                        await deleteDoc(doc(db, contentType, contentId));
                    }
                    await handleResolveReport(reportId, 'Content Deleted');
                    await logAdminAction(adminEmail, "Delete Reported Content", contentId, `Deleted reported ${contentType}`);
                    alert("Reported content deleted successfully!");
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
                catch (err) {
                    console.error("Failed to delete content:", err);
                    alert("Error deleting content.");
                }
                finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };
    const handleDeleteReportRecord = (reportId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Report?",
            description: "Are you sure you want to permanently delete this report record from history?",
            confirmText: "Delete",
            cancelText: "Cancel",
            type: "danger",
            isLoading: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                try {
                    await deleteDoc(doc(db, "reports", reportId));
                    await logAdminAction(adminEmail, "Delete Report Record", reportId, "Deleted report record");
                    if (selectedReport?.id === reportId) {
                        setSelectedReport(null);
                    }
                    alert("Report deleted.");
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
                catch (err) {
                    console.error("Failed to delete report:", err);
                    alert("Error deleting report.");
                }
                finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };
    const filteredReports = reports.filter(r => {
        if (filterStatus === 'All')
            return true;
        return r.status === filterStatus;
    });
    return (<div className="p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
      <ConfirmDialog {...confirmConfig} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}/>

      <>
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Trust & Safety</h2>
              <p className="text-nc-muted text-sm mt-1">Manage global user/content reports, warn violators, and enforce community standards.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="flex bg-admin-surface border border-admin-border p-1 rounded-xl">
                {(['Pending', 'Resolved', 'Dismissed', 'All'] as const).map(statusVal => (<button key={statusVal} onClick={() => setFilterStatus(statusVal)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterStatus === statusVal ? 'bg-admin-primary text-white' : 'text-nc-muted hover:text-white'}`}>
                    {statusVal === 'Pending' ? 'Active Reports' : statusVal}
                  </button>))}
              </div>

              <div className="bg-admin-surface border border-admin-error/20 px-4 py-1.5 rounded-xl flex items-center gap-3">
                <span className="text-[10px] font-black text-admin-error uppercase animate-pulse">Critical Alerts</span>
                <span className="text-xl font-bold text-white">{reports.filter(r => r.priority === 'Critical' && r.status === 'Pending').length}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-admin-surface border border-admin-border rounded-2xl p-6 animate-pulse flex flex-col lg:flex-row lg:items-center gap-6" aria-hidden="true">
                    <div className="lg:w-1/4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg skeleton" />
                        <div className="h-4 skeleton rounded w-24" />
                      </div>
                      <div className="h-3.5 skeleton rounded w-32" />
                    </div>
                    <div className="lg:w-1/2 flex-1 space-y-2 text-left">
                      <div className="h-4 skeleton rounded w-full" />
                      <div className="h-3 skeleton rounded w-2/3" />
                    </div>
                    <div className="lg:w-1/4 h-8 skeleton rounded-xl w-24 ml-auto" />
                  </div>
                ))}
              </div>
            ) : filteredReports.length === 0 ? (<div className="py-20 text-center bg-admin-surface rounded-2xl border border-dashed border-admin-border">
                <p className="text-nc-muted text-sm font-medium">No safety or content reports found matching your selection.</p>
              </div>) : (filteredReports.map((report) => {
            const isPending = report.status === 'Pending';
            return (<div key={report.id} className="bg-admin-surface border border-admin-border rounded-2xl p-6 hover:bg-admin-surface-light/30 transition-all flex flex-col lg:flex-row lg:items-center gap-6 relative group overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${report.priority === 'Critical' ? 'bg-admin-error' :
                    report.priority === 'High' ? 'bg-admin-warning' :
                        'bg-admin-primary'}`}></div>
                    
                    <div className="lg:w-1/4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${report.type === 'User Report' ? 'bg-admin-primary/10 text-admin-primary' :
                    report.type === 'Content Flag' ? 'bg-admin-secondary/10 text-admin-secondary' :
                        'bg-admin-error/10 text-admin-error'}`}>
                          {report.type === 'User Report' ? <User className="w-4 h-4"/> :
                    report.type === 'Content Flag' ? <ShieldAlert className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                        </div>
                        <h4 className="font-bold text-white uppercase tracking-widest text-[10px]">{report.type || 'Moderation Report'}</h4>
                      </div>
                      <p className="text-xs text-white/50">Reporter ID: <span className="font-mono text-white/85 text-[10px]">{report.reporterId || 'Anonymous'}</span></p>
                    </div>

                    <div className="lg:w-2/4">
                      <span className="text-[10px] font-black text-nc-muted uppercase tracking-widest block mb-1">Subject: {report.subject || 'N/A'}</span>
                      <p className="text-sm text-white font-medium leading-relaxed line-clamp-2">{report.reason || 'No description provided'}</p>
                    </div>

                    <div className="lg:ml-auto flex items-center gap-2">
                      <button onClick={() => setSelectedReport(report)} className="p-2 text-nc-muted hover:text-white rounded-lg hover:bg-white/5" title="View Moderation Inspector">
                        <Eye className="w-4 h-4"/>
                      </button>

                      {isPending ? (<>
                          <button onClick={() => handleResolveReport(report.id, 'Resolved')} className="px-4 py-2 bg-admin-surface-light hover:bg-admin-success/15 text-admin-success text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5"/> Resolve
                          </button>
                          
                          <button onClick={() => handleWarnUser(report.id, report.targetUserId || '', report.subject || '')} className="px-4 py-2 bg-admin-surface-light hover:bg-admin-warning/15 text-admin-warning text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all">
                             Warn
                          </button>
                          
                          <button onClick={() => handleBanEntity(report.id, report.targetUserId || '')} className="px-4 py-2 bg-admin-error/80 hover:bg-admin-error text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-admin-error/10 transition-all flex items-center gap-2">
                            <ShieldX className="w-3.5 h-3.5"/> Ban Entity
                          </button>
                        </>) : (<span className="text-xs font-bold text-nc-muted bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 uppercase">
                          Resolved: {report.actionTaken}
                        </span>)}

                      <button onClick={() => handleDeleteReportRecord(report.id)} className="p-2 text-nc-muted hover:text-admin-error rounded-lg hover:bg-admin-error/10 transition-colors" title="Delete Report Record">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>);
        }))}
          </div>
        </>

      
      {selectedReport && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-surface-light/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-admin-bg border border-admin-border flex items-center justify-center text-admin-error">
                  <ShieldAlert className="w-6 h-6 animate-pulse"/>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Safety Report Inspector</h3>
                  <p className="text-xs text-nc-muted uppercase tracking-widest font-black">Audit Violations & Infractions</p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-1 text-nc-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>

            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1">Report Meta Data</h4>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Report ID:</span>
                      <span className="font-mono text-white">{selectedReport.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Type:</span>
                      <span className="font-bold text-white">{selectedReport.type || 'Moderation Flag'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Priority:</span>
                      <span className={`font-black uppercase tracking-wider ${selectedReport.priority === 'Critical' ? 'text-admin-error' :
                selectedReport.priority === 'High' ? 'text-admin-warning' :
                    'text-admin-primary'}`}>{selectedReport.priority || 'Low'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Reporter UID:</span>
                      <span className="font-mono text-white/70 truncate w-32 text-right block" title={selectedReport.reporterId}>{selectedReport.reporterId || 'Anonymous'}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                      <span className="text-nc-muted">Report Status:</span>
                      <span className="font-bold text-white uppercase">{selectedReport.status}</span>
                    </div>
                    {selectedReport.actionTaken && (<div className="flex justify-between">
                        <span className="text-nc-muted">Action Logged:</span>
                        <span className="font-bold text-admin-success uppercase">{selectedReport.actionTaken}</span>
                      </div>)}
                  </div>
                </div>

                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1">Violator / Target Context</h4>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Subject:</span>
                      <span className="font-bold text-white">{selectedReport.subject || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Target UID:</span>
                      <span className="font-mono text-white/70 truncate w-32 text-right block" title={selectedReport.targetUserId}>{selectedReport.targetUserId || 'N/A'}</span>
                    </div>
                    {selectedReport.targetContentId && (<>
                        <div className="flex justify-between">
                          <span className="text-nc-muted">Content ID:</span>
                          <span className="font-mono text-white/70 truncate w-32 text-right block" title={selectedReport.targetContentId}>{selectedReport.targetContentId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-nc-muted">Content Type:</span>
                          <span className="font-bold text-admin-primary uppercase">{selectedReport.contentType || 'General Content'}</span>
                        </div>
                      </>)}
                  </div>
                </div>
              </div>

              
              <div>
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1 mb-2">Infraction Narrative</h4>
                <p className="text-sm text-white/80 leading-relaxed bg-admin-bg/30 border border-admin-border p-4 rounded-xl">
                  {selectedReport.reason || 'No description provided by the reporter.'}
                </p>
              </div>

              
              {selectedReport.status === 'Pending' && (<div className="bg-admin-bg/50 border border-admin-border p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-black text-admin-error uppercase tracking-widest flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4"/> Moderation & Remediation Panel
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleResolveReport(selectedReport.id, 'Resolved')} className="px-4 py-2 bg-admin-success/20 hover:bg-admin-success text-admin-success hover:text-white text-[10px] font-black uppercase rounded-lg border border-admin-success/30 transition-all flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5"/> Mark Resolved
                    </button>
                    
                    <button onClick={() => handleDismissReport(selectedReport.id)} className="px-4 py-2 bg-admin-surface-light hover:bg-white/5 text-white text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all">
                      Dismiss Report
                    </button>

                    {selectedReport.targetUserId && (<>
                        <button onClick={() => handleWarnUser(selectedReport.id, selectedReport.targetUserId || '', selectedReport.subject || '')} className="px-4 py-2 bg-admin-warning/20 hover:bg-admin-warning text-admin-warning hover:text-black text-[10px] font-black uppercase rounded-lg border border-admin-warning/30 transition-all flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5"/> Warn User
                        </button>
                        
                        <button onClick={() => handleBanEntity(selectedReport.id, selectedReport.targetUserId || '')} className="px-4 py-2 bg-admin-error/20 hover:bg-admin-error text-admin-error hover:text-white text-[10px] font-black uppercase rounded-lg border border-admin-error/30 transition-all flex items-center gap-1.5">
                          <ShieldX className="w-3.5 h-3.5"/> Ban User
                        </button>
                      </>)}

                    {selectedReport.targetContentId && selectedReport.contentType && (<button onClick={() => handleDeleteContent(selectedReport.id, selectedReport.contentType || '', selectedReport.targetContentId || '')} className="px-4 py-2 bg-admin-error text-white hover:bg-red-700 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5 ml-auto">
                        <Trash2 className="w-3.5 h-3.5"/> Delete Content
                      </button>)}
                  </div>
                </div>)}
            </div>

            
            <div className="p-4 bg-admin-surface-light/20 border-t border-admin-border flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-admin-surface-light text-white text-xs font-bold rounded-lg border border-admin-border hover:bg-white/5 transition-colors">
                Close Inspector
              </button>
            </div>
          </div>
        </div>)}


    </div>);
}
