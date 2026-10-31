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
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, { method: options.method || 'GET', signal: options.signal, headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...options.headers }, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) }); }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw error; throw new ApiError('Unable to reach the restaurant service. Please try again.', 'NETWORK_ERROR'); }
  if (response.status === 204) return { data: undefined as T };
  let json: { data?: T; pagination?: ApiResult<T>['pagination']; message?: string; error?: { message?: string; code?: string; fields?: { path: string; message: string }[] } };
  try { json = await response.json(); } catch { throw new ApiError('The service returned an invalid response.', 'INVALID_RESPONSE', response.status); }
  if (!response.ok) throw new ApiError(json.error?.message || 'The request could not be completed.', json.error?.code, response.status, json.error?.fields);
  return json as ApiResult<T>;
}
