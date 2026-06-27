import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLLECTIONS } from "../constants/collections";

type Talent = {
  id: string;
  [key: string]: unknown;
};

export const subscribeToTalents = (callback: (talents: Talent[]) => void) => {
  const q = query(collection(db, COLLECTIONS.PROFILES), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    const talents: Talent[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(talents);
  });
};
