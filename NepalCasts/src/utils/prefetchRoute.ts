/**
 * Intelligent Route & Chunk Pre-fetching Utility
 * Preloads route JS and CSS bundles on hover/touch before user clicks
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
 * Helper props to attach to interactive elements
 */
export function getPrefetchProps(route: string) {
  return {
    onMouseEnter: () => prefetchRoute(route),
    onFocus: () => prefetchRoute(route),
    onTouchStart: () => prefetchRoute(route),
  };
}
