/**
 * NC Network — category constants re-export.
 * getCategoryConfig merges color/bgColor from the plain TS config
 * with the icon from CategoryIcons.jsx — keeping JSX out of .ts files.
 */
import { CATEGORY_META, CATEGORIES, getCategoryColor, getCategoryBgColor, getCategoryMeta } from '../config/categories';
import { CATEGORY_ICON_MAP } from '../components/icons/CategoryIcons';

export { CATEGORIES, getCategoryColor, getCategoryBgColor };
export type { CategoryConfig } from '../config/categories';

/**
 * Returns the full config object for a category including its icon component.
 * Safe to call from any .jsx or .tsx file.
 */
export const getCategoryConfig = (nameOrId: string) => {
  const meta = getCategoryMeta(nameOrId);
  const icon = (CATEGORY_ICON_MAP as any)[meta.id] ?? (CATEGORY_ICON_MAP as any)['actor'];
  return { ...meta, icon };
};

/** Legacy full config array — includes icon components */
export const CATEGORY_CONFIG = CATEGORY_META.map((meta) => ({
  ...meta,
  icon: (CATEGORY_ICON_MAP as any)[meta.id],
}));
