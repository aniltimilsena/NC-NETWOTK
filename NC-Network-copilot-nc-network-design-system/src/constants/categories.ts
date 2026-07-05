
import { CATEGORY_META, CATEGORIES, getCategoryColor, getCategoryBgColor, getCategoryMeta } from '../config/categories';
import { CATEGORY_ICON_MAP } from '../components/icons/CategoryIcons';

export { CATEGORIES, getCategoryColor, getCategoryBgColor };
export type { CategoryConfig } from '../config/categories';


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
