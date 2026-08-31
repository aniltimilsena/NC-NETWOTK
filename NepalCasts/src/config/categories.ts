export interface CategoryConfig {
    id: string;
    label: string;
    pluralLabel: string;
    icon?: any;
    color: string;
    bgColor: string;
}
export const CATEGORY_META: Omit<CategoryConfig, 'icon'>[] = [
    { id: 'actor', label: 'Actor', pluralLabel: 'Actors', color: '#72c3be', bgColor: 'rgba(114,195,190,0.15)' },
    { id: 'director', label: 'Director', pluralLabel: 'Directors', color: '#ff1e1e', bgColor: 'rgba(255,30,30,0.15)' },
    { id: 'writer', label: 'Script Writer', pluralLabel: 'Script Writers', color: '#34d399', bgColor: 'rgba(52,211,153,0.15)' },
    { id: 'dop', label: 'DOP / Cinematographer', pluralLabel: 'Cinematographers', color: '#ffb26b', bgColor: 'rgba(255,178,107,0.15)' },
    { id: 'model', label: 'Model', pluralLabel: 'Models', color: '#7c9bf2', bgColor: 'rgba(124,155,242,0.15)' },
    { id: 'musician', label: 'Song Writer / Singer', pluralLabel: 'Singers & Songwriters', color: '#9d71c7', bgColor: 'rgba(157,113,199,0.15)' },
    { id: 'vfx', label: 'Editor / VFX', pluralLabel: 'Editors & VFX', color: '#eab308', bgColor: 'rgba(234,179,8,0.15)' },
    { id: 'producer', label: 'Producer / Manager', pluralLabel: 'Producers & Managers', color: '#ffffff', bgColor: 'rgba(255,255,255,0.15)' },
];
export const CATEGORIES = CATEGORY_META.map((c) => c.id);
export const getCategoryColor = (nameOrId: string): string => {
    const found = CATEGORY_META.find((c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase());
    return found?.color ?? '#ffb400';
};
export const getCategoryBgColor = (nameOrId: string): string => {
    const found = CATEGORY_META.find((c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase());
    return found?.bgColor ?? 'rgba(255,180,0,0.10)';
};
export const getCategoryMeta = (nameOrId: string) => {
    const found = CATEGORY_META.find((c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase());
    return found ?? { id: nameOrId, label: nameOrId, color: '#ffb400', bgColor: 'rgba(255,180,0,0.10)' };
};
