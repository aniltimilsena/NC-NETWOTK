import React, { useState, useEffect } from 'react';
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
        <div className="bg-[#0E0E0E] border-0 rounded-2xl p-4 sm:p-6 space-y-5 text-left">
            <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-white" />
                    <span>Language & Regional Preference</span>
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                    Select your preferred language for the NepalCasts interface.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {languages.map((lang) => {
                    const isSelected = currentLang === lang.code;
                    return (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                    ? 'bg-[#522C69]/10 border-[#522C69] text-white shadow-lg'
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                            }`}
                        >
                            <span className="text-2xl mb-2">{lang.flag}</span>
                            <span className="font-bold text-sm text-white">{lang.label}</span>
                            <span className="text-xs text-gray-400 mt-1">{lang.desc}</span>
                            {isSelected && (
                                <span className="mt-3 text-[10px] font-extrabold text-[#522C69] bg-[#522C69]/20 px-2.5 py-0.5 rounded-full">
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
        if (clean === 'password' || clean === 'security' || clean === 'account') return 'password';
        if (clean === 'notifications') return 'notifications';
        if (clean === 'language') return 'language';
        if (clean === 'skills') return 'skills';
        if (clean === 'experience' || clean === 'history' || clean === 'work') return 'experience';
        return 'about';
    };

    const [activeTab, setActiveTab] = useState<'about' | 'skills' | 'experience' | 'password' | 'notifications' | 'language'>(() => resolveTab(initialTab));
    const [currentMobileView, setCurrentMobileView] = useState<'menu' | 'content'>(() => (initialTab && initialTab !== 'settings' && initialTab !== 'menu' ? 'content' : 'menu'));

    useEffect(() => {
        setActiveTab(resolveTab(initialTab));
        if (initialTab && initialTab !== 'settings' && initialTab !== 'menu') {
            setCurrentMobileView('content');
        }
    }, [initialTab]);

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
            <div className="min-h-screen bg-nc-dark pb-6 animate-pulse">
                <div className="max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 pt-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 shrink-0" />
                    <div className="h-6 bg-white/10 rounded-md w-48" />
                </div>

                <div className="max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1 space-y-2 flex flex-col items-stretch text-left">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-14 bg-white/5 border border-white/5 rounded-2xl w-full" />
                        ))}
                    </div>

                    <div className="md:col-span-3 space-y-6">
                        <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-5">
                            <div className="h-6 bg-white/10 rounded-md w-32 mb-4" />
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="h-3 bg-white/5 rounded w-16" />
                                    <div className="h-12 bg-white/5 border border-white/5 rounded-2xl w-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-white/5 rounded w-20" />
                                    <div className="h-12 bg-white/5 border border-white/5 rounded-2xl w-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-white/5 rounded w-24" />
                                    <div className="h-28 bg-white/5 border border-white/5 rounded-2xl w-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                <button onClick={() => onNavigate('signin')} className="px-6 py-2.5 bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold rounded-2xl cursor-pointer">
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
            <div className="max-w-[1600px] mx-auto px-3 sm:px-8 lg:px-12 pt-4 sm:pt-6 flex items-center gap-4">
                <button onClick={handleBack} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-all active:scale-95 shrink-0 cursor-pointer" aria-label="Back">
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <h1 className="text-2xl font-black text-white">
                    <span className="md:inline hidden">Account Settings</span>
                    <span className="md:hidden inline">{currentMobileView === 'content' ? activeTabLabel : 'Account Settings'}</span>
                </h1>
            </div>

            <div className="max-w-[1600px] mx-auto px-0 sm:px-8 lg:px-12 mt-4 sm:mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
                <div className={`md:col-span-1 space-y-1.5 flex flex-col items-stretch justify-start text-left px-2 sm:px-0 ${currentMobileView === 'menu' ? 'block' : 'hidden md:block'}`}>
                    {tabsConfig.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setCurrentMobileView('content');
                                    const pathSuffix = tab.id === 'about' ? 'profile' : tab.id === 'password' ? 'security' : tab.id;
                                    onNavigate(`/settings/${pathSuffix}`);
                                }}
                                className={`w-full flex items-center justify-start text-left gap-3.5 px-4 py-3 rounded-2xl text-base font-bold transition-all border cursor-pointer ${
                                    isSelected
                                        ? 'bg-white/10 text-white font-bold border-white/15 shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent font-medium'
                                }`}
                            >
                                <Icon className={`w-5 h-5 shrink-0 transition-colors ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                                <span className="truncate text-left">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={`md:col-span-3 animate-fade-in ${currentMobileView === 'content' ? 'block' : 'hidden md:block'}`}>
                    {activeTab === 'about' && (<ProfileSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'skills' && (<SkillsSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'experience' && (<ExperienceSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'password' && (<SecuritySettings sessions={sessions} blockedUsers={blockedUsersList} onRevokeSession={revokeSession} onUnblockUser={unblockUserAction} showAlert={showAlert} user={user} onNavigate={onNavigate} />)}
                    {activeTab === 'notifications' && (<NotificationSettings profile={activeProfile} onUpdate={updateProfileSettings} showAlert={showAlert} />)}
                    {activeTab === 'language' && (<LanguageSettings showAlert={showAlert} />)}
                </div>
            </div>
        </div>
    );
}

export type { SettingsPageProps };
