import { db } from "../lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

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

// Log admin action to firestore
export const logAdminAction = async (adminEmail: string, action: string, targetId: string, details: string) => {
  try {
    await addDoc(collection(db, "admin_logs"), {
      adminEmail,
      action,
      targetId,
      details,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to write admin log:", err);
  }
};

// Subscribe to admin logs (limit to 50 for display)
export const subscribeToAdminLogs = (callback: (logs: AdminLog[]) => void) => {
  const q = query(collection(db, "admin_logs"), orderBy("timestamp", "desc"), limit(50));
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

// Default settings object
const defaultSettings: GlobalSettings = {
  maintenanceMode: false,
  features: {
    discovery: true,
    aiCasting: true,
    messaging: false,
    proScreenings: true
  },
  categories: ['Actors', 'Directors', 'Editor/VFX', 'Dancers', 'Models', 'Musicians', 'Writers', 'Comedians']
};

// Subscribe to global platform settings
export const subscribeToGlobalSettings = (callback: (settings: GlobalSettings) => void) => {
  const settingsDocRef = doc(db, "settings", "global");
  return onSnapshot(settingsDocRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as GlobalSettings);
    } else {
      // Initialize with defaults if it doesn't exist yet
      setDoc(settingsDocRef, defaultSettings)
        .then(() => callback(defaultSettings))
        .catch(err => console.error("Error initializing global settings:", err));
    }
  }, (err) => {
    console.error("Error subscribing to global settings:", err);
  });
};

// Update global settings
export const updateGlobalSettings = async (settings: Partial<GlobalSettings>) => {
  try {
    const settingsDocRef = doc(db, "settings", "global");
    await updateDoc(settingsDocRef, {
      ...settings,
      updatedAt: serverTimestamp()
    });
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Error updating global settings:", err);
    return { success: false, error: err.message };
  }
};
