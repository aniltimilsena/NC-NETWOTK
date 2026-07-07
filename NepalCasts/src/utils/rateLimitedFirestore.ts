import { getDoc, DocumentReference, DocumentSnapshot } from 'firebase/firestore';

const requestCounts = new Map<string, number[]>();
const LIMIT = 50; 
const WINDOW = 60000; 

export const rateLimitedGet = async (
  docRef: DocumentReference
): Promise<DocumentSnapshot> => {
  const key = docRef.path;
  const now = Date.now();
  
  const requests = requestCounts.get(key) || [];
  const recentRequests = requests.filter(
    time => now - time < WINDOW
  );

  if (recentRequests.length >= LIMIT) {
    throw new Error('Rate limit exceeded for this document');
  }

  recentRequests.push(now);
  requestCounts.set(key, recentRequests);

  return getDoc(docRef);
};
