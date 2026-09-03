/**
 * Intelligent Route & Chunk Pre-fetching Utility
 * Preloads route JS, CSS bundles, and Firestore documents on hover/touch before user clicks
 */

const routeLoaders: Record<string, () => Promise<any>> = {
  home: () => import('../pages/Home'),
  casting: () => import('../features/casting/CastingCall'),
  'casting-detail': () => import('../features/casting/CastingCallDetail'),
  'casting-create': () => import('../features/casting/CastingCallCreate'),
  'saved-casting': () => import('../features/casting/SavedCastingCalls'),
  messages: () => import('../features/messages/MessagesPage'),
  settings: () => import('../features/settings/SettingsPage'),
  profile: () => import('../features/profile/ProfilePage'),
  'profile-create': () => import('../features/profile/ProfileCreate'),
  trending: () => import('../pages/Trending'),
  listing: () => import('../pages/TalentListing'),
  notifications: () => import('../features/notifications/Notifications'),
  applications: () => import('../features/casting/ApplicationsPage'),
  about: () => import('../pages/About'),
  contact: () => import('../pages/Contact'),
  help: () => import('../pages/Help'),
};

const prefetched = new Set<string>();
const prefetchedProfiles = new Set<string>();

export function prefetchRoute(route: string): void {
  if (!route) return;
  const key = route.toLowerCase().replace(/^\//, '');
  if (prefetched.has(key)) return;

  const loader = routeLoaders[key];
  if (typeof loader === 'function') {
    prefetched.add(key);
    loader().catch(() => {
      prefetched.delete(key);
    });
  }
}

/**
 * Pre-warms both the profile route code chunk AND the Firestore profile document
 * so clicking the card renders the profile page with 0ms perceived latency
 */
export function prefetchProfile(userId: string): void {
  if (!userId || prefetchedProfiles.has(userId)) return;
  prefetchedProfiles.add(userId);
  prefetchRoute('profile');

  // Pre-warm the profile document cache asynchronously
  import('../features/profile/services/profile')
    .then(({ subscribeToProfile }) => {
      const unsub = subscribeToProfile(userId, () => {});
      // Auto-cleanup prewarm listener after 8 seconds
      setTimeout(() => {
        try {
          unsub();
        } catch {
          // ignore prewarm cleanup
        }
      }, 8000);
    })
    .catch(() => {
      // ignore import failure
    });
}

/**
 * Pre-warms casting detail route code chunk
 */
export function prefetchCasting(_callId?: string): void {
  prefetchRoute('casting-detail');
}

/**
 * Helper props to attach to interactive elements
 */
export function getPrefetchProps(route: string) {
  return {
    onMouseEnter: () => prefetchRoute(route),
    onFocus: () => prefetchRoute(route),
    onTouchStart: () => prefetchRoute(route),
  };
}
