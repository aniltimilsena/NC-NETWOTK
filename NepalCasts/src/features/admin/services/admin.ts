import { db } from "../../../lib/firebase";
import { collection, doc, setDoc, query, orderBy, limit, onSnapshot, } from "firebase/firestore";
import { CATEGORIES } from "../../../constants/categories";
import apiClient from "../../../api/client";
import { COLLECTIONS } from "../../../constants/collections";
export type AdminLog = {
    id: string;
    adminEmail: string;
    action: string;
    targetId: string;
    details: string;
    timestamp: any;
};
export type GlobalSettings = {
    maintenanceMode: boolean;
    features: {
        discovery: boolean;
        aiCasting: boolean;
        messaging: boolean;
        proScreenings: boolean;
    };
    categories: string[];
};
export const logAdminAction = async (adminEmail: string, action: string, targetId: string, details: string) => {
    try {
        await apiClient.post("/admin/log", { action, targetId, details });
    }
    catch (err) {
        console.error("Failed to write admin log:", err);
    }
};
export const subscribeToAdminLogs = (callback: (logs: AdminLog[]) => void) => {
    const q = query(collection(db, COLLECTIONS.ADMIN_LOGS), orderBy("timestamp", "desc"), limit(50));
    return onSnapshot(q, (snap) => {
        const logs = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AdminLog[];
        callback(logs);
    }, (err) => {
        console.error("Error subscribing to admin logs:", err);
    });
};
const defaultSettings: GlobalSettings = {
    maintenanceMode: false,
    features: {
        discovery: true,
        aiCasting: true,
        messaging: false,
        proScreenings: true
    },
    categories: [...CATEGORIES]
};
export const subscribeToGlobalSettings = (callback: (settings: GlobalSettings) => void) => {
    const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, "global");
    return onSnapshot(settingsDocRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data() as GlobalSettings);
        }
        else {
            callback(defaultSettings);
        }
    }, (err) => {
        console.error("Error subscribing to global settings:", err);
    });
};
export const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
    try {
        const settingsDocRef = doc(db, COLLECTIONS.SETTINGS, "global");
        await setDoc(settingsDocRef, settings, { merge: true });
        try {
            await apiClient.post("/admin/settings", settings);
        }
        catch (apiErr) {
        }
        return { success: true, error: null };
    }
    catch (err: any) {
        console.error("Error updating global settings:", err);
        return { success: false, error: err.message };
    }
};
