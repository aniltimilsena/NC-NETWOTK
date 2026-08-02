import React, { useState, useEffect } from 'react';
import { Sliders, Database, Globe, Lock, Trash2, Plus, ShieldCheck, Clock, ShieldAlert } from 'lucide-react';
import { Switch } from '../../components/ui';
import { subscribeToGlobalSettings, updateGlobalSettings, subscribeToAdminLogs, GlobalSettings, AdminLog, logAdminAction } from '../../services';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { CATEGORIES, getCategoryConfig } from '../../constants/categories';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
export default function AdminSettings() {
    const [settings, setSettings] = useState<GlobalSettings | null>(null);
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [updating, setUpdating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);
    const [announcement, setAnnouncement] = useState({
        title: '',
        body: '',
        type: 'system',
        targetType: 'all',
        specificUserId: ''
    });
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
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
    const adminEmail = CurrentUser.email || 'admin@nepalcasts.com';
    const handleSendAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcement.title.trim() || !announcement.body.trim()) {
            alert("Please fill in title and message.");
            return;
        }
        setSendingAnnouncement(true);
        try {
            let recipients: string[] = [];
            if (announcement.targetType === 'all') {
                const usersSnap = await getDocs(collection(db, "users"));
                recipients = usersSnap.docs.map(doc => doc.id);
            }
            else {
                if (!announcement.specificUserId.trim()) {
                    alert("Please specify a User ID.");
                    setSendingAnnouncement(false);
                    return;
                }
                recipients = [announcement.specificUserId.trim()];
            }
            if (recipients.length === 0) {
                alert("No recipient users found.");
                setSendingAnnouncement(false);
                return;
            }
            const batchPromises = recipients.map(uid => {
                return addDoc(collection(db, "notifications"), {
                    userId: uid,
                    recipientId: uid,
                    receiverId: uid,
                    senderId: "system",
                    senderName: "NepalCasts Team",
                    senderAvatar: "",
                    title: announcement.title.trim(),
                    body: announcement.body.trim(),
                    type: "system",
                    notificationType: "system",
                    isRead: false,
                    read: false,
                    createdAt: serverTimestamp(),
                    targetUrl: "/premium",
                    profileUrl: "/"
                });
            });
            await Promise.all(batchPromises);
            await logAdminAction(adminEmail, "Send Announcement", announcement.targetType, `Sent announcement "${announcement.title}" to ${recipients.length} users`);
            alert(`Announcement sent successfully to ${recipients.length} users!`);
            setAnnouncement({
                title: '',
                body: '',
                type: 'system',
                targetType: 'all',
                specificUserId: ''
            });
        }
        catch (err: any) {
            console.error(err);
            alert("Failed to send announcement: " + err.message);
        }
        finally {
            setSendingAnnouncement(false);
        }
    };
    const runDatabaseMigration = () => {
        setConfirmConfig({
            isOpen: true,
            title: "Run Database Migration?",
            description: "Are you sure you want to scan and migrate all Users, Profiles, and Casting Calls to the 8 approved categories? This will modify legacy categories in Firestore.",
            confirmText: "Migrate",
            cancelText: "Cancel",
            type: "warning",
            isLoading: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                setIsMigrating(true);
                setMigrationStatus("Initializing migration...");
                try {
                    setMigrationStatus("Updating global settings categories...");
                    await updateGlobalSettings({ categories: [...CATEGORIES] });
                    const mappingFunction = (role: string | undefined | null): string => {
                        if (!role)
                            return "Actor";
                        const clean = role.trim().toLowerCase();
                        if (clean === "actor" || clean === "actors")
                            return "Actor";
                        if (clean === "director" || clean === "directors")
                            return "Director";
                        if (clean === "model" || clean === "models")
                            return "Model";
                        if (clean === "dancer" || clean === "dancers")
                            return "Dancer";
                        if (clean === "musician" || clean === "musicians")
                            return "Musician";
                        if (clean === "voice over" || clean === "voiceover" || clean === "voice-over" || clean === "voice artist")
                            return "Voice Over";
                        if (clean === "vfx" || clean === "editor" || clean === "editors" || clean === "editor/vfx")
                            return "VFX";
                        if (clean === "writer" || clean === "writers")
                            return "Writer";
                        for (const cat of CATEGORIES) {
                            const cfg = getCategoryConfig(cat);
                            if (cfg.label.toLowerCase().startsWith(clean) || clean.startsWith(cfg.label.toLowerCase().slice(0, -1))) {
                                return cfg.label;
                            }
                        }
                        return "Actor";
                    };
                    const castingTypeMappingFunction = (type: string | undefined | null): string => {
                        if (!type)
                            return "Actor";
                        const clean = type.trim().toLowerCase();
                        if (clean === "actor" || clean === "actors")
                            return "Actor";
                        if (clean === "director" || clean === "directors")
                            return "Director";
                        if (clean === "model" || clean === "models")
                            return "Model";
                        if (clean === "dancer" || clean === "dancers")
                            return "Dancer";
                        if (clean === "musician" || clean === "musicians")
                            return "Musician";
                        if (clean === "voice over" || clean === "voiceover" || clean === "voice-over" || clean === "voice artist")
                            return "Voice Over";
                        if (clean === "vfx" || clean === "editor" || clean === "editors" || clean === "editor/vfx")
                            return "VFX";
                        if (clean === "writer" || clean === "writers")
                            return "Writer";
                        if (clean === "film" || clean === "theatre" || clean === "commercial" || clean === "series" || clean === "short film") {
                            return "Actor";
                        }
                        return "Actor";
                    };
                    const approvedLabels = CATEGORIES.map(cat => getCategoryConfig(cat).label);
                    setMigrationStatus("Scanning users...");
                    const usersSnap = await getDocs(collection(db, "users"));
                    let usersUpdated = 0;
                    for (const d of usersSnap.docs) {
                        const data = d.data();
                        if (!approvedLabels.includes(data.role)) {
                            const newRole = mappingFunction(data.role);
                            await updateDoc(doc(db, "users", d.id), { role: newRole });
                            usersUpdated++;
                        }
                    }
                    setMigrationStatus("Scanning profiles...");
                    const profilesSnap = await getDocs(collection(db, "profiles"));
                    let profilesUpdated = 0;
                    for (const d of profilesSnap.docs) {
                        const data = d.data();
                        if (!approvedLabels.includes(data.role)) {
                            const newRole = mappingFunction(data.role);
                            await updateDoc(doc(db, "profiles", d.id), { role: newRole });
                            profilesUpdated++;
                        }
                    }
                    setMigrationStatus("Scanning casting calls...");
                    const castingSnap = await getDocs(collection(db, "casting_calls"));
                    let castingUpdated = 0;
                    for (const d of castingSnap.docs) {
                        const data = d.data();
                        if (!approvedLabels.includes(data.type)) {
                            const newType = castingTypeMappingFunction(data.type);
                            await updateDoc(doc(db, "casting_calls", d.id), { type: newType });
                            castingUpdated++;
                        }
                    }
                    const logMsg = `Migrated: ${usersUpdated} users, ${profilesUpdated} profiles, ${castingUpdated} casting calls.`;
                    await logAdminAction(adminEmail, "Database Category Migration", "global_settings", logMsg);
                    setMigrationStatus(`Success! Migrated ${usersUpdated} users, ${profilesUpdated} profiles, and ${castingUpdated} casting calls.`);
                    alert(`Migration completed!\n- Users updated: ${usersUpdated}\n- Profiles updated: ${profilesUpdated}\n- Casting Calls updated: ${castingUpdated}`);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
                catch (err: any) {
                    console.error(err);
                    setMigrationStatus(`Error: ${err.message}`);
                    alert("Migration failed: " + err.message);
                }
                finally {
                    setIsMigrating(false);
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };
    useEffect(() => {
        const unsubSettings = subscribeToGlobalSettings((data: any) => {
            setSettings(data);
            setLoading(false);
        });
        const unsubLogs = subscribeToAdminLogs((data: any) => {
            setLogs(data);
        });
        return () => {
            unsubSettings();
            unsubLogs();
        };
    }, []);
    const handleToggleFeature = async (featureKey: keyof GlobalSettings['features']) => {
        if (!settings)
            return;
        const updatedFeatures = {
            ...settings.features,
            [featureKey]: !settings.features[featureKey]
        };
        setUpdating(true);
        const res = await updateGlobalSettings({ features: updatedFeatures });
        setUpdating(false);
        if (res.success) {
            const stateLabel = !settings.features[featureKey] ? "enabled" : "disabled";
            await logAdminAction(adminEmail, "Toggle Feature Flag", "global_settings", `Feature ${String(featureKey)} was ${stateLabel}`);
        }
        else {
            alert("Error updating feature toggle: " + res.error);
        }
    };
    const handleToggleMaintenanceMode = async () => {
        if (!settings)
            return;
        const nextMaintenance = !settings.maintenanceMode;
        setUpdating(true);
        const res = await updateGlobalSettings({ maintenanceMode: nextMaintenance });
        setUpdating(false);
        if (res.success) {
            const actionLabel = nextMaintenance ? "Activate Maintenance Mode" : "Deactivate Maintenance Mode";
            await logAdminAction(adminEmail, actionLabel, "global_settings", `Platform maintenance mode set to ${nextMaintenance}`);
            alert(nextMaintenance ? "Maintenance Mode Activated!" : "Maintenance Mode Deactivated!");
        }
        else {
            alert("Error updating maintenance mode: " + res.error);
        }
    };
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings || !newCategory.trim())
            return;
        const trimmed = newCategory.trim();
        if (!CATEGORIES.includes(trimmed as any)) {
            alert(`Invalid category selection. Must be one of the approved categories: ${CATEGORIES.join(', ')}`);
            return;
        }
        if (settings.categories.includes(trimmed)) {
            alert("Category already exists.");
            return;
        }
        const updatedCategories = [...settings.categories, trimmed];
        setUpdating(true);
        const res = await updateGlobalSettings({ categories: updatedCategories });
        setUpdating(false);
        if (res.success) {
            await logAdminAction(adminEmail, "Add Taxonomy Category", "global_settings", `Added category: ${trimmed}`);
            setNewCategory('');
        }
        else {
            alert("Error adding category: " + res.error);
        }
    };
    const handleDeleteCategory = (catName: string) => {
        if (!settings)
            return;
        setConfirmConfig({
            isOpen: true,
            title: "Delete Taxonomy Category?",
            description: `Are you sure you want to delete the taxonomy category "${catName}"?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            type: "danger",
            isLoading: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                try {
                    const updatedCategories = settings.categories.filter((c: string) => c !== catName);
                    setUpdating(true);
                    const res = await updateGlobalSettings({ categories: updatedCategories });
                    setUpdating(false);
                    if (res.success) {
                        await logAdminAction(adminEmail, "Delete Taxonomy Category", "global_settings", `Deleted category: ${catName}`);
                        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    }
                    else {
                        alert("Error deleting category: " + res.error);
                    }
                }
                catch (err: any) {
                    console.error("Error deleting category:", err);
                    alert("Error deleting category.");
                    setUpdating(false);
                }
                finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };
    const formatLogDate = (timestamp: any) => {
        if (!timestamp)
            return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    };
    if (loading || !settings) {
        return (<div className="p-8 text-nc-muted text-xs">
        Synchronizing global platform telemetry settings...
      </div>);
    }
    return (<div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-6xl">
      <ConfirmDialog {...confirmConfig} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}/>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Platform Configuration</h2>
          <p className="text-nc-muted text-sm mt-1">Global feature overrides, taxonomy orchestration, and real-time security audit trails.</p>
        </div>
        {updating && (<span className="text-xs text-admin-primary animate-pulse font-black uppercase tracking-widest bg-admin-primary/10 border border-admin-primary/20 px-3 py-1.5 rounded-xl">
            Writing Settings...
          </span>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white mb-6 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-admin-primary"/>
              Feature Toggles
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">Public Talent Discovery</p>
                  <p className="text-[10px] text-nc-muted uppercase">Allow guests to search profiles.</p>
                </div>
                <Switch checked={settings.features.discovery} onCheckedChange={() => handleToggleFeature('discovery')}/>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">AI Casting Matcher v2</p>
                  <p className="text-[10px] text-nc-muted uppercase">Neural candidate suggestion engine.</p>
                </div>
                <Switch checked={settings.features.aiCasting} onCheckedChange={() => handleToggleFeature('aiCasting')}/>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">Real-time Messaging</p>
                  <p className="text-[10px] text-nc-muted uppercase">WebSocket-based user chat.</p>
                </div>
                <Switch checked={settings.features.messaging} onCheckedChange={() => handleToggleFeature('messaging')}/>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">PRO-only Screenings</p>
                  <p className="text-[10px] text-nc-muted uppercase">Gated content for membership tiers.</p>
                </div>
                <Switch checked={settings.features.proScreenings} onCheckedChange={() => handleToggleFeature('proScreenings')}/>
              </div>
            </div>
          </div>
        </div>

        
        <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-admin-secondary"/>
                Taxonomy Settings
              </h4>
            </div>
            
            
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input type="text" placeholder="New category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="bg-admin-surface-light border border-admin-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-admin-primary flex-1"/>
              <button type="submit" className="p-2 bg-admin-secondary text-black rounded-xl hover:bg-admin-secondary/85 transition-all flex items-center justify-center">
                <Plus className="w-4 h-4"/>
              </button>
            </form>

            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
              {settings.categories.map((cat: string) => (<div key={cat} className="group relative flex items-center gap-2 px-3 py-1.5 bg-admin-surface-light border border-admin-border rounded-lg text-xs font-bold text-white hover:border-admin-secondary transition-all">
                  {cat}
                  <button type="button" onClick={() => handleDeleteCategory(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity text-admin-error ml-1">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>))}
            </div>

            <div className="mt-4 pt-4 border-t border-admin-border space-y-2">
              <button type="button" onClick={runDatabaseMigration} disabled={isMigrating} className="w-full py-2.5 bg-admin-primary/10 border border-admin-primary/20 hover:bg-admin-primary/20 text-admin-primary rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <Database className="w-4 h-4"/>
                {isMigrating ? "Migrating Database..." : "Run Global Category Migration"}
              </button>
              {migrationStatus && (<p className="text-[10px] text-nc-muted font-mono bg-admin-surface-light/50 border border-admin-border p-2 rounded-lg text-center break-all">
                  {migrationStatus}
                </p>)}
            </div>
          </div>

          
          <div className="pt-6 border-t border-admin-border space-y-4 mt-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                    <Globe className="w-4 h-4"/>
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Maintenance Mode</span>
                    <span className="text-[9px] text-nc-muted uppercase">Lock users out for upgrades</span>
                  </div>
                </div>
                
                {settings.maintenanceMode ? (<button onClick={handleToggleMaintenanceMode} className="px-4 py-1.5 text-[9px] font-black uppercase bg-admin-error text-white rounded-lg hover:bg-red-700 shadow-lg shadow-admin-error/15">
                    Deactivate
                  </button>) : (<button onClick={handleToggleMaintenanceMode} className="px-4 py-1.5 text-[9px] font-black uppercase text-admin-success border border-admin-success/30 rounded-lg hover:bg-admin-success/10">
                    Activate
                  </button>)}
             </div>
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-admin-secondary/10 flex items-center justify-center text-admin-secondary">
                    <Lock className="w-4 h-4"/>
                  </div>
                  <div>
                    <span className="text-xs font-bold block">System Rules Status</span>
                    <span className="text-[9px] text-nc-muted uppercase">Active Security Profiles</span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-admin-success flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5"/> Secure v4.2.0
                </span>
             </div>
          </div>
        </div>
      </div>

      
      <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6 border-b border-admin-border pb-3">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-admin-secondary"/>
            Send System Announcement / Alert
          </h4>
          <span className="text-[10px] text-nc-muted font-bold uppercase tracking-widest">Broadcast Console</span>
        </div>

        <form onSubmit={handleSendAnnouncement} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Notification Type</label>
              <select id="announcement-type" name="announcement-type" value={announcement.type} onChange={(e) => setAnnouncement(prev => ({ ...prev, type: e.target.value }))} className="w-full bg-admin-surface-light border border-admin-border text-white text-xs rounded-lg p-2 focus:outline-none focus:border-admin-primary">
                <option value="system">System Announcement (System tab)</option>
                <option value="casting">Casting-related Update (Casting tab)</option>
                <option value="messages">Message-related Update (Messages tab)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Target Audience</label>
              <select id="announcement-target-type" name="announcement-target-type" value={announcement.targetType} onChange={(e) => setAnnouncement(prev => ({ ...prev, targetType: e.target.value }))} className="w-full bg-admin-surface-light border border-admin-border text-white text-xs rounded-lg p-2 focus:outline-none focus:border-admin-primary">
                <option value="all">All Registered Users</option>
                <option value="specific">Specific User ID</option>
              </select>
            </div>

            {announcement.targetType === 'specific' && (<div className="space-y-1">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Target User UID</label>
                <input type="text" id="announcement-specific-user-id" name="announcement-specific-user-id" placeholder="Enter User UID..." value={announcement.specificUserId} onChange={(e) => setAnnouncement(prev => ({ ...prev, specificUserId: e.target.value }))} className="w-full bg-admin-surface-light border border-admin-border text-white text-xs rounded-lg p-2 focus:outline-none focus:border-admin-primary"/>
              </div>)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Notification Title</label>
              <input type="text" id="announcement-title" name="announcement-title" placeholder="Platform Update / Security Alert / System Maintenance..." value={announcement.title} onChange={(e) => setAnnouncement(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-admin-surface-light border border-admin-border text-white text-xs rounded-lg p-2 focus:outline-none focus:border-admin-primary"/>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Notification Message / Body</label>
              <textarea id="announcement-body" name="announcement-body" placeholder="Detailed announcement details..." value={announcement.body} onChange={(e) => setAnnouncement(prev => ({ ...prev, body: e.target.value }))} rows={2} className="w-full bg-admin-surface-light border border-admin-border text-white text-xs rounded-lg p-2 focus:outline-none focus:border-admin-primary"/>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={sendingAnnouncement} className="px-6 py-2.5 bg-admin-secondary text-black rounded-xl text-xs font-black uppercase shadow-lg shadow-admin-secondary/20 hover:bg-admin-secondary/85 transition-all disabled:opacity-50">
              {sendingAnnouncement ? "Broadcasting..." : "Send Announcement "}
            </button>
          </div>
        </form>
      </div>

      
      <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6 border-b border-admin-border pb-3">
          <h4 className="font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-admin-error"/>
            Audit Operations Logs
          </h4>
          <span className="text-[10px] text-nc-muted font-bold uppercase tracking-widest">Showing Last 50 Events</span>
        </div>

        <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-admin-surface-light/30 border-b border-admin-border text-[9px] font-black text-white/40 uppercase tracking-widest">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target UID</th>
                <th className="px-4 py-3">Incident details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/50 text-white/80">
              {logs.map((log) => (<tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-nc-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-nc-muted shrink-0"/>
                    {formatLogDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{log.adminEmail}</td>
                  <td className="px-4 py-3">
                    <span className="bg-admin-primary/10 border border-admin-primary/20 text-admin-primary px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-white/60 select-all">{log.targetId}</td>
                  <td className="px-4 py-3 text-white/70 max-w-xs truncate" title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}>
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                  </td>
                </tr>))}
              {logs.length === 0 && (<tr>
                  <td colSpan={5} className="text-center py-6 text-nc-muted italic">
                    No operations logs detected in Firestore.
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
