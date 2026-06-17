/**
 * NC Network — Single source of truth for all category definitions.
 * Import from here in EVERY component. Never define category icons/colors inline.
 * To change an icon or color → change it ONCE here, updates everywhere.
 *
 * NOTE: icons are resolved at runtime via CATEGORY_ICON_MAP (CategoryIcons.jsx)
 * so this file stays as plain .ts with no JSX/React import needed.
 */

export interface CategoryConfig {
  id: string;
  label: string;
  /** Component reference — populated at runtime by getCategoryConfig() */
  icon: any;
  color: string;
  bgColor: string;
}

export const CATEGORY_META: Omit<CategoryConfig, 'icon'>[] = [
  { id: 'Actors',    label: 'Actors',    color: '#0099FF', bgColor: 'rgba(0,153,255,0.10)' },
  { id: 'Directors', label: 'Directors', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.10)' },
  { id: 'Models',    label: 'Models',    color: '#EC4899', bgColor: 'rgba(236,72,153,0.10)' },
  { id: 'Dancers',   label: 'Dancers',   color: '#10B981', bgColor: 'rgba(16,185,129,0.10)' },
  { id: 'Musicians', label: 'Musicians', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.10)' },
  { id: 'Voice Over',label: 'Voice Over',color: '#06B6D4', bgColor: 'rgba(6,182,212,0.10)' },
  { id: 'VFX',       label: 'VFX',       color: '#3B82F6', bgColor: 'rgba(59,130,246,0.10)' },
  { id: 'Writers',   label: 'Writers',   color: '#EF4444', bgColor: 'rgba(239,68,68,0.10)' },
];

/** Array of category id strings */
export const CATEGORIES = CATEGORY_META.map((c) => c.id);

/** Quick color lookup — no icon needed */
export const getCategoryColor = (nameOrId: string): string => {
  const found = CATEGORY_META.find(
    (c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase()
  );
  return found?.color ?? '#00BFFF';
};

/** Quick bgColor lookup */
export const getCategoryBgColor = (nameOrId: string): string => {
  const found = CATEGORY_META.find(
    (c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase()
  );
  return found?.bgColor ?? 'rgba(0,191,255,0.10)';
};

/**
 * getCategoryConfig — returns color + bgColor.
 * The `icon` field is injected by callers via CATEGORY_ICON_MAP from CategoryIcons.jsx.
 * This avoids importing JSX into a .ts file.
 */
export const getCategoryMeta = (nameOrId: string) => {
  const found = CATEGORY_META.find(
    (c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase()
  );
  return found ?? { id: nameOrId, label: nameOrId, color: '#00BFFF', bgColor: 'rgba(0,191,255,0.10)' };
};
