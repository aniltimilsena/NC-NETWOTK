import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Database, 
  Globe, 
  Lock, 
  Trash2, 
  Plus, 
  Activity, 
  ShieldCheck, 
  Clock, 
  ShieldAlert,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import { Switch } from "../../components/ui/shadcn-switch";
import { 
  subscribeToGlobalSettings, 
  updateGlobalSettings, 
  subscribeToAdminLogs, 
  GlobalSettings, 
  AdminLog 
} from '../../services/admin';
import { auth } from '../../lib/firebase';
import { logAdminAction } from '../../services/admin';

export default function AdminSettings() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [updating, setUpdating] = useState(false);

  const adminEmail = auth.currentUser?.email || 'admin@nc-network.com';

  useEffect(() => {
    // 1. Subscribe to Global Settings
    const unsubSettings = subscribeToGlobalSettings((data) => {
      setSettings(data);
      setLoading(false);
    });

    // 2. Subscribe to Admin Audit Logs
    const unsubLogs = subscribeToAdminLogs((data) => {
      setLogs(data);
    });

    return () => {
      unsubSettings();
      unsubLogs();
    };
  }, []);

  const handleToggleFeature = async (featureKey: keyof GlobalSettings['features']) => {
    if (!settings) return;
    
    const updatedFeatures = {
      ...settings.features,
      [featureKey]: !settings.features[featureKey]
    };
    
    setUpdating(true);
    const res = await updateGlobalSettings({ features: updatedFeatures });
    setUpdating(false);

    if (res.success) {
      const stateLabel = !settings.features[featureKey] ? "enabled" : "disabled";
      await logAdminAction(adminEmail, "Toggle Feature Flag", "global_settings", `Feature ${featureKey} was ${stateLabel}`);
    } else {
      alert("Error updating feature toggle: " + res.error);
    }
  };

  const handleToggleMaintenanceMode = async () => {
    if (!settings) return;
    
    const nextMaintenance = !settings.maintenanceMode;
    setUpdating(true);
    const res = await updateGlobalSettings({ maintenanceMode: nextMaintenance });
    setUpdating(false);

    if (res.success) {
      const actionLabel = nextMaintenance ? "Activate Maintenance Mode" : "Deactivate Maintenance Mode";
      await logAdminAction(adminEmail, actionLabel, "global_settings", `Platform maintenance mode set to ${nextMaintenance}`);
      alert(nextMaintenance ? "Maintenance Mode Activated!" : "Maintenance Mode Deactivated!");
    } else {
      alert("Error updating maintenance mode: " + res.error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !newCategory.trim()) return;

    const trimmed = newCategory.trim();
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
    } else {
      alert("Error adding category: " + res.error);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (!settings) return;
    if (!window.confirm(`Are you sure you want to delete the taxonomy category "${catName}"?`)) return;

    const updatedCategories = settings.categories.filter(c => c !== catName);
    setUpdating(true);
    const res = await updateGlobalSettings({ categories: updatedCategories });
    setUpdating(false);

    if (res.success) {
      await logAdminAction(adminEmail, "Delete Taxonomy Category", "global_settings", `Deleted category: ${catName}`);
    } else {
      alert("Error deleting category: " + res.error);
    }
  };

  const formatLogDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-nc-muted text-xs">
        Synchronizing global platform telemetry settings...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-6xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Platform Configuration</h2>
          <p className="text-nc-muted text-sm mt-1">Global feature overrides, taxonomy orchestration, and real-time security audit trails.</p>
        </div>
        {updating && (
          <span className="text-xs text-admin-primary animate-pulse font-black uppercase tracking-widest bg-admin-primary/10 border border-admin-primary/20 px-3 py-1.5 rounded-xl">
            Writing Settings...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feature Toggles */}
        <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white mb-6 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-admin-primary" />
              Feature Toggles
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">Public Talent Discovery</p>
                  <p className="text-[10px] text-nc-muted uppercase">Allow guests to search profiles.</p>
                </div>
                <Switch 
                  checked={settings.features.discovery} 
                  onCheckedChange={() => handleToggleFeature('discovery')} 
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">AI Casting Matcher v2</p>
                  <p className="text-[10px] text-nc-muted uppercase">Neural candidate suggestion engine.</p>
                </div>
                <Switch 
                  checked={settings.features.aiCasting} 
                  onCheckedChange={() => handleToggleFeature('aiCasting')} 
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">Real-time Messaging</p>
                  <p className="text-[10px] text-nc-muted uppercase">WebSocket-based user chat.</p>
                </div>
                <Switch 
                  checked={settings.features.messaging} 
                  onCheckedChange={() => handleToggleFeature('messaging')} 
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">PRO-only Screenings</p>
                  <p className="text-[10px] text-nc-muted uppercase">Gated content for membership tiers.</p>
                </div>
                <Switch 
                  checked={settings.features.proScreenings} 
                  onCheckedChange={() => handleToggleFeature('proScreenings')} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Categories / Data management */}
        <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-admin-secondary" />
                Taxonomy Settings
              </h4>
            </div>
            
            {/* Add Taxonomy Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="New category..." 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-admin-surface-light border border-admin-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-admin-primary flex-1"
              />
              <button 
                type="submit" 
                className="p-2 bg-admin-secondary text-black rounded-xl hover:bg-admin-secondary/85 transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
              {settings.categories.map(cat => (
                <div key={cat} className="group relative flex items-center gap-2 px-3 py-1.5 bg-admin-surface-light border border-admin-border rounded-lg text-xs font-bold text-white hover:border-admin-secondary transition-all">
                  {cat}
                  <button 
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-admin-error ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-6 border-t border-admin-border space-y-4 mt-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Maintenance Mode</span>
                    <span className="text-[9px] text-nc-muted uppercase">Lock users out for upgrades</span>
                  </div>
                </div>
                
                {settings.maintenanceMode ? (
                  <button 
                    onClick={handleToggleMaintenanceMode}
                    className="px-4 py-1.5 text-[9px] font-black uppercase bg-admin-error text-white rounded-lg hover:bg-red-700 shadow-lg shadow-admin-error/15"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button 
                    onClick={handleToggleMaintenanceMode}
                    className="px-4 py-1.5 text-[9px] font-black uppercase text-admin-success border border-admin-success/30 rounded-lg hover:bg-admin-success/10"
                  >
                    Activate
                  </button>
                )}
             </div>
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-admin-secondary/10 flex items-center justify-center text-admin-secondary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">System Rules Status</span>
                    <span className="text-[9px] text-nc-muted uppercase">Active Security Profiles</span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-admin-success flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure v4.2.0
                </span>
             </div>
          </div>
        </div>
      </div>

      {/* Admin Audit Logs Section */}
      <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6 border-b border-admin-border pb-3">
          <h4 className="font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-admin-error" />
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
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-nc-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-nc-muted shrink-0" />
                    {formatLogDate(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{log.adminEmail}</td>
                  <td className="px-4 py-3">
                    <span className="bg-admin-primary/10 border border-admin-primary/20 text-admin-primary px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-white/60 select-all">{log.targetId}</td>
                  <td className="px-4 py-3 text-white/70 max-w-xs truncate" title={log.details}>{log.details}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-nc-muted italic">
                    No operations logs detected in Firestore.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
