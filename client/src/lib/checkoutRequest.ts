// Tab-scoped request metadata only: no customer details, tokens, or payment data.
type RequestRecord = { hash: string; key: string; orderId?: string };
const storageKey = (userId: string) => `thetable.checkout-request:${userId}`;
function read(userId: string): RequestRecord | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(userId)) || 'null') as Partial<RequestRecord> | null;
    return value && typeof value.hash === 'string' && /^[a-f0-9]{64}$/.test(value.hash) && typeof value.key === 'string' && /^[a-f0-9-]{36}$/i.test(value.key) ? value as RequestRecord : null;
  } catch { return null; }
}
export async function checkoutRequestKey(userId: string, fingerprint: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const previous = read(userId);
  if (previous?.hash === hash) return previous.key;
  const key = crypto.randomUUID();
  try { sessionStorage.setItem(storageKey(userId), JSON.stringify({ hash, key })); } catch { /* In-memory request protection remains available when storage is blocked. */ }
  return key;
}
export function bindCheckoutOrder(userId: string, key: string, orderId: string) {
  const record = read(userId);
  if (record?.key === key) try { sessionStorage.setItem(storageKey(userId), JSON.stringify({ ...record, orderId })); } catch { /* Storage is optional. */ }
}
export function finishCheckoutRequest(userId: string, orderId: string) {
  if (read(userId)?.orderId !== orderId) return false;
  try { sessionStorage.removeItem(storageKey(userId)); return true; } catch { return false; }
}
