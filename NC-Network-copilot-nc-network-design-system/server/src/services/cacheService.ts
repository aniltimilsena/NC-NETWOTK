import { BloomFilter } from 'bloom-filters';
import NodeCache from 'node-cache';

// ─── IN-MEMORY CACHE ──────────────────
// Stores actual data to avoid repeat DB calls
const cache = new NodeCache({
  stdTTL: 300,        // 5 minutes default TTL
  checkperiod: 60,    // cleanup every 60 seconds
  maxKeys: 10000,     // max 10k cached items
});

// ─── BLOOM FILTER ─────────────────────
// Tracks which IDs actually EXIST in the database
// Very memory efficient — stores millions of IDs in KB
// False positive rate: 1% (may say ID exists when it doesn't)
// False negative rate: 0% (NEVER says ID doesn't exist when it does)

let userBloomFilter: BloomFilter;
let castingBloomFilter: BloomFilter;
let profileBloomFilter: BloomFilter;

// Initialize bloom filters
export const initBloomFilters = async (db: any) => {
  console.log('Initializing Bloom Filters...');

  // Create bloom filters
  // Parameters: (expected items, error rate)
  userBloomFilter = BloomFilter.create(100000, 0.01);     // 100k users, 1% error
  castingBloomFilter = BloomFilter.create(50000, 0.01);   // 50k castings
  profileBloomFilter = BloomFilter.create(100000, 0.01);  // 100k profiles

  try {
    // Load existing IDs from Firestore into bloom filters
    // Run once on server startup
    
    const [usersSnap, castingsSnap, profilesSnap] = await Promise.all([
      db.collection('users').select().get(),       // only get IDs
      db.collection('casting_calls').select().get(),
      db.collection('profiles').select().get(),
    ]);

    usersSnap.docs.forEach((doc: any) => {
      userBloomFilter.add(doc.id);
    });
    castingsSnap.docs.forEach((doc: any) => {
      castingBloomFilter.add(doc.id);
    });
    profilesSnap.docs.forEach((doc: any) => {
      profileBloomFilter.add(doc.id);
    });

    console.log(`Bloom Filters loaded:
      Users: ${usersSnap.size}
      Castings: ${castingsSnap.size}
      Profiles: ${profilesSnap.size}
    `);

  } catch (error) {
    console.error('Bloom filter init error:', error);
    // Continue without bloom filter — fallback to cache only
  }
};

// ─── ADD NEW IDS WHEN CREATED ─────────
export const addToBloomFilter = (type: string, id: string) => {
  switch (type) {
    case 'user': userBloomFilter?.add(id); break;
    case 'casting': castingBloomFilter?.add(id); break;
    case 'profile': profileBloomFilter?.add(id); break;
  }
};

// ─── CHECK IF ID MIGHT EXIST ──────────
export const mightExist = (type: string, id: string): boolean => {
  switch (type) {
    case 'user': return userBloomFilter?.has(id) ?? true;
    case 'casting': return castingBloomFilter?.has(id) ?? true;
    case 'profile': return profileBloomFilter?.has(id) ?? true;
    default: return true; // if unknown type, allow through
  }
};

// ─── CACHE OPERATIONS ─────────────────
export const getFromCache = <T>(key: string): T | undefined => {
  return cache.get<T>(key);
};

export const setInCache = (
  key: string, 
  value: any, 
  ttlSeconds?: number
) => {
  if (ttlSeconds !== undefined) {
    cache.set(key, value, ttlSeconds);
  } else {
    cache.set(key, value);
  }
};

export const deleteFromCache = (key: string) => {
  cache.del(key);
};

export const deleteFromCacheByPattern = (pattern: string) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(k => k.includes(pattern));
  cache.del(matchingKeys);
};

// Cache a "null" result for non-existent items
// Prevents repeated DB hits for same fake ID
export const cacheNullResult = (key: string) => {
  cache.set(key, null, 60); // cache "not found" for 1 minute
};

export { cache };
