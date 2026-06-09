import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const pathLabels: Record<string, string> = {
  '': 'Home',
  'talents': 'Talents',
  'profile': 'Profiles',
  'casting': 'Casting Calls',
  'premium': 'Premium Membership',
  'privacy': 'Privacy Policy',
  'terms': 'Terms of Service',
  'trust-safety': 'Trust & Safety',
  'signin': 'Sign In',
  'signup': 'Sign Up',
  'create': 'Create',
  'messages': 'Messages',
  'notifications': 'Notifications',
  'settings': 'Settings',
  'admin': 'Admin Overview',
  'users': 'Users',
  'analytics': 'Analytics',
  'content': 'Content',
  'pro': 'Pro Members',
  'moderation': 'Moderation',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't render breadcrumbs on home
  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#555] select-none">
      <Link to="/" className="hover:text-white transition-colors">
        Home
      </Link>
      
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;

        // Determine the label
        let label = pathLabels[value];
        if (!label) {
          // Fallback for dynamic IDs:
          const parent = pathnames[index - 1];
          if (parent === 'casting') {
            label = 'Audition Detail';
          } else if (parent === 'profile') {
            label = 'Talent Profile';
          } else {
            label = 'Detail';
          }
        }

        return (
          <React.Fragment key={to}>
            <span className="text-[#333] font-normal">/</span>
            {last ? (
              <span className="text-nc-accent font-black tracking-widest">{label}</span>
            ) : (
              <Link to={to} className="hover:text-white transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
