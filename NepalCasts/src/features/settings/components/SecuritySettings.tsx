import React, { useState } from 'react';
import { Shield, Lock, Trash2, Smartphone, Monitor, AlertTriangle, X } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import { formatRole } from '../../../utils';
import { auth } from '../../../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import type { ServiceResult } from '../../../types';
import { deleteAccount } from '../../profile/services/profile';
import { useClerk, useUser } from '@clerk/clerk-react';
import { AuthService } from '../../../services/AuthService';
import { CurrentUser } from '../../../utils/CurrentUser';

interface SecuritySettingsProps {
    sessions: any[];
    blockedUsers: any[];
    onRevokeSession: (sessionId: string) => Promise<ServiceResult>;
    onUnblockUser: (targetId: string) => Promise<ServiceResult>;
    showAlert: (message: string, type?: any, detail?: string) => void;
    user?: any;
    onNavigate?: (page: string, param?: any) => void;
}

export default function SecuritySettings({ sessions, blockedUsers, onRevokeSession, onUnblockUser, showAlert, user, onNavigate }: SecuritySettingsProps) {
    const { signOut } = useClerk();
    const { user: clerkUser } = useUser();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const targetUid = user?.uid || user?.id || clerkUser?.id || AuthService.getUserId() || CurrentUser.id;

    const handleDeleteAccount = async () => {
        if (!targetUid) {
            showAlert('No active user account found to delete.', 'error');
            return;
        }
        if (confirmText.trim().toUpperCase() !== 'DELETE') {
            showAlert('Please type "DELETE" to confirm account deletion.', 'error');
            return;
        }

        setDeletingAccount(true);
        try {
            const res = await deleteAccount(targetUid);
            if (!res.success) {
                showAlert(res.error || 'Failed to delete account from database.', 'error');
                setDeletingAccount(false);
                return;
            }

            try {
                if (clerkUser) {
                    await clerkUser.delete().catch(() => {});
                }
            } catch (cErr) {
                console.warn("Clerk user delete non-fatal warning:", cErr);
            }

            showAlert('Your account has been permanently deleted.', 'info');
            setShowDeleteModal(false);
            
            await signOut().catch(() => {});
            if (onNavigate) {
                onNavigate('/');
            } else {
                window.location.href = '/';
            }
        } catch (err: any) {
            console.error("Delete account error:", err);
            showAlert(err.message || 'An error occurred while deleting your account.', 'error');
            setDeletingAccount(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            showAlert('Please fill in all password fields.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showAlert('New password must be at least 6 characters.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert('New passwords do not match.', 'error');
            return;
        }
        setChangingPassword(true);
        try {
            const firebaseUser = auth.currentUser;
            if (firebaseUser && firebaseUser.email) {
                if (currentPassword) {
                    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
                    await reauthenticateWithCredential(firebaseUser, credential);
                }
                await updatePassword(firebaseUser, newPassword);
                showAlert('Password updated successfully!', 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                showAlert('No active user found to update password.', 'error');
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                showAlert('Current password is incorrect.', 'error');
            } else if (err.code === 'auth/requires-recent-login') {
                showAlert('Please re-authenticate or log in again to change your password.', 'error');
            } else {
                showAlert(err.message || 'Failed to update password.', 'error');
            }
        } finally {
            setChangingPassword(false);
        }
    };

    const handleRevoke = async (id: string) => {
        const res = await onRevokeSession(id);
        if (res.success) {
            showAlert('Session revoked successfully.', 'success');
        } else {
            showAlert(res.error || 'Failed to revoke session.', 'error');
        }
    };

    const handleUnblock = async (uid: string) => {
        const res = await onUnblockUser(uid);
        if (res.success) {
            showAlert('User unblocked.', 'success');
        } else {
            showAlert(res.error || 'Failed to unblock user.', 'error');
        }
    };

    return (
        <div className="space-y-2 sm:space-y-3">
            {/* Change Password */}
            <div className="bg-white border border-[#E7E5E0] rounded-2xl p-4 sm:p-5 space-y-4 text-left">
                <h2 className="text-lg font-bold text-[#202923] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#194332]" />
                    Change Password
                </h2>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-[#777C75] uppercase tracking-wider font-bold block">Current Password</label>
                        <input
                            type="password"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-[#FAF8F4] border border-[#E7E5E0] focus:border-[#194332] rounded-xl px-3.5 py-2 text-xs text-[#202923] placeholder-[#777C75] outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                            <label className="text-[10px] text-[#777C75] uppercase tracking-wider font-bold block">New Password</label>
                            <input
                                type="password"
                                placeholder="Enter new password (min. 6 chars)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-[#FAF8F4] border border-[#E7E5E0] focus:border-[#194332] rounded-xl px-3.5 py-2 text-xs text-[#202923] placeholder-[#777C75] outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 text-left">
                            <label className="text-[10px] text-[#777C75] uppercase tracking-wider font-bold block">Confirm New Password</label>
                            <input
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#FAF8F4] border border-[#E7E5E0] focus:border-[#194332] rounded-xl px-3.5 py-2 text-xs text-[#202923] placeholder-[#777C75] outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-1">
                        <Button type="submit" loading={changingPassword} className="px-5 py-1.5 h-9 rounded-xl text-xs font-bold">
                            Update Password
                        </Button>
                    </div>
                </form>
            </div>

            {/* Blocked Users */}
            <div className="bg-white border border-[#E7E5E0] rounded-2xl p-4 sm:p-5 space-y-4 text-left">
                <h2 className="text-lg font-bold text-[#202923] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#194332]" />
                    Blocked Users
                </h2>

                {blockedUsers && blockedUsers.length > 0 ? (
                    <div className="space-y-3">
                        {blockedUsers.map((u) => (
                            <div key={u.uid} className="flex justify-between items-center bg-[#FAF8F4] border border-[#E7E5E0] p-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Avatar userId={u.uid} src={u.image} name={u.name} size="sm" />
                                    <div className="text-left">
                                        <span className="text-xs font-bold text-[#202923] block">{u.name}</span>
                                        <span className="text-[9px] text-[#777C75] uppercase tracking-wider font-bold">{formatRole(u.role)}</span>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleUnblock(u.uid)} className="h-8 text-xs rounded-xl px-3">
                                    Unblock
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-[#777C75] py-2">No blocked users found.</p>
                )}
            </div>

            {/* Active Sessions */}
            <div className="bg-white border border-[#E7E5E0] rounded-2xl p-4 sm:p-5 space-y-4 text-left">
                <h2 className="text-lg font-bold text-[#202923] flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#194332]" />
                    Active Sessions
                </h2>

                <div className="space-y-3">
                    {sessions && sessions.length > 0 ? (
                        sessions.map((s) => (
                            <div key={s.id} className="flex justify-between items-center bg-[#FAF8F4] border border-[#E7E5E0] p-3.5 rounded-xl">
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div className="w-9 h-9 bg-[#EAF2ED] rounded-xl flex items-center justify-center shrink-0">
                                        {s.os?.toLowerCase().includes('windows') || s.os?.toLowerCase().includes('mac') ? (
                                             <Monitor className="w-4 h-4 text-[#194332]" />
                                        ) : (
                                            <Smartphone className="w-4 h-4 text-[#194332]" />
                                        )}
                                    </div>
                                    <div className="text-left min-w-0">
                                        <span className="text-xs font-bold text-[#202923] block truncate">{s.browser || 'Web Browser'} on {s.os || 'Current OS'}</span>
                                        <span className="text-[10px] text-[#777C75] block truncate font-medium">{s.location || 'Nepal'}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleRevoke(s.id)} className="text-[#777C75] hover:text-[#B42318] transition-colors p-2 shrink-0 cursor-pointer" title="Revoke session">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="flex justify-between items-center bg-[#FAF8F4] border border-[#E7E5E0] p-3.5 rounded-xl">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-9 h-9 bg-[#EAF2ED] rounded-xl flex items-center justify-center shrink-0">
                                    <Monitor className="w-4 h-4 text-[#194332]" />
                                </div>
                                <div className="text-left min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#202923] block truncate">Current Session</span>
                                        <span className="inline-flex items-center gap-1 bg-[#286847]/10 text-[#286847] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#286847]/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#286847] animate-pulse" />
                                            Active Now
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-[#777C75] block truncate font-medium">Web Browser • Nepal</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 space-y-4 text-left">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
                </div>
                <p className="text-xs text-[#626860] leading-relaxed">
                    Permanently delete your personal profile and account. This will completely remove your profile data, portfolio, media, and contact information from the NepalCasts database. You can only delete your own account, and this action cannot be undone.
                </p>
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={() => {
                            setConfirmText('');
                            setShowDeleteModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete My Account</span>
                    </button>
                </div>
            </div>

            {/* Delete Account Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-[#E7E5E0] rounded-2xl max-w-md w-full p-6 text-left shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-red-400">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-[#202923]">Delete Account</h3>
                            </div>
                            <button
                                onClick={() => !deletingAccount && setShowDeleteModal(false)}
                                className="w-8 h-8 rounded-lg hover:bg-[#FAF8F4] text-[#777C75] hover:text-[#202923] flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-[#414840] leading-relaxed">
                            <p>
                                Are you sure you want to permanently delete your account? This action is <strong className="text-red-400">irreversible</strong>.
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-[#626860]">
                                <li>Your profile will be removed from all talent directories and search.</li>
                                <li>Your uploaded media and portfolio will be permanently deleted from the database.</li>
                                <li>You will be immediately logged out.</li>
                            </ul>
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-[11px] font-bold text-[#414840] uppercase tracking-wider block">
                                Type <span className="text-red-400 font-mono">DELETE</span> to confirm:
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="DELETE"
                                disabled={deletingAccount}
                                className="w-full bg-[#FAF8F4] border border-[#E7E5E0] focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-[#202923] placeholder-[#777C75] outline-none font-mono transition-all"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                disabled={deletingAccount}
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-[#414840] hover:text-[#202923] bg-[#FAF8F4] hover:bg-[#F3F0E9] border border-[#E7E5E0] transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deletingAccount || confirmText.trim().toUpperCase() !== 'DELETE'}
                                onClick={handleDeleteAccount}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {deletingAccount ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Permanently Delete</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export type { SecuritySettingsProps };
