import { CATEGORY_META, CATEGORIES, getCategoryColor, getCategoryBgColor, getCategoryMeta } from '../config/categories';
import { CATEGORY_ICON_MAP } from '../components/icons/CategoryIcons';
export { CATEGORIES, getCategoryColor, getCategoryBgColor };
export type { CategoryConfig } from '../config/categories';
export const getCategoryConfig = (nameOrId: string) => {
    const meta = getCategoryMeta(nameOrId);
    const icon = (CATEGORY_ICON_MAP as any)[meta.id] ?? (CATEGORY_ICON_MAP as any)['actor'];
    return { ...meta, icon };
};
export const CATEGORY_CONFIG = CATEGORY_META.map((meta) => ({
    ...meta,
    icon: (CATEGORY_ICON_MAP as any)[meta.id],
}));
export const matchesCategory = (talent: any, categoryFilter: string): boolean => {
    if (!categoryFilter || categoryFilter === 'All') return true;
    if (talent?.deactivated) return false;
    const filterClean = categoryFilter.trim().toLowerCase();
    
    // Determine the talent's primary role
    const primaryRole = (talent?.role || talent?.category || talent?.specialty || '').trim().toLowerCase();
    if (!primaryRole) return false;

    // 1. Actor / Actress
    if (filterClean === 'actor' || filterClean === 'actor/actress' || filterClean === 'actor / actress') {
        return primaryRole.includes('actor') || primaryRole.includes('actress') || primaryRole === 'acting';
    }
    // 2. Director
    if (filterClean === 'director') {
        return primaryRole.includes('director') || primaryRole.includes('directing');
    }
    // 3. Script Writer
    if (filterClean === 'writer' || filterClean === 'script writer') {
        return primaryRole.includes('writer') || primaryRole.includes('script') || primaryRole.includes('screenplay') || primaryRole.includes('author');
    }
    // 4. DOP / Cinematographer
    if (filterClean === 'dop' || filterClean === 'cinematographer' || filterClean === 'dop / cinematographer') {
        return primaryRole.includes('dop') || primaryRole.includes('cinematograph') || primaryRole.includes('camera') || primaryRole.includes('videograph');
    }
    // 5. Model
    if (filterClean === 'model') {
        return primaryRole.includes('model') || primaryRole.includes('modeling');
    }
    // 6. Song Writer / Singer
    if (filterClean === 'musician' || filterClean === 'singer' || filterClean === 'song writer' || filterClean === 'song writer / singer') {
        return primaryRole.includes('music') || primaryRole.includes('sing') || primaryRole.includes('song') || primaryRole.includes('vocal') || primaryRole.includes('composer');
    }
    // 7. Editor / VFX
    if (filterClean === 'vfx' || filterClean === 'editor' || filterClean === 'editor / vfx') {
        return primaryRole.includes('edit') || primaryRole.includes('vfx') || primaryRole.includes('visual effects') || primaryRole.includes('animat') || primaryRole.includes('colorist');
    }
    // 8. Producer / Manager
    if (filterClean === 'producer' || filterClean === 'manager' || filterClean === 'producer / manager') {
        return primaryRole.includes('produc') || primaryRole.includes('manager');
    }

    return primaryRole === filterClean || primaryRole.includes(filterClean);
};
