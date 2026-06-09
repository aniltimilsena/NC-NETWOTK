import { auth, db } from "../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export const getCastingCalls = async (filter?: string) => {
  try {
    let q;
    if (filter && filter.toLowerCase() !== "all") {
      q = query(
        collection(db, "casting_calls"),
        where("type", "==", filter),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(collection(db, "casting_calls"), orderBy("createdAt", "desc"));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching casting calls:", error);
    return [];
  }
};

export const subscribeToCastingCalls = (
  filter: string,
  callback: (data: any, error: any) => void
) => {
  let q;
  if (filter && filter.toLowerCase() !== "all") {
    q = query(
      collection(db, "casting_calls"),
      where("type", "==", filter),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(collection(db, "casting_calls"), orderBy("createdAt", "desc"));
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
    const snap = await getDoc(doc(db, "casting_calls", id));
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

    const docRef = await addDoc(collection(db, "casting_calls"), {
      ...callData,
      createdAt: serverTimestamp(),
      createdBy: currentUserUid,
      status: 'Open',
    });
    return { id: docRef.id, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create casting call";
    console.error("createCastingCall error:", message);
    return { id: null, error: message };
  }
};

export const deleteCastingCallAdmin = async (id: string) => {
  try {
    await deleteDoc(doc(db, "casting_calls", id));
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete casting call";
    console.error("deleteCastingCallAdmin error:", message);
    return { success: false, error: message };
  }
};

export const setCastingPriorityAdmin = async (id: string, highPriority: boolean) => {
  try {
    await updateDoc(doc(db, "casting_calls", id), {
      highPriority,
      updatedAt: serverTimestamp(),
    });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set casting priority";
    console.error("setCastingPriorityAdmin error:", message);
    return { success: false, error: message };
  }
};
