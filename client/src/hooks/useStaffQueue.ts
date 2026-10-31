import { useEffect, useState } from 'react';
import { useBackendAuth } from './useBackendAuth';
import { ApiError, apiRequest } from '../lib/api';
import type { QueueResponse } from '../lib/api-types';
type Snapshot<T> = { path: string; result: QueueResponse<T> | null; lastUpdated: number | null; error: string; refreshing: boolean; serverOffset: number };
/** One request at a time; pause hidden tabs, abort on unmount, back off failures. */
export function useStaffQueue<T>(path: string) {
  const { getToken } = useBackendAuth();
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ path, result: null, lastUpdated: null, error: '', refreshing: true, serverOffset: 0 });
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync); window.addEventListener('offline', sync);
    return () => { clearInterval(timer); window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);
  useEffect(() => {
    let disposed = false, running = false, forbidden = false, failures = 0, interval = 20000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const schedule = (delay: number) => { clearTimeout(timer); if (!disposed && !forbidden && !document.hidden && navigator.onLine) timer = setTimeout(() => void load(), delay); };
    async function load() {
      if (disposed || running || document.hidden || !navigator.onLine) return;
      running = true; controller = new AbortController();
      const currentController = controller;
      const timeout = setTimeout(() => currentController.abort(), 12000);
      let rejectAborted: (() => void) | undefined;
      const aborted = new Promise<never>((_resolve, reject) => { rejectAborted = () => reject(new DOMException('Queue request aborted', 'AbortError')); currentController.signal.addEventListener('abort', rejectAborted, { once: true }); });
      setSnapshot(current => current.path === path ? { ...current, refreshing: true } : { path, result: null, lastUpdated: null, error: '', refreshing: true, serverOffset: 0 });
      try {
        const request = async () => {
          const token = await getToken();
          if (currentController.signal.aborted) throw new DOMException('Queue request aborted', 'AbortError');
          return apiRequest<T>(path, { token, signal: currentController.signal });
        };
        const response = await Promise.race([request(), aborted]) as QueueResponse<T>;
        if (!disposed) {
          interval = Math.max(10, Math.min(120, response.operations.pollIntervalSeconds)) * 1000; failures = 0;
          const timestamp = Date.now(); const serverTime = Date.parse(response.serverTime);
          setSnapshot({ path, result: response, lastUpdated: timestamp, error: '', refreshing: false, serverOffset: Number.isFinite(serverTime) ? serverTime - timestamp : 0 }); setNow(timestamp);
        }
      } catch (error) {
        if (!disposed) {
          failures++;
          forbidden = error instanceof ApiError && (error.status === 401 || error.status === 403);
          const message = currentController.signal.aborted ? 'The request timed out. Displayed records may be out of date.' : error instanceof Error ? error.message : 'Unable to refresh the queue.';
          setSnapshot(current => ({ path, result: current.path === path && !forbidden ? current.result : null, lastUpdated: current.path === path && !forbidden ? current.lastUpdated : null, serverOffset: current.serverOffset, error: message, refreshing: false }));
        }
      } finally { clearTimeout(timeout); if (rejectAborted) currentController.signal.removeEventListener('abort', rejectAborted); running = false; schedule(Math.min(120000, interval * 2 ** Math.min(failures, 3))); }
    }
    const resume = () => { if (!document.hidden && navigator.onLine) schedule(0); else clearTimeout(timer); };
    document.addEventListener('visibilitychange', resume); window.addEventListener('online', resume); window.addEventListener('offline', resume);
    void load();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); window.removeEventListener('offline', resume); };
  }, [path, getToken, version]);
  const view = snapshot.path === path ? snapshot : null;
  const staleAfter = view?.result?.operations.staleAfterSeconds || 60;
  return { result: view?.result || null, lastUpdated: view?.lastUpdated || null, initialLoading: !view || (!view.result && view.refreshing), refreshing: !view || view.refreshing, error: view?.error || '', stale: !online || !!view?.error || !view?.lastUpdated || now - view.lastUpdated >= staleAfter * 1000, online, now: now + (view?.serverOffset || 0), refresh: () => setVersion(v => v + 1) };
}

