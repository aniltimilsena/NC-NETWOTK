import React, { useState } from 'react';
import { Shield, Lock, Trash2, Smartphone, Monitor } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import { formatRole } from '../../../utils';
import { auth } from '../../../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import type { ServiceResult } from '../../../types';

interface SecuritySettingsProps {
    sessions: any[];
    blockedUsers: any[];
    onRevokeSession: (sessionId: string) => Promise<ServiceResult>;
    onUnblockUser: (targetId: string) => Promise<ServiceResult>;
    showAlert: (message: string, type?: any, detail?: string) => void;
}

export default function SecuritySettings({ sessions, blockedUsers, onRevokeSession, onUnblockUser, showAlert }: SecuritySettingsProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

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
            const user = auth.currentUser;
            if (user && user.email) {
                if (currentPassword) {
                    const credential = EmailAuthProvider.credential(user.email, currentPassword);
                    await reauthenticateWithCredential(user, credential);
                }
                await updatePassword(user, newPassword);
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
        <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4 text-left">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-white" />
                    Change Password
                </h2>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Current Password</label>
                        <input
                            type="password"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">New Password</label>
                            <input
                                type="password"
                                placeholder="Enter new password (min. 6 chars)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 text-left">
                            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Confirm New Password</label>
                            <input
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all"
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
            <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4 text-left">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-white" />
                    Blocked Users
                </h2>

                {blockedUsers && blockedUsers.length > 0 ? (
                    <div className="space-y-3">
                        {blockedUsers.map((u) => (
                            <div key={u.uid} className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Avatar userId={u.uid} src={u.image} name={u.name} size="sm" />
                                    <div className="text-left">
                                        <span className="text-xs font-bold text-white block">{u.name}</span>
                                        <span className="text-[9px] text-nc-muted uppercase tracking-wider font-bold">{formatRole(u.role)}</span>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleUnblock(u.uid)} className="h-8 text-xs rounded-xl px-3">
                                    Unblock
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-nc-muted py-2">No blocked users found.</p>
                )}
            </div>

            {/* Active Sessions */}
            <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4 text-left">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-white" />
                    Active Sessions
                </h2>

                <div className="space-y-3">
                    {sessions && sessions.length > 0 ? (
                        sessions.map((s) => (
                            <div key={s.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                                        {s.os?.toLowerCase().includes('windows') || s.os?.toLowerCase().includes('mac') ? (
                                            <Monitor className="w-4 h-4 text-white/70" />
                                        ) : (
                                            <Smartphone className="w-4 h-4 text-white/70" />
                                        )}
                                    </div>
                                    <div className="text-left min-w-0">
                                        <span className="text-xs font-bold text-white block truncate">{s.browser || 'Web Browser'} on {s.os || 'Current OS'}</span>
                                        <span className="text-[10px] text-nc-muted block truncate font-medium">{s.location || 'Nepal'}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleRevoke(s.id)} className="text-nc-muted hover:text-red-500 transition-colors p-2 shrink-0 cursor-pointer" title="Revoke session">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                                    <Monitor className="w-4 h-4 text-white/70" />
                                </div>
                                <div className="text-left min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white block truncate">Current Session</span>
                                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            Active Now
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-nc-muted block truncate font-medium">Web Browser • Nepal</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export type { SecuritySettingsProps };
