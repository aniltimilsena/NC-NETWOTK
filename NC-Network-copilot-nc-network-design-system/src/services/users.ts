import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

type Talent = {
  id: string;
  [key: string]: unknown;
};

export const subscribeToTalents = (callback: (talents: Talent[]) => void) => {
  const q = query(collection(db, "profiles"), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    const talents: Talent[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(talents);
  });
};
