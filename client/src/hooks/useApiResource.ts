import { useEffect, useState } from 'react';
import { useBackendAuth } from './useBackendAuth';
import { apiRequest } from '../lib/api';
import type { ApiResult } from '../lib/api-types';
type Snapshot<T> = { key: string; result: ApiResult<T> | null; loading: boolean; error: string };
export function useApiResource<T>(path: string | null, options: { pollIntervalMs?: number } = {}) {
  const { getToken, userId } = useBackendAuth();
  const key = `${userId || 'guest'}:${path || ''}`;
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ key, result: null, loading: !!path, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let rejectAborted: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => { rejectAborted = () => reject(new DOMException('Request aborted', 'AbortError')); controller.signal.addEventListener('abort', rejectAborted, { once: true }); });
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 20000);
    async function load() {
      setSnapshot(current => ({ key, result: current.key === key ? current.result : null, loading: true, error: '' }));
      try {
        const request = async () => { const token = await getToken(); if (controller.signal.aborted) throw new DOMException('Request aborted', 'AbortError'); return apiRequest<T>(path!, { token, signal: controller.signal }); };
        const data = await Promise.race([request(), aborted]);
        if (active) setSnapshot({ key, result: data, loading: false, error: '' });
      } catch (error) {
        if (active) setSnapshot({ key, result: null, loading: false, error: controller.signal.aborted ? 'The service took too long to respond. Please try again.' : error instanceof Error ? error.message : 'Unable to load records.' });
      } finally { clearTimeout(timeout); if (rejectAborted) controller.signal.removeEventListener('abort', rejectAborted); }
    }
    void load();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [path, getToken, key, version]);
  const loading = snapshot.key === key ? snapshot.loading : !!path;
  const pollInterval = options.pollIntervalMs || 0;
  useEffect(() => {
    if (!path || !pollInterval || loading) return;
    const refresh = () => { if (!document.hidden && navigator.onLine) setVersion(value => value + 1); };
    const timer = setInterval(refresh, Math.max(5000, pollInterval));
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [path, pollInterval, loading]);
  return { result: snapshot.key === key ? snapshot.result : null, loading, error: snapshot.key === key ? snapshot.error : '', reload: () => setVersion(value => value + 1) };
}
