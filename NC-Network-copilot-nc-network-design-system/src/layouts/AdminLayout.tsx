import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';

export default function AdminLayout({ showToast }: { showToast?: any }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Convert the pathname back to the old string identifier (e.g. "/admin/users" -> "admin-users")
  // so the AdminSidebar can highlight the activeTab correctly.
  const getLegacyActiveTab = (pathname: string) => {
    if (pathname === '/admin' || pathname === '/admin/') return 'admin-overview';
    return 'admin-' + pathname.split('/admin/')[1];
  };

  const activeTab = getLegacyActiveTab(location.pathname);

  const handleLegacyNavigate = (page: string) => {
    switch (page) {
      case 'home': navigate('/'); break;
      case 'admin-overview': navigate('/admin'); break;
      case 'admin-users': navigate('/admin/users'); break;
      case 'admin-analytics': navigate('/admin/analytics'); break;
      case 'admin-content': navigate('/admin/content'); break;
      case 'admin-casting': navigate('/admin/casting'); break;
      case 'admin-messages': navigate('/admin/messages'); break;
      case 'admin-pro': navigate('/admin/pro'); break;
      case 'admin-moderation': navigate('/admin/moderation'); break;
      case 'admin-settings': navigate('/admin/settings'); break;
      case 'admin-data-requests': navigate('/admin/data-requests'); break;
      default: navigate('/');
    }
  };

  return (
    <div className="flex h-screen bg-admin-bg font-display overflow-hidden text-nc-text">
      <AdminSidebar activeTab={activeTab} onNavigate={handleLegacyNavigate} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-admin-border bg-admin-surface/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-black text-xs uppercase tracking-[0.3em]">
              {activeTab.replace('admin-', '').replace('-', ' ')}
            </h2>
            <div className="h-4 w-[1px] bg-admin-border"></div>
            <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest font-black">
              <div className="w-1.5 h-1.5 rounded-full bg-admin-primary shadow-[0_0_8px_#38BDF8] animate-pulse"></div>
              Live Telemetry
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-admin-surface-light border border-admin-border rounded-lg px-2 py-1">
              <span className="text-[10px] font-black text-white/40 uppercase px-2">Quick Actions:</span>
              <button className="p-1 px-3 text-[10px] font-black uppercase text-white hover:bg-white/5 rounded transition-all">Ban</button>
              <button className="p-1 px-3 text-[10px] font-black uppercase bg-admin-primary text-white rounded transition-all shadow-[0_0_10px_rgba(56,189,248,0.3)]">Verify</button>
            </div>
            <div className="relative group">
               <input 
                type="text" 
                placeholder="Global command... (⌘+K)" 
                className="bg-admin-surface-light border border-admin-border rounded-lg pl-10 pr-4 py-2 text-sm text-nc-text focus:outline-none focus:border-admin-primary transition-all w-64"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nc-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-3 border-l border-admin-border pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white leading-none">Admin Controller</p>
                <p className="text-[10px] text-nc-muted uppercase tracking-tighter mt-1">Superuser Access</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-admin-primary flex items-center justify-center font-bold text-black border border-white/10 uppercase">
                AD
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-admin-bg/50 custom-scrollbar">
          <Outlet context={{ showToast }} />
        </main>
      </div>
    </div>
  );
}
