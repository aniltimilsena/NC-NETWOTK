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
    return (<div className="space-y-2 sm:space-y-3">
      <div className="bg-[#0E0E0E] border-0 rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-white"/>
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
            <button type="button" onClick={() => setEmailNotifications(!emailNotifications)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${emailNotifications ? 'bg-[#522C69]' : 'bg-white/10'}`}>
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
            <button type="button" onClick={() => setPushNotifications(!pushNotifications)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${pushNotifications ? 'bg-[#522C69]' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${pushNotifications ? 'translate-x-6' : 'translate-x-0'}`}/>
            </button>
          </div>
        </div>
      </div>

      
      <div className="flex justify-end px-3 sm:px-0">
        <Button onClick={handleSave} loading={submitting} className="px-6 py-2 h-10 rounded-xl text-xs font-bold">
          Save Changes
        </Button>
      </div>
    </div>);
}
export type { NotificationSettingsProps };
