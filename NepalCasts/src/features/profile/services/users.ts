import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { COLLECTIONS } from "../../../constants/collections";

type Talent = {
  id: string;
  [key: string]: unknown;
};

import { cacheManager } from "../../../utils/cacheManager";

export const subscribeToTalents = (callback: (talents: Talent[]) => void) => {
  return cacheManager.subscribePooled(
    "talents_list_all",
    (pooledCb) => {
      const q = query(collection(db, COLLECTIONS.PROFILES), orderBy("name", "asc"));
      return onSnapshot(
        q,
        (snapshot) => {
          const talents: Talent[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          pooledCb(talents, null);
        },
        (error) => {
          console.error("Talents subscription error:", error);
          pooledCb([], error);
        }
      );
    },
    (data) => callback(data)
  );
};
