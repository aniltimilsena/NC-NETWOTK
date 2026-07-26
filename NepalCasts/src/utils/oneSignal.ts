import OneSignal from 'react-onesignal';
export let oneSignalInitialized = false;
export const initOneSignal = async () => {
    try {
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || "a9962176-972c-4874-8161-ec84428e9036";
        await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
        });
        oneSignalInitialized = true;
        console.log("OneSignal client-side initialized successfully.");
        OneSignal.Notifications.addEventListener('click', (event: any) => {
            console.log("OneSignal Notification Clicked:", event);
            const actionId = event.result?.actionId;
            const url = event.notification?.launchURL;
            if (actionId === 'reply_chat') {
                console.log("User clicked 'Reply' action. Redirecting to chat thread...");
                if (url && typeof window !== 'undefined') {
                    window.location.href = url;
                }
            }
            else if (actionId === 'view_chat') {
                console.log("User clicked 'Open Chat' action. Redirecting...");
                if (url && typeof window !== 'undefined') {
                    window.location.href = url;
                }
            }
            else if (actionId === 'call_back') {
                console.log("User clicked 'Call Back' action. Redirecting to calls...");
                if (typeof window !== 'undefined') {
                    window.location.href = '/messages';
                }
            }
        });
    }
    catch (err) {
        console.warn("OneSignal client-side initialization failed:", err);
    }
};
