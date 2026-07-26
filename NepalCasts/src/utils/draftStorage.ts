import { useState, useEffect } from 'react';

export interface DraftEntry<T> {
  data: T;
  savedAt: number;
}

const DRAFT_PREFIX = 'nc_draft_';

export function saveDraft<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: DraftEntry<T> = {
      data,
      savedAt: Date.now(),
    };
    localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(entry));
  } catch (err) {
    console.warn('Failed to save draft to local storage:', err);
  }
}

export function loadDraft<T>(key: string, ttlMs: number = 7 * 24 * 60 * 60 * 1000): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!raw) return null;
    const entry: DraftEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.savedAt > ttlMs) {
      clearDraft(key);
      return null;
    }
    return entry.data;
  } catch (err) {
    console.warn('Failed to load draft from local storage:', err);
    return null;
  }
}

export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
  } catch (err) {
    console.warn('Failed to clear draft from local storage:', err);
  }
}

export function useDraftState<T>(key: string, initialValue: T, debounceMs: number = 500): [T, (val: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    const saved = loadDraft<T>(key);
    return saved !== null ? saved : initialValue;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(key, state);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [key, state, debounceMs]);

  const clear = () => {
    clearDraft(key);
    setState(initialValue);
  };

  return [state, setState, clear];
}
