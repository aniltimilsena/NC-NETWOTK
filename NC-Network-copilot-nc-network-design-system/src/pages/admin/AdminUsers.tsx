import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  UserMinus, 
  Trash2, 
  ExternalLink, 
  Activity, 
  X, 
  UserX, 
  UserCheck, 
  ShieldAlert, 
  ShieldX, 
  Award, 
  CheckCircle2,
  Mail,
  User
} from 'lucide-react';
import { db, auth } from "../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { logAdminAction } from '../../services/admin';
import { CATEGORIES } from '../../constants/categories';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  activity?: string;
  joined?: string;
  avatar?: string;
  verified?: boolean;
  premium?: boolean;
  isAdmin?: boolean;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Filtering states
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  const pageSize = 10;
  const navigate = useNavigate();
  const adminEmail = auth.currentUser?.email || 'admin@nc-network.com';

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

  const handleVerify = async (userId: string, currentVerified: boolean) => {
    try {
      const targetVerified = !currentVerified;
      await updateDoc(doc(db, "users", userId), { verified: targetVerified });
      await updateDoc(doc(db, "profiles", userId), { verified: targetVerified });
      
      const actionLabel = targetVerified ? "Verify User" : "Unverify User";
      await logAdminAction(adminEmail, actionLabel, userId, `Set verified to ${targetVerified}`);

      // Send verification notification
      try {
        await addDoc(collection(db, "notifications"), {
          userId: userId,
          recipientId: userId,
          receiverId: userId,
          senderId: "system",
          senderName: "NC Network Team",
          senderAvatar: "",
          title: targetVerified ? "Profile Verification Approved" : "Profile Verification Revoked",
          body: targetVerified 
            ? "Congratulations! Your profile has been verified by the NC Network Team." 
            : "Your profile verification status has been updated. Please contact support.",
          type: "system",
          notificationType: "system",
          isRead: false,
          read: false,
          createdAt: serverTimestamp(),
          targetUrl: `/profile/${userId}`,
          profileUrl: `/profile/${userId}`
        });
      } catch (notifErr) {
        console.warn("Could not send verification notification:", notifErr);
      }
      
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, verified: targetVerified } : null);
      }
      alert(`User ${targetVerified ? 'verified' : 'unverified'} successfully!`);
    } catch (err) {
      console.error("Failed to update verification status:", err);
      alert("Error updating verification status.");
    }
  };

  const handleUpdateStatus = async (userId: string, nextStatus: 'Active' | 'Suspended' | 'Banned') => {
    try {
      await updateDoc(doc(db, "users", userId), { status: nextStatus });
      await updateDoc(doc(db, "profiles", userId), { status: nextStatus });
      
      await logAdminAction(adminEmail, `Update User Status`, userId, `Set status to ${nextStatus}`);

      // Send account status update notification
      try {
        await addDoc(collection(db, "notifications"), {
          userId: userId,
          recipientId: userId,
          receiverId: userId,
          senderId: "system",
          senderName: "NC Network Team",
          senderAvatar: "",
          title: `Account Status: ${nextStatus}`,
          body: `Your account status has been updated to ${nextStatus} by the moderation team.`,
          type: "system",
          notificationType: "system",
          isRead: false,
          read: false,
          createdAt: serverTimestamp(),
          targetUrl: `/profile/${userId}`,
          profileUrl: `/profile/${userId}`
        });
      } catch (notifErr) {
        console.warn("Could not send status notification:", notifErr);
      }
      
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: nextStatus } : null);
      }
      alert(`User status set to ${nextStatus}!`);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating user status.");
    }
  };

  const handleUpdateRole = async (userId: string, makeAdmin: boolean) => {
    try {
      const nextRole = makeAdmin ? 'Admin' : 'Talent';
      await updateDoc(doc(db, "users", userId), { 
        isAdmin: makeAdmin,
        role: nextRole
      });
      await updateDoc(doc(db, "profiles", userId), { 
        isAdmin: makeAdmin,
        role: nextRole
      });
      
      await logAdminAction(adminEmail, `Update User Role`, userId, makeAdmin ? `Promoted to Admin` : `Demoted to Talent`);
      
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: nextRole, isAdmin: makeAdmin } : null);
      }
      alert(makeAdmin ? "Promoted user to Admin successfully!" : "Removed Admin role from user successfully!");
    } catch (err) {
      console.error("Failed to update user role:", err);
      alert("Error updating user role.");
    }
  };

  const handleTogglePremium = async (userId: string, currentPremium: boolean) => {
    try {
      const targetPremium = !currentPremium;
      await updateDoc(doc(db, "users", userId), { premium: targetPremium });
      await updateDoc(doc(db, "profiles", userId), { premium: targetPremium });
      
      await logAdminAction(adminEmail, `Update Subscription`, userId, targetPremium ? `Granted PRO Membership` : `Revoked PRO Membership`);

      // Send premium update notification
      try {
        await addDoc(collection(db, "notifications"), {
          userId: userId,
          recipientId: userId,
          receiverId: userId,
          senderId: "system",
          senderName: "NC Network Team",
          senderAvatar: "",
          title: targetPremium ? "Premium Activated" : "Premium Subscription Ended",
          body: targetPremium 
            ? "Awesome! Your Premium PRO subscription is now active. Enjoy exclusive features!" 
            : "Your Premium PRO subscription has ended. Upgrade to continue using pro features.",
          type: "system",
          notificationType: "system",
          isRead: false,
          read: false,
          createdAt: serverTimestamp(),
          targetUrl: "/premium",
          profileUrl: "/premium"
        });
      } catch (notifErr) {
        console.warn("Could not send premium status notification:", notifErr);
      }
      
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, premium: targetPremium } : null);
      }
      alert(targetPremium ? "PRO membership granted successfully!" : "PRO membership revoked successfully!");
    } catch (err) {
      console.error("Failed to update subscription:", err);
      alert("Error updating subscription.");
    }
  };

  const handleDeleteUser = (userId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete User Account?",
      description: "Are you sure you want to permanently delete this user? This will remove their user record and profile. This cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteDoc(doc(db, "users", userId));
          await deleteDoc(doc(db, "profiles", userId));
          
          await logAdminAction(adminEmail, `Delete User`, userId, `Permanently deleted user and profile documents`);
          
          if (selectedUser?.id === userId) {
            setSelectedUser(null);
          }
          alert("User record deleted successfully!");
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Failed to delete user:", err);
          alert("Error deleting user.");
        } finally {
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleAddUser = async () => {
    const name = prompt("Enter full name:");
    if (!name) return;
    const email = prompt("Enter email address:");
    if (!email) return;
    const role = prompt(`Enter category (${CATEGORIES.join(', ')}):`, "Actors");
    if (!role) return;
    if (!CATEGORIES.includes(role as any)) {
      alert(`Invalid category selection. Must be one of the approved categories.`);
      return;
    }

    try {
      const tempId = doc(collection(db, "users")).id;
      const createdAt = new Date();
      await setDoc(doc(db, "users", tempId), {
        name,
        email,
        role,
        status: 'Active',
        createdAt,
        verified: false,
        premium: false,
        isAdmin: false
      });
      await setDoc(doc(db, "profiles", tempId), {
        name,
        email,
        role,
        status: 'Active',
        createdAt,
        verified: false,
        premium: false,
        isAdmin: false
      });
      
      await logAdminAction(adminEmail, `Create User`, tempId, `Created new user ${name} (${role})`);
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
          avatar: (u.name || '?').charAt(0).toUpperCase(),
          verified: !!u.verified,
          premium: !!u.premium,
          isAdmin: !!u.isAdmin
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
  }, [search, roleFilter, statusFilter]);
  
  // Filtering logic
  const filteredUsers = users.filter((u) => {
    // 1. Search filter
    const matchesSearch = 
      (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    
    // 2. Role filter
    const matchesRole = 
      roleFilter === 'All' || 
      (roleFilter === 'Admin' && u.isAdmin) ||
      (roleFilter !== 'Admin' && !u.isAdmin && u.role?.toLowerCase() === roleFilter.toLowerCase());
    
    // 3. Status filter
    const matchesStatus = 
      statusFilter === 'All' || 
      u.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-8 space-y-6 animate-in slide-in-from-bottom duration-500">
      <ConfirmDialog
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">User Operations</h2>
          <p className="text-nc-muted text-sm mt-1">Audit permissions, tiers, moderation states, and accounts.</p>
        </div>
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
        <div className="flex gap-2 relative">
          <button 
            onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
            className={`flex items-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border rounded-xl text-xs font-bold text-white hover:bg-admin-surface-light transition-colors ${roleFilter !== 'All' || statusFilter !== 'All' ? 'border-admin-primary/50 text-admin-primary' : ''}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {(roleFilter !== 'All' || statusFilter !== 'All') && (
              <span className="w-2 h-2 rounded-full bg-admin-primary"></span>
            )}
          </button>
          
          {showFiltersDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-admin-surface border border-admin-border rounded-2xl shadow-2xl p-4 z-50 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">System Role</label>
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full bg-admin-surface-light border border-admin-border text-white text-xs rounded-lg p-2 focus:outline-none focus:border-admin-primary"
                >
                  <option value="All">All Roles</option>
                  <option value="Talent">Talent</option>
                  <option value="Agent">Agent</option>
                  <option value="Director">Director</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Deployment Status</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-admin-surface-light border border-admin-border text-white text-xs rounded-lg p-2 focus:outline-none focus:border-admin-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Banned">Banned</option>
                </select>
              </div>
              
              <button 
                onClick={() => {
                  setRoleFilter('All');
                  setStatusFilter('All');
                  setShowFiltersDropdown(false);
                }}
                className="w-full py-1.5 text-center text-[10px] font-black uppercase text-nc-muted hover:text-white border border-admin-border rounded-lg"
              >
                Reset Filters
              </button>
            </div>
          )}

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
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm">{user.name ?? 'Unknown User'}</p>
                            {user.verified && (
                              <span title="Verified">
                                <ShieldCheck className="w-3.5 h-3.5 text-admin-success fill-admin-success/10" />
                              </span>
                            )}
                            {user.premium && (
                              <span title="PRO Member">
                                <Award className="w-3.5 h-3.5 text-admin-primary fill-admin-primary/10 animate-pulse" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-nc-muted">{user.email ?? 'No email'}</p>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.isAdmin ? 'bg-admin-primary/20 text-admin-primary border border-admin-primary/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]' :
                      user.role === 'PRO' || user.premium ? 'bg-admin-primary/20 text-admin-primary border border-admin-primary/20' :
                      'bg-white/5 text-white/30 border border-white/5'
                    }`}>
                      {user.isAdmin ? 'Admin' : user.role ?? 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${
                        user.status === 'Active' ? 'bg-admin-success' :
                        user.status === 'Suspended' ? 'bg-admin-warning' :
                        user.status === 'Banned' ? 'bg-admin-error animate-pulse' :
                        'bg-admin-warning'
                      }`}></div>
                      <span className="text-xs text-white font-medium">{user.status ?? 'Active'}</span>
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
                        onClick={() => setSelectedUser(user)}
                        title="Inspect & Moderate" 
                        className="p-2 text-nc-muted hover:text-white rounded-lg hover:bg-white/5"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleVerify(user.id, !!user.verified)}
                        title={user.verified ? "Remove Verification" : "Grant Verification"} 
                        className={`p-2 rounded-lg hover:bg-white/5 ${user.verified ? 'text-admin-success' : 'text-nc-muted hover:text-admin-success'}`}
                      >
                        <ShieldCheck className="w-4 h-4" />
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
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-nc-muted text-xs">
                    No users found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-admin-surface-light/20 flex items-center justify-between border-t border-admin-border">
          <p className="text-xs text-nc-muted">Showing <span className="text-white font-bold">{paginatedUsers.length}</span> of <span className="text-white font-bold">{filteredUsers.length}</span> entities</p>
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

      {/* User Detail & Moderation Inspector Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-surface-light/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-admin-bg border border-admin-border flex items-center justify-center font-bold text-admin-primary text-sm">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedUser.name}</h3>
                  <p className="text-xs text-nc-muted uppercase tracking-widest font-black">Account moderation console</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1 text-nc-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Meta details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1">Entity Telemetry</h4>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Database ID:</span>
                      <span className="font-mono text-white select-all">{selectedUser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Email Address:</span>
                      <span className="font-medium text-white flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-nc-muted" />
                        {selectedUser.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Platform Role:</span>
                      <span className="font-bold text-admin-primary">{selectedUser.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Joined Date:</span>
                      <span className="text-white font-medium">{selectedUser.joined}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nc-muted">Status Code:</span>
                      <span className={`font-bold uppercase tracking-wider ${
                        selectedUser.status === 'Active' ? 'text-admin-success' :
                        selectedUser.status === 'Suspended' ? 'text-admin-warning' :
                        'text-admin-error'
                      }`}>{selectedUser.status || 'Active'}</span>
                    </div>
                  </div>
                </div>

                {/* State Controls */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1">Permissions & Badges</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-admin-bg/30 border border-admin-border rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-white">Verification Seal</p>
                        <p className="text-[9px] text-nc-muted uppercase">Verified identity badge</p>
                      </div>
                      <button 
                        onClick={() => handleVerify(selectedUser.id, !!selectedUser.verified)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                          selectedUser.verified 
                            ? 'bg-admin-success/20 text-admin-success border border-admin-success/30' 
                            : 'bg-white/5 text-white/40 border border-white/5 hover:text-white'
                        }`}
                      >
                        {selectedUser.verified ? 'Verified' : 'Verify'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-admin-bg/30 border border-admin-border rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-white">PRO Membership</p>
                        <p className="text-[9px] text-nc-muted uppercase">Premium level subscription</p>
                      </div>
                      <button 
                        onClick={() => handleTogglePremium(selectedUser.id, !!selectedUser.premium)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                          selectedUser.premium 
                            ? 'bg-admin-primary/20 text-admin-primary border border-admin-primary/30 animate-pulse' 
                            : 'bg-white/5 text-white/40 border border-white/5 hover:text-white'
                        }`}
                      >
                        {selectedUser.premium ? 'PRO Active' : 'Grant PRO'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-admin-bg/30 border border-admin-border rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-white">Admin Privileges</p>
                        <p className="text-[9px] text-nc-muted uppercase">Superuser panel access</p>
                      </div>
                      <button 
                        onClick={() => handleUpdateRole(selectedUser.id, !selectedUser.isAdmin)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                          selectedUser.isAdmin 
                            ? 'bg-admin-error/20 text-admin-error border border-admin-error/30' 
                            : 'bg-white/5 text-white/40 border border-white/5 hover:text-white'
                        }`}
                      >
                        {selectedUser.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Modifiers */}
              <div className="bg-admin-bg/50 border border-admin-border p-4 rounded-xl space-y-3">
                <h4 className="text-[10px] font-black text-admin-error uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Account Moderation Actions
                </h4>
                
                <div className="flex flex-wrap gap-2">
                  {selectedUser.status !== 'Active' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedUser.id, 'Active')}
                      className="px-4 py-2 bg-admin-success/20 hover:bg-admin-success text-admin-success hover:text-white text-[10px] font-black uppercase rounded-lg border border-admin-success/30 transition-all flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Activate User
                    </button>
                  )}
                  {selectedUser.status !== 'Suspended' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedUser.id, 'Suspended')}
                      className="px-4 py-2 bg-admin-warning/20 hover:bg-admin-warning text-admin-warning hover:text-black text-[10px] font-black uppercase rounded-lg border border-admin-warning/30 transition-all flex items-center gap-1.5"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Suspend User
                    </button>
                  )}
                  {selectedUser.status !== 'Banned' && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedUser.id, 'Banned')}
                      className="px-4 py-2 bg-admin-error/20 hover:bg-admin-error text-admin-error hover:text-white text-[10px] font-black uppercase rounded-lg border border-admin-error/30 transition-all flex items-center gap-1.5"
                    >
                      <ShieldX className="w-3.5 h-3.5" /> Ban User
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="px-4 py-2 bg-admin-error text-white hover:bg-red-700 text-[10px] font-black uppercase rounded-lg shadow-lg transition-all flex items-center gap-1.5 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete User
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-admin-surface-light/20 border-t border-admin-border flex justify-end">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-admin-surface-light text-white text-xs font-bold rounded-lg border border-admin-border hover:bg-white/5 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
