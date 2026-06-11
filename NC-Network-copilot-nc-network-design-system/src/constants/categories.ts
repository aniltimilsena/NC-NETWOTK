export const CATEGORIES = [
  "Actors",
  "Directors",
  "Models",
  "Dancers",
  "Musicians",
  "Voice Over",
  "VFX",
  "Writers"
] as const;

export type Category = typeof CATEGORIES[number];
