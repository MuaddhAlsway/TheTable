import { useEffect, useState } from 'react';
import { apiRequest, API_CONFIGURED } from '../lib/api';
import type { PublicSettings } from '../lib/api-types';
export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(API_CONFIGURED);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!API_CONFIGURED) return;
    const controller = new AbortController();
    async function load() { setLoading(true); try { const result = await apiRequest<PublicSettings>('/settings', { signal: controller.signal }); if (!controller.signal.aborted) { setSettings(result.data); setError(''); } } catch (error) { if (!controller.signal.aborted) { setSettings(null); setError(error instanceof Error ? error.message : 'Unable to load restaurant settings.'); } } finally { if (!controller.signal.aborted) setLoading(false); } }
    void load(); return () => controller.abort();
  }, [version]);
  useEffect(() => { if (!API_CONFIGURED) return; const timer = setInterval(() => { if (!document.hidden && navigator.onLine) setVersion(value => value + 1); }, 60000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!API_CONFIGURED) return; const refresh = () => { if (!document.hidden && navigator.onLine) setVersion(value => value + 1); }; window.addEventListener('focus', refresh); window.addEventListener('online', refresh); document.addEventListener('visibilitychange', refresh); return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); }; }, []);
  return { settings, loading, error, refresh: () => setVersion(v => v + 1) };
}
