import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import ProfileSettings from './components/ProfileSettings';
import SkillsSettings from './components/SkillsSettings';
import ExperienceSettings from './components/ExperienceSettings';
import SecuritySettings from './components/SecuritySettings';
import NotificationSettings from './components/NotificationSettings';
import { ChevronLeft, User, Briefcase, Lock, Bell, Shield, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SettingsPageProps {
    onNavigate: (page: string, param?: any) => void;
    user: any;
    initialTab?: string;
    showAlert: (message: string, type?: any, detail?: string) => void;
    showToast?: (message: string, type?: any) => void;
}

function LanguageSettings({ showAlert }: { showAlert: (msg: string, type?: any) => void }) {
    const { i18n } = useTranslation();
    const currentLang = 'en';
    const languages = [
        { code: 'en', label: 'English', desc: 'Default system language', flag: '🇬🇧' },
    ];

    const handleSelect = (code: string) => {
        i18n.changeLanguage(code);
        showAlert?.('Language updated successfully!', 'success');
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Globe className="w-6 h-6 text-[#00BFFF]" />
                    <span>Language & Regional Preference</span>
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                    Select your preferred language for the NepalCasts interface.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {languages.map((lang) => {
                    const isSelected = currentLang === lang.code;
                    return (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                                isSelected
                                    ? 'bg-[#00BFFF]/10 border-[#00BFFF] text-white shadow-lg'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                            }`}
                        >
                            <span className="text-2xl mb-2">{lang.flag}</span>
                            <span className="font-bold text-base text-white">{lang.label}</span>
                            <span className="text-xs text-gray-400 mt-1">{lang.desc}</span>
                            {isSelected && (
                                <span className="mt-3 text-xs font-extrabold text-[#00BFFF] bg-[#00BFFF]/20 px-2.5 py-1 rounded-full">
                                    ✓ Active
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function SettingsPage({ onNavigate, user, initialTab, showAlert }: SettingsPageProps) {
    const { profile, loading, sessions, blockedUsersList, updateProfileSettings, revokeSession, unblockUserAction } = useSettings(user);

    const resolveTab = (tabStr?: string): 'about' | 'skills' | 'experience' | 'password' | 'notifications' | 'language' => {
        if (!tabStr) return 'about';
        const clean = tabStr.toLowerCase();
        if (clean === 'password' || clean === 'security') return 'password';
        if (clean === 'notifications') return 'notifications';
        if (clean === 'language') return 'language';
        if (clean === 'skills') return 'skills';
        if (clean === 'experience') return 'experience';
        return 'about';
    };

    const [activeTab, setActiveTab] = useState<'about' | 'skills' | 'experience' | 'password' | 'notifications' | 'language'>(() => resolveTab(initialTab));
    const [currentMobileView, setCurrentMobileView] = useState<'menu' | 'content'>('menu');

    const tabsConfig = [
        { id: 'about', label: 'Edit Profile', icon: User },
        { id: 'skills', label: 'Skills Showcase', icon: Shield },
        { id: 'experience', label: 'Work History', icon: Briefcase },
        { id: 'password', label: 'Password & Security', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'language', label: 'Language Settings', icon: Globe },
    ] as const;

    const activeProfile = profile || (user?.uid ? {
        uid: user.uid,
        name: user.displayName || (user.email ? user.email.split('@')[0] : 'Talent User'),
        email: user.email || '',
        photoURL: user.photoURL || '',
        role: user.role || 'Actor',
        bio: '',
        location: '',
        skills: [],
        experience: [],
        languages: [],
        media: [],
    } : null);

    if (loading && !activeProfile) {
        return (
            <div className="min-h-screen bg-nc-dark pb-6 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!activeProfile) {
        return (
            <div className="min-h-screen bg-nc-dark pb-6 flex flex-col items-center justify-center text-center p-6">
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-nc-muted text-sm max-w-xs mb-6">
                    Please log in to manage your account settings.
                </p>
                <button onClick={() => onNavigate('signin')} className="px-6 py-2.5 bg-[#00BFFF] text-black font-bold rounded-2xl">
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
        <div className="min-h-screen bg-nc-dark pb-6">
            <div className="max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 pt-6 flex items-center gap-4">
                <button onClick={handleBack} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-all shrink-0 cursor-pointer" aria-label="Back">
                    <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                </button>
                <h1 className="text-2xl font-black text-white">
                    <span className="md:inline hidden">Account Settings</span>
                    <span className="md:hidden inline">{currentMobileView === 'content' ? activeTabLabel : 'Account Settings'}</span>
                </h1>
            </div>

            <div className="max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
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

                <div className={`md:col-span-3 animate-fade-in ${currentMobileView === 'content' ? 'block' : 'hidden md:block'}`}>
                    {activeTab === 'about' && (<ProfileSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'skills' && (<SkillsSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'experience' && (<ExperienceSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'password' && (<SecuritySettings sessions={sessions} blockedUsers={blockedUsersList} onRevokeSession={revokeSession} onUnblockUser={unblockUserAction} showAlert={showAlert} />)}
                    {activeTab === 'notifications' && (<NotificationSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'language' && (<LanguageSettings showAlert={showAlert} />)}
                </div>
            </div>
        </div>
    );
}

export type { SettingsPageProps };
