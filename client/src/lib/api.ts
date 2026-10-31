import type { ApiResult } from './api-types';
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '';
export const API_CONFIGURED = /^https?:\/\//.test(API_URL);
export class ApiError extends Error {
  code: string;
  status: number;
  fields: { path: string; message: string }[];
  constructor(message: string, code = 'API_ERROR', status = 0, fields: { path: string; message: string }[] = []) { super(message); this.code = code; this.status = status; this.fields = fields; }
}
type Options = { method?: string; token?: string | null; body?: unknown; signal?: AbortSignal; headers?: Record<string, string> };
export async function apiRequest<T>(path: string, options: Options = {}): Promise<ApiResult<T>> {
  if (!API_CONFIGURED) throw new ApiError('The restaurant API has not been configured.', 'API_SETUP_REQUIRED');
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, { method: options.method || 'GET', signal: controller.signal, headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...options.headers }, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) });
    if (response.status === 204) return { data: undefined as T };
    let json: { data?: T; pagination?: ApiResult<T>['pagination']; message?: string; error?: { message?: string; code?: string; fields?: { path: string; message: string }[] } };
    try { json = await response.json(); } catch (error) { if (controller.signal.aborted) throw error; throw new ApiError('The service returned an invalid response.', 'INVALID_RESPONSE', response.status); }
    if (!response.ok) throw new ApiError(json.error?.message || 'The request could not be completed.', json.error?.code, response.status, json.error?.fields);
    return json as ApiResult<T>;
  } catch (error) {
    if (timedOut) throw new ApiError('The restaurant service took too long to respond. Please try again.', 'REQUEST_TIMEOUT');
    if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    if (error instanceof ApiError) throw error;
    throw new ApiError('Unable to reach the restaurant service. Please try again.', 'NETWORK_ERROR');
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel); }
}
