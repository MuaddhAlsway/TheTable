import assert from 'node:assert/strict';
Object.assign(process.env, { NODE_ENV: 'test', API_KEY: '', SMS_PROVIDER: 'infobip', SMS_ENABLED: 'false', INFOBIP_BASE_URL: 'https://fixture.api.infobip.com', INFOBIP_API_KEY: 'fixture-not-real', INFOBIP_SENDER: 'TEST' });
const { smsGateway, smsConfigured, smsReady, GatewayError } = await import('../src/modules/sms/sms.gateway.js');
const { env } = await import('../src/config/env.js');
const original = globalThis.fetch;
const calls: { url: string; method: string; body?: any }[] = [];
let code = 200;
let reply: unknown = { results: [] };
globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
  assert.ok(String(url).startsWith('https://fixture.api.infobip.com/sms/3/'));
  assert.equal((options!.headers as Record<string,string>).Authorization, 'App ' + (env.API_KEY?.trim() || 'fixture-not-real'));
  assert.equal(options!.redirect, 'error');
  calls.push({ url: String(url), method: options!.method!, ...(options!.body ? { body: JSON.parse(String(options!.body)) } : {}) });
  return new Response(JSON.stringify(reply), { status: code, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;
try {
  assert.equal(smsConfigured(), true); assert.equal(smsReady(), false);
  assert.deepEqual(await smsGateway.check(), { connected: true }); assert.ok(calls.at(-1)!.url.endsWith('/logs?limit=1'));
  const id = 'fixture-job-id';
  reply = { messages: [{ messageId: id, status: { groupId: 1, name: 'PENDING_ACCEPTED' } }] };
  assert.equal((await smsGateway.send(id, '+966512345678', 'The Table: TEST', 900)).state, 'Pending');
  const body = calls.at(-1)!.body; assert.equal(body.messages[0].sender, 'TEST'); assert.deepEqual(body.messages[0].destinations, [{ to: '966512345678', messageId: id }]); assert.deepEqual(body.messages[0].options.validityPeriod, { amount: 15, timeUnit: 'MINUTES' });
  reply = { results: [{ messageId: id, status: { groupId: 3, name: 'DELIVERED_TO_OPERATOR' } }] }; assert.equal((await smsGateway.get(id)).state, 'Sent');
  reply = { results: [{ messageId: id, status: { groupId: 3, name: 'DELIVERED_TO_HANDSET' } }] }; assert.equal((await smsGateway.get(id)).state, 'Delivered');
  reply = { results: [{ messageId: id, status: { groupId: 5, name: 'REJECTED_DESTINATION' } }] }; assert.equal((await smsGateway.get(id)).state, 'Failed');
  reply = { results: [] }; await assert.rejects(smsGateway.get(id), (error: unknown) => error instanceof GatewayError && error.code === 'INFOBIP_RESPONSE_UNKNOWN');
  reply = { messages: [{ messageId: 'wrong-id', status: { groupId: 1, name: 'PENDING' } }] }; await assert.rejects(smsGateway.send(id, '+966512345678', 'TEST', 900));
  env.API_KEY = 'fixture-alias-key'; reply = { results: [] }; assert.deepEqual(await smsGateway.check(), { connected: true }); env.API_KEY = '';
  code = 401; await assert.rejects(smsGateway.check(), (error: unknown) => error instanceof GatewayError && !error.retryable && error.code === 'INFOBIP_HTTP_401');
  console.log('PASS Infobip environment readiness, App authentication, v3 request/custom ID/validity period, read-only check, log tracking, handset-only delivery and safe unknown/auth-error handling. Mocked HTTP only; no SMS sent.');
} finally { globalThis.fetch = original; }
