import { infobipGateway, infobipConfigured } from './sms.infobip.js';
import { GatewayError } from './sms.types.js';
export { GatewayError } from './sms.types.js';
import { env } from '../../config/env.js';
const androidConfigured = () => !!((env.SMS_GATEWAY_TOKEN?.trim() || (env.SMS_GATEWAY_USERNAME?.trim() && env.SMS_GATEWAY_PASSWORD?.trim())) && env.SMS_GATEWAY_DEVICE_ID?.trim());
export const smsConfigured = () => env.SMS_PROVIDER === 'infobip' ? infobipConfigured() : androidConfigured();
export const smsReady = () => env.SMS_ENABLED === 'true' && smsConfigured();
type Message = { id: string; state: string; deviceId?: string; recipients?: { phoneNumber?: string; state?: string }[] };
async function request(path: string, body?: unknown): Promise<unknown> {
  if (!smsConfigured()) throw new GatewayError('GATEWAY_SETUP_REQUIRED', false);
  try {
    const response = await fetch('https://api.sms-gate.app/3rdparty/v1' + path, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: env.SMS_GATEWAY_TOKEN?.trim() ? 'Bearer ' + env.SMS_GATEWAY_TOKEN : 'Basic ' + Buffer.from(env.SMS_GATEWAY_USERNAME + ':' + env.SMS_GATEWAY_PASSWORD).toString('base64'), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new GatewayError('GATEWAY_HTTP_' + response.status, response.status === 404 || response.status === 409 || response.status === 429 || response.status >= 500);
    return await response.json();
  } catch (error) { if (error instanceof GatewayError) throw error; throw new GatewayError('GATEWAY_RESPONSE_UNKNOWN'); }
}
function message(value: unknown, id: string): Message {
  const data = value as Message;
  if (!data || data.id !== id || !['Pending', 'Processed', 'Sent', 'Delivered', 'Failed', 'Cancelled', 'Cancelling'].includes(data.state)) throw new GatewayError('GATEWAY_INVALID_RESPONSE');
  return data;
}
const androidGateway = {
  async check() { const devices = await request('/devices'); if (!Array.isArray(devices) || !devices.some(device => device.id === env.SMS_GATEWAY_DEVICE_ID)) throw new GatewayError('DEVICE_NOT_REGISTERED', false); return { connected: true }; },
  async get(id: string) { return message(await request('/messages/' + encodeURIComponent(id)), id); },
  async send(id: string, recipient: string, text: string, ttl: number) { return message(await request('/messages', { id, deviceId: env.SMS_GATEWAY_DEVICE_ID, simNumber: env.SMS_GATEWAY_SIM_NUMBER, phoneNumbers: [recipient], textMessage: { text }, withDeliveryReport: true, ttl }), id); },
};

export const smsGateway = {
  check: () => env.SMS_PROVIDER === 'infobip' ? infobipGateway.check() : androidGateway.check(),
  get: (id: string) => env.SMS_PROVIDER === 'infobip' ? infobipGateway.get(id) : androidGateway.get(id),
  send: (id: string, recipient: string, text: string, ttl: number) => env.SMS_PROVIDER === 'infobip' ? infobipGateway.send(id, recipient, text, ttl) : androidGateway.send(id, recipient, text, ttl),
};
