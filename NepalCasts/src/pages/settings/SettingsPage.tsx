import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import ProfileSettings from './components/ProfileSettings';
import SkillsSettings from './components/SkillsSettings';
import ExperienceSettings from './components/ExperienceSettings';
import SecuritySettings from './components/SecuritySettings';
import NotificationSettings from './components/NotificationSettings';
import DataSettings from './components/DataSettings';
import { ChevronLeft, User, Briefcase, Lock, Bell, Shield, Database } from 'lucide-react';

interface SettingsPageProps {
  onNavigate: (page: string, param?: any) => void;
  user: any;
  showAlert: (message: string, type?: any, detail?: string) => void;
}

export default function SettingsPage({
  onNavigate,
  user,
  showAlert
}: SettingsPageProps) {
  const {
    profile,
    loading,
    sessions,
    blockedUsersList,
    dataRequests,
    updateProfileSettings,
    revokeSession,
    unblockUserAction,
    createDataExportRequest
  } = useSettings(user);

  const [activeTab, setActiveTab] = useState<'about' | 'skills' | 'experience' | 'password' | 'notifications' | 'data'>('about');
  const [currentMobileView, setCurrentMobileView] = useState<'menu' | 'content'>('menu');

  const tabsConfig = [
    { id: 'about', label: 'Edit Profile', icon: User },
    { id: 'skills', label: 'Skills Showcase', icon: Shield },
    { id: 'experience', label: 'Work History', icon: Briefcase },
    { id: 'password', label: 'Password & Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'GDPR & Privacy', icon: Database },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-nc-dark pb-24 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-nc-dark pb-24 flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-nc-muted text-sm max-w-xs mb-6">
          Please log in to manage your account settings.
        </p>
        <button
          onClick={() => onNavigate('signin')}
          className="px-6 py-2.5 bg-[#00BFFF] text-black font-bold rounded-2xl"
        >
          Sign In
        </button>
      </div>
    );
  }

  const activeTabLabel = tabsConfig.find(t => t.id === activeTab)?.label || 'Account Settings';

  const handleBack = () => {
    if (currentMobileView === 'content') {
      setCurrentMobileView('menu');
    } else {
      onNavigate('profile', profile.uid);
    }
  };

  return (
    <div className="min-h-screen bg-nc-dark pb-24">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 pt-6 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white border border-white/10 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-black text-white">
          <span className="md:inline hidden">Account Settings</span>
          <span className="md:hidden inline">{currentMobileView === 'content' ? activeTabLabel : 'Account Settings'}</span>
        </h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Hand Sidebar Navigation */}
        <div className={`md:col-span-1 space-y-1 ${currentMobileView === 'menu' ? 'block' : 'hidden md:block'}`}>
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentMobileView('content');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                  isSelected 
                    ? 'bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20' 
                    : 'text-nc-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Hand Settings Details Panel */}
        <div className={`md:col-span-3 animate-fade-in ${currentMobileView === 'content' ? 'block' : 'hidden md:block'}`}>
          {activeTab === 'about' && (
            <ProfileSettings 
              profile={profile}
              onUpdate={updateProfileSettings}
              showAlert={showAlert}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsSettings 
              profile={profile}
              onUpdate={updateProfileSettings}
              showAlert={showAlert}
            />
          )}

          {activeTab === 'experience' && (
            <ExperienceSettings 
              profile={profile}
              onUpdate={updateProfileSettings}
              showAlert={showAlert}
            />
          )}

          {activeTab === 'password' && (
            <SecuritySettings 
              sessions={sessions}
              blockedUsers={blockedUsersList}
              onRevokeSession={revokeSession}
              onUnblockUser={unblockUserAction}
              showAlert={showAlert}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings 
              profile={profile}
              onUpdate={updateProfileSettings}
              showAlert={showAlert}
            />
          )}

          {activeTab === 'data' && (
            <DataSettings 
              requests={dataRequests}
              onRequestExport={createDataExportRequest}
              showAlert={showAlert}
            />
          )}
        </div>
      </div>
    </div>
  );
}
export type { SettingsPageProps };
