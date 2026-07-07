import OneSignal from 'react-onesignal';

export let oneSignalInitialized = false;

export const initOneSignal = async () => {
  try {
    const appId = "a9962176-972c-4874-8161-ec84428e9036";
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
    });
    oneSignalInitialized = true;
    console.log("🚀 OneSignal client-side initialized successfully.");
  } catch (err) {
    console.warn("⚠️ OneSignal client-side initialization failed:", err);
  }
};
