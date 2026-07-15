import { BloomFilter } from 'bloom-filters';
import NodeCache from 'node-cache';



const cache = new NodeCache({
  stdTTL: 300,        
  checkperiod: 60,    
  maxKeys: 10000,     
});







let userBloomFilter: BloomFilter;
let castingBloomFilter: BloomFilter;
let profileBloomFilter: BloomFilter;


export const initBloomFilters = async (db: any) => {
  console.log('Initializing Bloom Filters...');

  
  
  userBloomFilter = BloomFilter.create(100000, 0.01);     
  castingBloomFilter = BloomFilter.create(50000, 0.01);   
  profileBloomFilter = BloomFilter.create(100000, 0.01);  

  try {
    
    
    
    const [usersSnap, castingsSnap, profilesSnap] = await Promise.all([
      db.collection('users').select().get(),       
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
    
  }
};


export const addToBloomFilter = (type: string, id: string) => {
  switch (type) {
    case 'user': userBloomFilter?.add(id); break;
    case 'casting': castingBloomFilter?.add(id); break;
    case 'profile': profileBloomFilter?.add(id); break;
  }
};


export const mightExist = (type: string, id: string): boolean => {
  switch (type) {
    case 'user': return userBloomFilter?.has(id) ?? true;
    case 'casting': return castingBloomFilter?.has(id) ?? true;
    case 'profile': return profileBloomFilter?.has(id) ?? true;
    default: return true; 
  }
};


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


export const deleteFromCacheByPattern = (pattern: string) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(k => k.includes(pattern));
  cache.del(matchingKeys);
};



export const cacheNullResult = (key: string) => {
  cache.set(key, null, 60); 
};

export { cache };
