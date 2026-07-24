import { auth, db } from "../../../lib/firebase";
import {
  collection,
  doc,
  query,
  orderBy,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { rateLimitedGet } from "../../../utils/rateLimitedFirestore";
import apiClient from "../../../api/client";
import { COLLECTIONS } from "../../../constants/collections";

export const subscribeToCastingCalls = (
  filter: string,
  callback: (data: any, error: any) => void
) => {
  let q;
  if (filter && filter.toLowerCase() !== "all") {
    q = query(
      collection(db, COLLECTIONS.CASTING_CALLS),
      where("type", "==", filter),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(collection(db, COLLECTIONS.CASTING_CALLS), orderBy("createdAt", "desc"));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(data, null);
    },
    (error) => {
      console.error("Casting calls subscription error:", error);
      callback([], error);
    }
  );
};

export const getCastingCallById = async (id: string) => {
  try {
    const snap = await rateLimitedGet(doc(db, COLLECTIONS.CASTING_CALLS, id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching casting call:", error);
    return null;
  }
};

export const createCastingCall = async (callData: any) => {
  try {
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid) {
      return { id: null, error: "Authentication required" };
    }

    const response = await apiClient.post<{ id: string }>("/casting", callData, { timeout: 2000 });
    return { id: response.data?.id || null, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create casting call";
    console.warn("Backend createCastingCall failed, attempting client-side fallback write:", message);
    
    
    try {
      const currentUserUid = auth.currentUser?.uid;
      if (!currentUserUid) {
        return { id: null, error: "Authentication required" };
      }

      const { id, ...dataToSave } = callData;
      const finalId = id || doc(collection(db, COLLECTIONS.CASTING_CALLS)).id;

      await setDoc(doc(db, COLLECTIONS.CASTING_CALLS, finalId), {
        ...dataToSave,
        createdAt: serverTimestamp(),
        createdBy: currentUserUid,
        status: dataToSave.status || "Open",
      });

      return { id: finalId, error: null };
    } catch (clientError: any) {
      console.error("Client fallback createCastingCall error:", clientError.message);
      return { id: null, error: clientError.message || "Failed to create casting call on client" };
    }
  }
};

export const deleteCastingCallAdmin = async (id: string) => {
  try {
    await apiClient.delete(`/casting/${id}`);
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete casting call";
    console.error("deleteCastingCallAdmin error:", message);
    return { success: false, error: message };
  }
};

export const setCastingPriorityAdmin = async (id: string, highPriority: boolean) => {
  try {
    await apiClient.put(`/casting/${id}/priority`, { highPriority });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set casting priority";
    console.error("setCastingPriorityAdmin error:", message);
    return { success: false, error: message };
  }
};
