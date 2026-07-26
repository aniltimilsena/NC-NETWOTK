import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { UserProfile } from '../../../types';
interface NotificationSettingsProps {
    profile: UserProfile;
    onUpdate: (data: Partial<UserProfile>) => Promise<any>;
    showAlert: (message: string, type?: any) => void;
}
export default function NotificationSettings({ profile, onUpdate, showAlert }: NotificationSettingsProps) {
    const [emailNotifications, setEmailNotifications] = useState((profile as any).emailNotificationsEnabled ?? true);
    const [pushNotifications, setPushNotifications] = useState((profile as any).pushNotificationsEnabled ?? true);
    const [submitting, setSubmitting] = useState(false);
    const handleSave = async () => {
        setSubmitting(true);
        try {
            const res = await onUpdate({
                emailNotificationsEnabled: emailNotifications,
                pushNotificationsEnabled: pushNotifications,
            } as any);
            if (res.success) {
                showAlert('Notification preferences saved!', 'success');
            }
            else {
                showAlert(res.error || 'Failed to update preferences.', 'error');
            }
        }
        catch (err) {
            console.error(err);
            showAlert('Failed to save preferences.', 'error');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<div className="space-y-6">
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-4 sm:p-6 space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#00BFFF]"/>
          Notification Preferences
        </h2>

        <div className="space-y-5 divide-y divide-white/5">
          
          <div className="flex justify-between items-center py-4">
            <div className="text-left space-y-1">
              <h3 className="text-sm font-bold text-white">Email Notifications</h3>
              <p className="text-xs text-nc-muted leading-relaxed">
                Receive emails for matching casting calls, DM alerts, and updates.
              </p>
            </div>
            <button type="button" onClick={() => setEmailNotifications(!emailNotifications)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${emailNotifications ? 'bg-[#00BFFF]' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${emailNotifications ? 'translate-x-6' : 'translate-x-0'}`}/>
            </button>
          </div>

          
          <div className="flex justify-between items-center pt-5">
            <div className="text-left space-y-1">
              <h3 className="text-sm font-bold text-white">Push Notifications</h3>
              <p className="text-xs text-nc-muted leading-relaxed">
                Receive browser push alerts for messages and call invites.
              </p>
            </div>
            <button type="button" onClick={() => setPushNotifications(!pushNotifications)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${pushNotifications ? 'bg-[#00BFFF]' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${pushNotifications ? 'translate-x-6' : 'translate-x-0'}`}/>
            </button>
          </div>
        </div>
      </div>

      
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={submitting} className="px-8">
          Save Changes
        </Button>
      </div>
    </div>);
}
export type { NotificationSettingsProps };
