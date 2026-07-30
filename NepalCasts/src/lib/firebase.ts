import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
let messagingInstance = null;
let analyticsInstance = null;
try {
    if (typeof window !== 'undefined') {
        messagingInstance = getMessaging(app);
    }
}
catch (error) {
    console.warn("Firebase Messaging is not supported in this environment:", error);
}
try {
    if (typeof window !== 'undefined') {
        analyticsInstance = getAnalytics(app);
    }
}
catch (error) {
    console.warn("Firebase Analytics is not supported in this environment:", error);
}
export const messaging = messagingInstance;
export const analytics = analyticsInstance;
export default app;
