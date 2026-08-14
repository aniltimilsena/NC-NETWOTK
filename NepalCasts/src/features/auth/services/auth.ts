import { db } from "../../../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS } from "../../../constants/collections";

export const ensureUserProfile = async (user: { uid: string; displayName?: string; email?: string }) => {
    try {
        if (!user?.uid) return { success: false, error: "Missing user ID" };
        const userRef = doc(db, COLLECTIONS.USERS, user.uid);
        const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);
        const contactRef = doc(db, "contact_info", user.uid);

        try {
            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName || "NC User",
                email: user.email || "",
                role: "Actor",
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (err) {
            console.warn("ensureUserProfile userRef warning:", err);
        }

        if (user.email) {
            try {
                await setDoc(contactRef, {
                    email: user.email,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            } catch (err) {
                console.warn("ensureUserProfile contactRef warning:", err);
            }
        }

        try {
            await setDoc(profileRef, {
                uid: user.uid,
                name: user.displayName || "NC User",
                role: "Actor",
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (err) {
            console.warn("ensureUserProfile profileRef warning:", err);
        }

        return { success: true, error: null };
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to ensure user profile";
        console.warn("ensureUserProfile non-fatal warning:", message);
        return { success: true, error: null };
    }
};
