/**
 * NC Network — Custom Category Icons
 * Premium monochrome SVG icons for the talent marketplace.
 * Designed with consistent thin-to-medium line weight, neon blue accent, 
 * and modern entertainment-industry aesthetics.
 *
 * Each icon accepts standard SVG props (size, className, strokeWidth, etc.)
 */

const defaultProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// ─── 1. Actors → Spotlight ──────────────────────────────────────────────────
export const SpotlightIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <line x1="12" y1="1.5" x2="12" y2="3.8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M9.2 3.8h5.6l1.1 2.2H8.1l1.1-2.2z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8.1 6L4.5 19h15L15.9 6" stroke="currentColor" strokeWidth="1.5" />
    <line x1="3.5" y1="19" x2="20.5" y2="19" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="16.5" r="1.3" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
  </svg>
);

// ─── 2. Directors → Film Reel ───────────────────────────────────────────────
export const FilmReelIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="5.5" r="1.35" stroke="currentColor" strokeWidth="1.15" />
    <circle cx="12" cy="18.5" r="1.35" stroke="currentColor" strokeWidth="1.15" />
    <circle cx="5.5" cy="12" r="1.35" stroke="currentColor" strokeWidth="1.15" />
    <circle cx="18.5" cy="12" r="1.35" stroke="currentColor" strokeWidth="1.15" />
    <line x1="12" y1="6.85" x2="12" y2="9.6" stroke="currentColor" strokeWidth="0.9" />
    <line x1="12" y1="14.4" x2="12" y2="17.15" stroke="currentColor" strokeWidth="0.9" />
    <line x1="6.85" y1="12" x2="9.6" y2="12" stroke="currentColor" strokeWidth="0.9" />
    <line x1="14.4" y1="12" x2="17.15" y2="12" stroke="currentColor" strokeWidth="0.9" />
  </svg>
);

// ─── 3. Models → Aperture ───────────────────────────────────────────────────
export const ApertureIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 3.2l2.8 6.5" stroke="currentColor" strokeWidth="1.35" />
    <path d="M19.8 7.8L14 10.8" stroke="currentColor" strokeWidth="1.35" />
    <path d="M19.8 16.2L13.5 13.2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M12 20.8l-2.8-6.5" stroke="currentColor" strokeWidth="1.35" />
    <path d="M4.2 16.2L10 13.2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M4.2 7.8l5.8 3" stroke="currentColor" strokeWidth="1.35" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" opacity="0.4" />
  </svg>
);

// ─── 4. Dancers → Dynamic Motion ────────────────────────────────────────────
export const DynamicMotionIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 6v6.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 8.5L7.2 5.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 8.5l5.5 1.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 12.5L7.5 19.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 12.5L18 16" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5.2 7.2a5 5 0 0 1 0-3.5" stroke="currentColor" strokeWidth="0.95" opacity="0.35" />
    <path d="M19.5 12.5a5 5 0 0 1-1.2 3" stroke="currentColor" strokeWidth="0.95" opacity="0.35" />
    <path d="M19.8 17.5a4 4 0 0 1-2 2" stroke="currentColor" strokeWidth="0.95" opacity="0.25" />
  </svg>
);

// ─── 5. Musicians → Audio Equalizer ─────────────────────────────────────────
export const EqualizerIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <rect x="2.5" y="11" width="2.4" height="7.5" rx="1.2" stroke="currentColor" strokeWidth="1.25" />
    <rect x="6.7" y="7" width="2.4" height="11.5" rx="1.2" stroke="currentColor" strokeWidth="1.25" />
    <rect x="10.9" y="4.5" width="2.4" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.25" />
    <rect x="15.1" y="8.5" width="2.4" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.25" />
    <rect x="19.3" y="6" width="2.4" height="12.5" rx="1.2" stroke="currentColor" strokeWidth="1.25" />
    <line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
  </svg>
);

// ─── 6. Voice Over → Headphones ─────────────────────────────────────────────
export const HeadphonesIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <path d="M4.5 13.5C4.5 8.8 7.86 5 12 5s7.5 3.8 7.5 8.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2.5" y="13.5" width="4" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <rect x="17.5" y="13.5" width="4" height="6.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 20v1.8c0 .65.55 1.2 1.2 1.2h2" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="10.7" cy="23" r="1.1" stroke="currentColor" strokeWidth="1.05" />
  </svg>
);

// ─── 7. VFX → Stacked Layers ────────────────────────────────────────────────
export const StackedLayersIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <path d="M2 16.5l10 4.5 10-4.5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    <path d="M2 12.5l10 4.5 10-4.5" stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
    <path d="M2 8.5l10 4.5 10-4.5L12 4 2 8.5z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 8.5l2-1 2 1-2 1-2-1z" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
  </svg>
);

// ─── 8. Writers → Open Book ─────────────────────────────────────────────────
export const OpenBookIcon = ({ size = 24, className, ...rest }) => (
  <svg {...defaultProps} viewBox="0 0 24 24" width={size} height={size} className={className} {...rest}>
    <path d="M12 6v15" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 6C10.8 4.8 8 4 3.5 4v15c4.5 0 7.2.6 8.5 2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 6c1.2-1.2 4-2 8.5-2v15c-4.5 0-7.2.6-8.5 2" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6" y1="8.5" x2="10" y2="8.5" stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
    <line x1="6" y1="11" x2="9.5" y2="11" stroke="currentColor" strokeWidth="0.9" opacity="0.3" />
    <line x1="6" y1="13.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="0.9" opacity="0.22" />
    <line x1="14" y1="8.5" x2="18" y2="8.5" stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
    <line x1="14" y1="11" x2="17.5" y2="11" stroke="currentColor" strokeWidth="0.9" opacity="0.3" />
    <line x1="14" y1="13.5" x2="18" y2="13.5" stroke="currentColor" strokeWidth="0.9" opacity="0.22" />
  </svg>
);

export const CATEGORY_ICON_MAP = {
  'actor': SpotlightIcon,
  'director': FilmReelIcon,
  'model': ApertureIcon,
  'dancer': DynamicMotionIcon,
  'musician': EqualizerIcon,
  'voiceover': HeadphonesIcon,
  'vfx': StackedLayersIcon,
  'writer': OpenBookIcon,
};

