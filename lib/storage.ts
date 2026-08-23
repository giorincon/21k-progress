import type { AppData } from './types';
import { demoData } from './demo';
const KEY = '21k-progress-data-v1';
export function loadLocal(): AppData {
  if (typeof window === 'undefined') return demoData;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : demoData;
  } catch { return demoData; }
}
export function saveLocal(data: AppData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function resetDemo() {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(demoData));
  return demoData;
}
