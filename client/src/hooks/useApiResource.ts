import { useEffect, useState } from 'react';
import { useBackendAuth } from './useBackendAuth';
import { apiRequest } from '../lib/api';
import type { ApiResult } from '../lib/api-types';
export function useApiResource<T>(path: string | null) {
  const { getToken } = useBackendAuth();
  const [result, setResult] = useState<ApiResult<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    async function load() { setLoading(true); setError(''); try { const data = await apiRequest<T>(path!, { token: await getToken(), signal: controller.signal }); if (!controller.signal.aborted) setResult(data); } catch (error) { if (!controller.signal.aborted) { setResult(null); setError(error instanceof Error ? error.message : 'Unable to load records.'); } } finally { if (!controller.signal.aborted) setLoading(false); } }
    void load(); return () => controller.abort();
  }, [path, getToken, version]);
  return { result, loading, error, reload: () => setVersion(v => v + 1) };
}
