import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import ProfileSettings from './components/ProfileSettings';
import SkillsSettings from './components/SkillsSettings';
import ExperienceSettings from './components/ExperienceSettings';
import SecuritySettings from './components/SecuritySettings';
import NotificationSettings from './components/NotificationSettings';
import { ChevronLeft, User, Briefcase, Lock, Bell, Shield } from 'lucide-react';

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
    updateProfileSettings,
    revokeSession,
    unblockUserAction
  } = useSettings(user);

  const [activeTab, setActiveTab] = useState<'about' | 'skills' | 'experience' | 'password' | 'notifications'>('about');
  const [currentMobileView, setCurrentMobileView] = useState<'menu' | 'content'>('menu');

  const tabsConfig = [
    { id: 'about', label: 'Edit Profile', icon: User },
    { id: 'skills', label: 'Skills Showcase', icon: Shield },
    { id: 'experience', label: 'Work History', icon: Briefcase },
    { id: 'password', label: 'Password & Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
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
      onNavigate('back');
    }
  };

  return (
    <div className="min-h-screen bg-nc-dark pb-24">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 pt-6 flex items-center gap-4">
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

      <div className="max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Hand Sidebar Navigation */}
        <div className={`md:col-span-1 space-y-1 flex flex-col items-stretch justify-start text-left ${currentMobileView === 'menu' ? 'block' : 'hidden md:block'}`}>
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
                className={`w-fit md:w-full flex items-center justify-start text-left gap-4 px-4 py-3.5 rounded-2xl text-lg font-bold transition-all border ${
                  isSelected 
                    ? 'bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/20 shadow-sm' 
                    : 'text-nc-muted hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="truncate text-left">{tab.label}</span>
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


        </div>
      </div>
    </div>
  );
}
export type { SettingsPageProps };
