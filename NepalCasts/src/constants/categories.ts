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
        if (filterClean === 'actor' && (val === 'actor' || val === 'actress' || val.includes('actor') || val.includes('actress'))) return true;
        if (filterClean === 'model' && (val === 'model' || val === 'modeling' || val === 'modelling' || val.includes('model'))) return true;
        if (filterClean === 'voiceover' && (val === 'voice over' || val === 'voiceover' || val.includes('voice'))) return true;
        if (filterClean === 'vfx' && (val === 'vfx' || val.includes('vfx') || val.includes('visual effects'))) return true;
        return val.includes(filterClean) || filterClean.includes(val);
    };

    return valuesToCheck.some((val) => isMatch(val));
};
