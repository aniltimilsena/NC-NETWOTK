export interface CategoryConfig {
    id: string;
    label: string;
    pluralLabel: string;
    icon: any;
    color: string;
    bgColor: string;
}
export const CATEGORY_META: Omit<CategoryConfig, 'icon'>[] = [
    { id: 'actor', label: 'Actor', pluralLabel: 'Actors', color: '#0099FF', bgColor: 'rgba(0,153,255,0.10)' },
    { id: 'model', label: 'Model', pluralLabel: 'Models', color: '#EC4899', bgColor: 'rgba(236,72,153,0.10)' },
    { id: 'director', label: 'Director', pluralLabel: 'Directors', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.10)' },
    { id: 'dancer', label: 'Dancer', pluralLabel: 'Dancers', color: '#10B981', bgColor: 'rgba(16,185,129,0.10)' },
    { id: 'musician', label: 'Musician', pluralLabel: 'Musicians', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.10)' },
    { id: 'voiceover', label: 'Voice Over', pluralLabel: 'Voice Overs', color: '#06B6D4', bgColor: 'rgba(6,182,212,0.10)' },
    { id: 'vfx', label: 'VFX', pluralLabel: 'VFX', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.10)' },
    { id: 'writer', label: 'Writer', pluralLabel: 'Writers', color: '#EF4444', bgColor: 'rgba(239,68,68,0.10)' },
];
export const CATEGORIES = CATEGORY_META.map((c) => c.id);
export const getCategoryColor = (nameOrId: string): string => {
    const found = CATEGORY_META.find((c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase());
    return found?.color ?? '#00BFFF';
};
export const getCategoryBgColor = (nameOrId: string): string => {
    const found = CATEGORY_META.find((c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase());
    return found?.bgColor ?? 'rgba(0,191,255,0.10)';
};
export const getCategoryMeta = (nameOrId: string) => {
    const found = CATEGORY_META.find((c) => c.id.toLowerCase() === (nameOrId ?? '').toLowerCase());
    return found ?? { id: nameOrId, label: nameOrId, color: '#00BFFF', bgColor: 'rgba(0,191,255,0.10)' };
};
