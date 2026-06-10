import React, { useState, useEffect } from 'react';
import { ShieldAlert, User, MessageCircle, AlertTriangle, CheckCircle, Ban, Trash2, ShieldX } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function AdminModeration() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleResolveReport = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, "reports", reportId));
      alert("Report resolved and removed from queue!");
    } catch (err) {
      console.error("Failed to resolve report:", err);
      alert("Error resolving report.");
    }
  };

  const handleWarnReport = async (reportId: string, subjectName: string) => {
    try {
      await deleteDoc(doc(db, "reports", reportId));
      alert(`Warning notification sent to ${subjectName || 'user'} and report closed!`);
    } catch (err) {
      console.error("Failed to warn:", err);
      alert("Error sending warning.");
    }
  };

  const handleBanEntity = async (reportId: string, targetId: string) => {
    try {
      if (targetId) {
        await updateDoc(doc(db, "users", targetId), { status: 'Suspended' });
        await updateDoc(doc(db, "profiles", targetId), { status: 'Suspended' });
      }
      await deleteDoc(doc(db, "reports", reportId));
      alert("Entity banned and report resolved!");
    } catch (err) {
      console.error("Failed to ban entity:", err);
      alert("Error banning entity.");
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        await deleteDoc(doc(db, "reports", reportId));
        alert("Report deleted.");
      } catch (err) {
        console.error("Failed to delete report:", err);
        alert("Error deleting report.");
      }
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reports"), (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(data);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync reports", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Trust & Safety</h2>
          <p className="text-nc-muted text-sm mt-1">Manage global reports and enforce community standards.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-admin-primary text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-admin-primary/20">
            Export Safety Report
          </button>
          <div className="bg-admin-surface border border-admin-error/20 px-6 py-3 rounded-2xl flex flex-col items-end">
            <span className="text-[10px] font-black text-admin-error uppercase animate-pulse">Critical Reports</span>
            <span className="text-2xl font-bold text-white">{reports.filter(r => r.priority === 'Critical').length}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-xs text-nc-muted p-6">Loading safety queue...</p>
        ) : reports.length === 0 ? (
          <div className="py-20 text-center bg-admin-surface rounded-2xl border border-dashed border-admin-border">
            <p className="text-nc-muted text-sm font-medium">No unresolved safety or content reports in the queue.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-admin-surface border border-admin-border rounded-2xl p-6 hover:bg-admin-surface-light/30 transition-all flex flex-col lg:flex-row lg:items-center gap-6 relative group overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                report.priority === 'Critical' ? 'bg-admin-error' :
                report.priority === 'High' ? 'bg-admin-warning' :
                'bg-admin-primary'
              }`}></div>
              
              <div className="lg:w-1/4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    report.type === 'User Report' ? 'bg-admin-primary/10 text-admin-primary' :
                    report.type === 'Content Flag' ? 'bg-admin-secondary/10 text-admin-secondary' :
                    'bg-admin-error/10 text-admin-error'
                  }`}>
                    {report.type === 'User Report' ? <User className="w-4 h-4" /> : 
                     report.type === 'Content Flag' ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <h4 className="font-bold text-white uppercase tracking-widest text-[10px]">{report.type}</h4>
                </div>
                <p className="text-sm font-bold text-white/50">Reporter: <span className="text-white">{report.reporter || 'Anonymous'}</span></p>
              </div>

              <div className="lg:w-2/4">
                <span className="text-[10px] font-black text-nc-muted uppercase tracking-widest block mb-1">Subject: {report.subject || 'Unknown'}</span>
                <p className="text-sm text-white font-medium leading-relaxed">{report.reason || 'No description provided'}</p>
              </div>

              <div className="lg:ml-auto flex items-center gap-2">
                <button 
                  onClick={() => handleResolveReport(report.id)}
                  className="px-4 py-2 bg-admin-surface-light hover:bg-admin-success/10 text-admin-success text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Resolve
                </button>
                <button 
                  onClick={() => handleWarnReport(report.id, report.subject)}
                  className="px-4 py-2 bg-admin-surface-light hover:bg-admin-warning/10 text-admin-warning text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all flex items-center gap-2"
                >
                   Warn
                </button>
                <button 
                  onClick={() => handleBanEntity(report.id, report.targetUserId || report.userId)}
                  className="px-4 py-2 bg-admin-error/80 hover:bg-admin-error text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-admin-error/10 transition-all flex items-center gap-2"
                >
                  <ShieldX className="w-3.5 h-3.5" /> Ban Entity
                </button>
                <button 
                  onClick={() => handleDeleteReport(report.id)}
                  className="p-2 text-nc-muted hover:text-admin-error rounded-lg hover:bg-admin-error/10 transition-colors"
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
