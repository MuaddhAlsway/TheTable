import { useEffect, useState } from 'react';
import { apiRequest, API_CONFIGURED } from '../lib/api';
import type { ApiMenuItem } from '../lib/api-types';
import { menuItems as previewItems, type MenuItem } from '../data/menuItems';
export function useMenuCatalog() {
  const [items, setItems] = useState<MenuItem[]>(API_CONFIGURED ? [] : previewItems);
  const [loading, setLoading] = useState(API_CONFIGURED);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!API_CONFIGURED) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const records: ApiMenuItem[] = [];
        let page = 1, pages = 1;
        do { const result = await apiRequest<ApiMenuItem[]>(`/menu?limit=100&page=${page}`, { signal: controller.signal }); records.push(...result.data); pages = result.pagination?.pages || 1; page++; } while (page <= pages);
        if (!controller.signal.aborted) { setItems(records.map(item => ({ id: item.id, name: item.name, description: item.description, price: item.priceHalalas / 100, category: item.category, image: item.imageUrl, allergens: item.allergens, heroSlide: item.heroSlide, heroImage: item.heroImageUrl, tag: item.tags[0] }))); setError(''); }
      } catch (error) { if (!controller.signal.aborted) { setItems([]); setError(error instanceof Error ? error.message : 'Unable to load menu.'); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [version]);
  return { items, loading, error, connected: API_CONFIGURED, refresh: () => setVersion(v => v + 1) };
}

export type MenuCatalog = ReturnType<typeof useMenuCatalog>;
