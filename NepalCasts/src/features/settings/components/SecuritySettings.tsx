import React from 'react';
import { Shield, Lock, Trash2, Smartphone, Monitor } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import type { ServiceResult } from '../../../types';

interface SecuritySettingsProps {
    sessions: any[];
    blockedUsers: any[];
    onRevokeSession: (sessionId: string) => Promise<ServiceResult>;
    onUnblockUser: (targetId: string) => Promise<ServiceResult>;
    showAlert: (message: string, type?: any, detail?: string) => void;
}

export default function SecuritySettings({ sessions, blockedUsers, onRevokeSession, onUnblockUser, showAlert }: SecuritySettingsProps) {
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
            {/* Clerk Pro Security Banner */}
            <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-4 sm:p-6 space-y-3 text-left">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-yellow-400" />
                    Account Security & Authentication (Clerk Pro)
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    Your login security, password management, passkeys, multi-factor authentication (MFA), and enterprise SSO are managed via Clerk Pro.
                </p>
            </div>

            {/* Blocked Users */}
            <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-4 sm:p-6 space-y-4 text-left">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#00BFFF]" />
                    Blocked Users
                </h2>

                {blockedUsers.length > 0 ? (
                    <div className="space-y-3.5">
                        {blockedUsers.map((u) => (
                            <div key={u.uid} className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Avatar userId={u.uid} src={u.image} name={u.name} size="sm" />
                                    <div className="text-left">
                                        <span className="text-sm font-bold text-white block">{u.name}</span>
                                        <span className="text-[9px] text-nc-muted uppercase tracking-wider font-bold">{u.role}</span>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleUnblock(u.uid)}>
                                    Unblock
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-nc-muted py-4">No blocked users found.</p>
                )}
            </div>

            {/* Active Sessions */}
            <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4 text-left">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-[#00BFFF]" />
                    Active Sessions
                </h2>

                <div className="space-y-4">
                    {sessions.map((s) => (
                        <div key={s.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-2xl">
                            <div className="flex items-start gap-3.5 min-w-0">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                                    {s.os?.toLowerCase().includes('windows') || s.os?.toLowerCase().includes('mac') ? (
                                        <Monitor className="w-5 h-5 text-white/55" />
                                    ) : (
                                        <Smartphone className="w-5 h-5 text-white/55" />
                                    )}
                                </div>
                                <div className="text-left min-w-0">
                                    <span className="text-sm font-bold text-white block truncate">{s.browser} on {s.os}</span>
                                    <span className="text-[10px] text-nc-muted block truncate font-medium">{s.location}</span>
                                </div>
                            </div>
                            <button onClick={() => handleRevoke(s.id)} className="text-nc-muted hover:text-red-500 transition-colors p-2 shrink-0" title="Revoke session">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export type { SecuritySettingsProps };
