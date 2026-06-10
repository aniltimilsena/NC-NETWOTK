import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, ShieldCheck, UserMinus, Trash2, Mail, ExternalLink, Activity } from 'lucide-react';
import { db } from "../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  activity?: string;
  joined?: string;
  avatar?: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const navigate = useNavigate();

  const handleVerify = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { verified: true });
      await updateDoc(doc(db, "profiles", userId), { verified: true });
      alert("User verified successfully!");
    } catch (err) {
      console.error("Failed to verify user:", err);
      alert("Error verifying user.");
    }
  };

  const handleToggleSuspend = async (userId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
      await updateDoc(doc(db, "users", userId), { status: nextStatus });
      await updateDoc(doc(db, "profiles", userId), { status: nextStatus });
      alert(`User status set to ${nextStatus}!`);
    } catch (err) {
      console.error("Failed to toggle status:", err);
      alert("Error updating user status.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        await deleteDoc(doc(db, "profiles", userId));
        alert("User record deleted successfully!");
      } catch (err) {
        console.error("Failed to delete user:", err);
        alert("Error deleting user.");
      }
    }
  };

  const handleAddUser = async () => {
    const name = prompt("Enter full name:");
    if (!name) return;
    const email = prompt("Enter email address:");
    if (!email) return;
    const role = prompt("Enter role (Talent, Agent, Director):", "Talent");
    if (!role) return;

    try {
      const tempId = doc(collection(db, "users")).id;
      const createdAt = new Date();
      await setDoc(doc(db, "users", tempId), {
        name,
        email,
        role,
        status: 'Active',
        createdAt
      });
      await setDoc(doc(db, "profiles", tempId), {
        name,
        email,
        role,
        status: 'Active',
        createdAt
      });
      alert("User added successfully!");
    } catch (err) {
      console.error("Failed to add user:", err);
      alert("Failed to create user doc.");
    }
  };

  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const u = doc.data();
        let joinedDate = 'N/A';
        if (u.createdAt) {
          const date = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
          joinedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return {
          id: doc.id,
          name: u.name || 'Unknown User',
          email: u.email || 'No email',
          role: u.isAdmin ? 'Admin' : u.role || 'Talent',
          status: u.status || 'Active',
          activity: u.role === 'Agent' || u.role === 'Director' ? 'High' : 'Moderate',
          joined: joinedDate,
          avatar: (u.name || '?').charAt(0).toUpperCase()
        };
      }) as AdminUser[];
      setUsers(data);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync users", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  // Stealth Logic: Filter out Admins from management view
  const visibleUsers = users.filter((u) => u.role !== 'Admin' && (
    (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  ));

  const totalPages = Math.ceil(visibleUsers.length / pageSize);
  const paginatedUsers = visibleUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-8 space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div className="flex-1 w-full max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nc-muted" />
          <input 
            type="text" 
            placeholder="Search by name, email, or ID..." 
            className="w-full bg-admin-surface border border-admin-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-admin-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border rounded-xl text-xs font-bold text-white hover:bg-admin-surface-light transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
          <button 
            onClick={handleAddUser}
            className="flex items-center gap-2 px-6 py-2 bg-admin-primary text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-admin-primary/20 transition-transform active:scale-95"
          >
            Add New User
          </button>
        </div>
      </div>

      <div className="bg-admin-surface border border-admin-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-admin-surface-light/50 border-b border-admin-border">
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Full Identity</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">System Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Deployment</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Engagement</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/50">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-admin-surface-light/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-admin-surface-light border border-admin-border flex items-center justify-center font-bold text-admin-primary text-sm">
                          {(user.avatar ?? user.name?.charAt(0) ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{user.name ?? 'Unknown User'}</p>
                          <p className="text-xs text-nc-muted">{user.email ?? 'No email'}</p>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'Admin' ? 'bg-admin-primary/20 text-admin-primary shadow-[0_0_12px_rgba(56,189,248,0.2)]' :
                      user.role === 'PRO' ? 'bg-admin-primary/20 text-admin-primary border border-admin-primary/20' :
                      'bg-white/5 text-white/30 border border-white/5'
                    }`}>
                      {user.role ?? 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${
                        user.status === 'Active' ? 'bg-admin-success' :
                        user.status === 'Suspended' ? 'bg-admin-error' :
                        'bg-admin-warning'
                      }`}></div>
                      <span className="text-xs text-white font-medium">{user.status ?? 'Unknown'}</span>
                    </div>
                    <p className="text-[10px] text-nc-muted uppercase font-black mt-1 ml-3.5">v4.2.1</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className={`w-3.5 h-3.5 ${
                        user.activity === 'High' ? 'text-admin-primary' :
                        user.activity === 'Moderate' ? 'text-white/60' :
                        'text-white/20'
                      }`} />
                      <span className="text-xs text-white font-medium">{user.activity ?? 'Low'}</span>
                    </div>
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Joined: {user.joined ?? 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => navigate(`/profile/${user.id}`)}
                        title="View Profile" 
                        className="p-2 text-nc-muted hover:text-white rounded-lg hover:bg-white/5"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleVerify(user.id)}
                        title="Fast Verification" 
                        className="p-2 text-nc-muted hover:text-admin-success rounded-lg hover:bg-admin-success/10"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleSuspend(user.id, user.status || 'Active')}
                        title="Suspend / Ban" 
                        className="p-2 text-nc-muted hover:text-admin-warning rounded-lg hover:bg-admin-warning/10"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete Record" 
                        className="p-2 text-nc-muted hover:text-admin-error rounded-lg hover:bg-admin-error/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-admin-surface-light/20 flex items-center justify-between border-t border-admin-border">
          <p className="text-xs text-nc-muted">Showing <span className="text-white font-bold">{paginatedUsers.length}</span> of <span className="text-white font-bold">{visibleUsers.length}</span> entities</p>
          <div className="flex gap-2 items-center">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg border border-admin-border text-[10px] font-bold text-nc-muted hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-nc-muted"
            >
              Prev
            </button>
            <span className="text-xs text-nc-muted px-2">Page {currentPage} of {totalPages || 1}</span>
            <button 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-lg border border-admin-border text-[10px] font-bold text-nc-muted hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-nc-muted"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
