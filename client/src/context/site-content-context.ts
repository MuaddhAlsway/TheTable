import { createContext } from 'react';
export type ContentValues = Record<string, string>;
export const SiteContentContext = createContext<{ values: ContentValues; refresh: () => void }>({ values: {}, refresh: () => {} });
export function contentKey(value: string) { let hash = 2166136261; for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619); return (hash >>> 0).toString(36); }
