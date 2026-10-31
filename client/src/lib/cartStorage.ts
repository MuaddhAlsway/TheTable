import type { CartLine } from '../context/cart-context';
import { menuCategories, type MenuItem, type MenuCategory } from '../data/menuItems';
export const GUEST_CART_KEY = 'thetable:cart:v1:guest';
export const accountCartKey = (userId: string) => `thetable:cart:v1:user:${userId}`;
function validImage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}
function parseLine(value: unknown): CartLine | null {
  if (!value || typeof value !== 'object') return null;
  const line = value as Record<string, unknown>;
  if (!Number.isInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > 99 || !line.item || typeof line.item !== 'object') return null;
  const item = line.item as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id || item.id.length > 160 || typeof item.name !== 'string' || !item.name || item.name.length > 120 || typeof item.description !== 'string' || item.description.length > 2000 || typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 || item.category === 'All' || !menuCategories.includes(item.category as MenuCategory) || !validImage(item.image)) return null;
  const safeItem: MenuItem = { id: item.id, name: item.name, description: item.description, price: item.price, category: item.category as MenuItem['category'], image: item.image, ...(typeof item.tag === 'string' ? { tag: item.tag.slice(0, 80) } : {}) };
  return { item: safeItem, quantity: Number(line.quantity) };
}
export function mergeCartLines(own: CartLine[], incoming: CartLine[]): CartLine[] {
  const map = new Map(own.map(line => [line.item.id, line]));
  for (const line of incoming) { const existing = map.get(line.item.id); map.set(line.item.id, existing ? { ...existing, quantity: Math.min(99, existing.quantity + line.quantity) } : line); }
  return [...map.values()].slice(0, 50);
}
export function readCart(key: string | null): CartLine[] {
  if (!key || typeof window === 'undefined') return [];
  try {
    const record: unknown = JSON.parse(window.localStorage.getItem(key) || 'null');
    if (!record || typeof record !== 'object') return [];
    const { version, items } = record as { version?: unknown; items?: unknown };
    if (version !== 1 || !Array.isArray(items)) return [];
    const lines = items.slice(0, 50).map(parseLine).filter((line): line is CartLine => line !== null);
    return mergeCartLines([], lines);
  } catch { return []; }
}
export function writeCart(key: string, items: CartLine[], importGuest: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ version: 1, items }));
    if (importGuest && key !== GUEST_CART_KEY) window.localStorage.removeItem(GUEST_CART_KEY);
  } catch { /* Keep the in-memory cart usable if browser storage is unavailable. */ }
}
