import type { ReservationRecord } from './api-types';
export const reservationReference = (record: ReservationRecord) => record.reservationNumber || `Reservation ${record._id.slice(-6).toUpperCase()}`;
export const reservationDate = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
export async function reservationRequestKey(userId: string, fingerprint: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = `thetable.reservation-request:${userId}`;
  try { const prior = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); if (prior?.hash === hash && typeof prior.key === 'string' && /^[a-f0-9-]{36}$/i.test(prior.key)) return prior.key; } catch { /* Optional request recovery. */ }
  const key = crypto.randomUUID();
  try { sessionStorage.setItem(storageKey, JSON.stringify({ hash, key })); } catch { /* The form also retains its key in memory. */ }
  return key;
}
