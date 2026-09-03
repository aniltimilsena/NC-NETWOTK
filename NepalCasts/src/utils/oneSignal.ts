import { logger } from './logger';

export let oneSignalInitialized = false;

export const initOneSignal = async (): Promise<void> => {
    try {
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
        if (!appId) {
            logger.warn('OneSignal initialization skipped: VITE_ONESIGNAL_APP_ID is not set.');
            return;
        }

        // Dynamically load react-onesignal only on-demand during idle state
        const { default: OneSignal } = await import('react-onesignal');

        await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
        });
        oneSignalInitialized = true;
        logger.log("OneSignal client-side initialized successfully.");

        OneSignal.Notifications.addEventListener('click', (event: any) => {
            logger.log("OneSignal Notification Clicked:", event);
            const actionId = event.result?.actionId;
            const url = event.notification?.launchURL;
            if (actionId === 'reply_chat') {
                logger.log("User clicked 'Reply' action. Redirecting to chat thread...");
                if (url && typeof window !== 'undefined') {
                    window.location.href = url;
                }
            }
            else if (actionId === 'view_chat') {
                logger.log("User clicked 'Open Chat' action. Redirecting...");
                if (url && typeof window !== 'undefined') {
                    window.location.href = url;
                }
            }
            else if (actionId === 'call_back') {
                logger.log("User clicked 'Call Back' action. Redirecting to calls...");
                if (typeof window !== 'undefined') {
                    window.location.href = '/messages';
                }
            }
        });
    }
    catch (err) {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            logger.debug("OneSignal skipped on localhost (configured for production domain).");
        } else {
            logger.warn("OneSignal client-side initialization failed:", err);
        }
    }
};

export const loginOneSignal = async (uid: string): Promise<void> => {
    if (!oneSignalInitialized) return;
    try {
        const { default: OneSignal } = await import('react-onesignal');
        await OneSignal.login(uid);
    } catch (e) {
        logger.warn('OneSignal login failed:', e);
    }
};

export const logoutOneSignal = async (): Promise<void> => {
    if (!oneSignalInitialized) return;
    try {
        const { default: OneSignal } = await import('react-onesignal');
        await OneSignal.logout();
    } catch {
        // Ignore OneSignal logout error on unauthenticated state
    }
};
