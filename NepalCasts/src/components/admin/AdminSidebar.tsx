import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  UserRound, 
  Briefcase, 
  MessageSquare, 
  CreditCard, 
  ShieldAlert, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Database
} from 'lucide-react';

const menuItems = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/analytics', label: 'User Analytics', icon: BarChart3 },
  { to: '/admin/content', label: 'Talent Content', icon: UserRound },
  { to: '/admin/casting', label: 'Casting Calls', icon: Briefcase },
  { to: '/admin/messages', label: 'Activity Monitoring', icon: MessageSquare },
  { to: '/admin/pro', label: 'PRO Members', icon: CreditCard },
  { to: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
  { to: '/admin/settings', label: 'Platform Settings', icon: Settings },
];

export default function AdminSidebar({ activeTab: _activeTab, onNavigate: _onNavigate }: { activeTab?: any; onNavigate?: any }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`h-screen bg-admin-surface border-r border-admin-border flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-admin-primary to-white flex items-center justify-center font-black text-admin-surface text-xl shadow-[0_0_15px_rgba(56,189,248,0.4)]">A</div>
            <div className="flex flex-col">
              <span className="font-black text-white text-xl tracking-[0.2em] leading-none uppercase">Admin</span>
              <span className="text-[9px] text-admin-primary font-black uppercase tracking-[0.3em] mt-1">Dashboard</span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-admin-primary to-blue-600 flex items-center justify-center font-black text-white text-xl mx-auto shadow-lg shadow-admin-primary/20">N</div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-admin-primary/10 text-admin-primary shadow-[inset_0_0_10px_rgba(56,189,248,0.1)]' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-admin-primary' : 'text-white/40 group-hover:text-admin-primary transition-colors'
                }`} />
                {!isCollapsed && <span className="text-[13px] font-bold tracking-tight">{item.label}</span>}
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1 h-1 rounded-full bg-admin-primary shadow-[0_0_8px_#38BDF8]"></div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-admin-border space-y-2">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 text-nc-muted hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : <><ChevronLeft className="w-5 h-5" /><span className="text-sm">Collapse Sidebar</span></>}
        </button>
        <Link 
          to="/"
          className="w-full flex items-center gap-3 px-3 py-2 text-admin-error hover:bg-admin-error/10 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Exit Dashboard</span>}
        </Link>
      </div>
    </aside>
  );
}
