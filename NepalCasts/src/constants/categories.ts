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
    
    const valuesToCheck: string[] = [];
    if (talent?.role) valuesToCheck.push(String(talent.role).trim().toLowerCase());
    if (talent?.category) valuesToCheck.push(String(talent.category).trim().toLowerCase());
    if (talent?.specialty) valuesToCheck.push(String(talent.specialty).trim().toLowerCase());
    
    if (Array.isArray(talent?.categories)) {
        talent.categories.forEach((c: any) => valuesToCheck.push(String(c).trim().toLowerCase()));
    }
    if (Array.isArray(talent?.skills)) {
        talent.skills.forEach((s: any) => {
            const skillName = typeof s === 'string' ? s : s?.name;
            if (skillName) valuesToCheck.push(String(skillName).trim().toLowerCase());
        });
    }

    const isMatch = (val: string) => {
        if (!val) return false;
        if (val === filterClean) return true;
        if (val === filterClean + 's' || val + 's' === filterClean) return true;
        
        // 1. Actor / Actress
        if (filterClean === 'actor' || filterClean === 'actor/actress') {
            if (val.includes('actor') || val.includes('actress')) return true;
        }
        // 2. Director
        if (filterClean === 'director') {
            if (val.includes('director') || val.includes('directing')) return true;
        }
        // 3. Script Writer
        if (filterClean === 'writer' || filterClean === 'script writer') {
            if (val.includes('writer') || val.includes('script') || val.includes('screenplay') || val.includes('author')) return true;
        }
        // 4. DOP / Cinematographer
        if (filterClean === 'dop' || filterClean === 'cinematographer' || filterClean === 'dop / cinematographer') {
            if (val.includes('dop') || val.includes('cinematograph') || val.includes('camera') || val.includes('videograph')) return true;
        }
        // 5. Model
        if (filterClean === 'model') {
            if (val.includes('model')) return true;
        }
        // 6. Song Writer / Singer
        if (filterClean === 'musician' || filterClean === 'singer' || filterClean === 'song writer' || filterClean === 'song writer / singer') {
            if (val.includes('music') || val.includes('sing') || val.includes('song') || val.includes('vocal') || val.includes('composer') || val.includes('audio')) return true;
        }
        // 7. Editor / VFX
        if (filterClean === 'vfx' || filterClean === 'editor' || filterClean === 'editor / vfx') {
            if (val.includes('edit') || val.includes('vfx') || val.includes('visual effects') || val.includes('animat') || val.includes('cgi') || val.includes('colorist')) return true;
        }
        // 8. Producer / Manager
        if (filterClean === 'producer' || filterClean === 'manager' || filterClean === 'producer / manager') {
            if (val.includes('produc') || val.includes('manage') || val.includes('exec') || val.includes('line producer')) return true;
        }

        return val.includes(filterClean) || filterClean.includes(val);
    };

    return valuesToCheck.some((val) => isMatch(val));
};
