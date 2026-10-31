import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, API_CONFIGURED } from '../lib/api';
import { SiteContentContext, type ContentValues } from './site-content-context';
export default function SiteContentProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<ContentValues>({});
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    if (!API_CONFIGURED) return;
    const controller = new AbortController();
    void apiRequest<{ values: ContentValues }>('/content', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setValues(result.data.values); }).catch(() => { /* Keep working built-in copy if the content service is unavailable. */ });
    return () => controller.abort();
  }, [version]);
  useEffect(() => { const update = () => { if (!document.hidden && navigator.onLine) refresh(); }; const timer = setInterval(update, 60000); window.addEventListener('focus', update); window.addEventListener('online', update); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('online', update); document.removeEventListener('visibilitychange', update); }; }, [refresh]);
  return <SiteContentContext.Provider value={{ values, refresh }}>{children}</SiteContentContext.Provider>;
}
