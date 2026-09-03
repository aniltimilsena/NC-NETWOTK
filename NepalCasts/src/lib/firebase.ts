import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || (import.meta.env.VITE_FIREBASE_PROJECT_ID ? `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app/` : undefined)
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Dynamic/lazy loaders for heavy optional services (loaded strictly on-demand if invoked)
let storageInstance: any = null;
export const getStorageInstance = async () => {
    if (!storageInstance) {
        const { getStorage } = await import("firebase/storage");
        storageInstance = getStorage(app);
    }
    return storageInstance;
};

let functionsInstance: any = null;
export const getFunctionsInstance = async () => {
    if (!functionsInstance) {
        const { getFunctions } = await import("firebase/functions");
        functionsInstance = getFunctions(app);
    }
    return functionsInstance;
};

let rtdbInstance: any = null;
export const getRTDBInstance = async () => {
    if (!rtdbInstance) {
        const { getDatabase } = await import("firebase/database");
        rtdbInstance = getDatabase(app);
    }
    return rtdbInstance;
};

// Fallback stubs for backwards compatibility
export const rtdb = null as any;
export const storage = null as any;
export const functions = null as any;
export const messaging = null as any;
export const analytics = null as any;

export default app;
