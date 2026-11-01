import { env } from '../../config/env.js';
import { GatewayError, type GatewayMessage } from './sms.types.js';
// API_KEY matches the existing server environment; the provider-specific name remains supported.
const infobipApiKey = () => env.API_KEY?.trim() || env.INFOBIP_API_KEY?.trim();
export const infobipConfigured = () => !!(env.INFOBIP_BASE_URL?.trim() && infobipApiKey() && env.INFOBIP_SENDER?.trim());
type Entry = { messageId?: string; status?: { name?: string; groupId?: number } };
async function request(path: string, body?: unknown): Promise<unknown> {
  if (!infobipConfigured()) throw new GatewayError('INFOBIP_SETUP_REQUIRED', false);
  try {
    const response = await fetch(env.INFOBIP_BASE_URL!.replace(/\/$/, '') + path, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: 'App ' + infobipApiKey(), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new GatewayError('INFOBIP_HTTP_' + response.status, response.status === 429 || response.status >= 500);
    return await response.json();
  } catch (error) { if (error instanceof GatewayError) throw error; throw new GatewayError('INFOBIP_RESPONSE_UNKNOWN'); }
}
function parse(entry: Entry | undefined, id: string): GatewayMessage {
  if (!entry || entry.messageId !== id || typeof entry.status?.name !== 'string') throw new GatewayError('INFOBIP_RESPONSE_UNKNOWN');
  const status = entry.status;
  // Operator acceptance is not handset delivery. Only the exact handset result marks delivered.
  const state = status.name === 'DELIVERED_TO_HANDSET' ? 'Delivered' : status.groupId === 3 ? 'Sent' : [2, 4, 5].includes(status.groupId || 0) ? 'Failed' : status.groupId === 1 ? 'Pending' : null;
  if (!state) throw new GatewayError('INFOBIP_RESPONSE_UNKNOWN');
  return { id, state };
}
export const infobipGateway = {
  async check() { const data = await request('/sms/3/logs?limit=1') as { results?: unknown[] }; if (!Array.isArray(data?.results)) throw new GatewayError('INFOBIP_INVALID_RESPONSE'); return { connected: true }; },
  async get(id: string) {
    // Logs can be read repeatedly; delivery reports may be consumed once. Absence is not proof a POST failed.
    const data = await request('/sms/3/logs?messageId=' + encodeURIComponent(id) + '&limit=1') as { results?: Entry[] };
    return parse(data?.results?.find(entry => entry.messageId === id), id);
  },
  async send(id: string, recipient: string, text: string, ttl: number) {
    const data = await request('/sms/3/messages', { messages: [{ sender: env.INFOBIP_SENDER, destinations: [{ to: recipient.replace(/^\+/, ''), messageId: id }], content: { text }, options: { validityPeriod: { amount: Math.max(1, Math.ceil(ttl / 60)), timeUnit: 'MINUTES' } } }] }) as { messages?: Entry[] };
    return parse(data?.messages?.find(entry => entry.messageId === id), id);
  },
};
