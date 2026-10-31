import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useBackendAuth } from '../hooks/useBackendAuth';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { apiRequest } from '../lib/api';
import type { ReservationRecord } from '../lib/api-types';
import { normalizeSaudiMobile, SAUDI_MOBILE_ERROR } from '../utils/saudiPhone';
import CheckoutField from '../components/checkout/CheckoutField';
import RoutePage from './RoutePage';
import '../styles/Dashboard.css';
export default function Reservations() {
  const auth = useBackendAuth(); const settings = usePublicSettings();
  const [values, setValues] = useState({ name: '', email: '', phone: '', dateTime: '', partySize: '', notes: '' });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState<ReservationRecord | null>(null);
  const request = useRef({ fingerprint: '', key: '' });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); const phone = normalizeSaudiMobile(values.phone);
    if (!phone) { setError(SAUDI_MOBILE_ERROR); return; }
    if (!settings.settings?.reservationsEnabled) { setError('Reservation requests are not enabled until restaurant setup is complete.'); return; }
    const date = new Date(values.dateTime + ':00+03:00');
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) { setError('Choose a future date and time in Saudi Arabia.'); return; }
    if (!Number.isInteger(Number(values.partySize)) || Number(values.partySize) < 1 || (settings.settings?.reservations?.maxPartySize && Number(values.partySize) > settings.settings.reservations.maxPartySize)) { setError('Choose a group size within the displayed limit.'); return; }
    const payload = { customer: { name: values.name.trim(), email: values.email.trim(), phone }, dateTime: date.toISOString(), partySize: Number(values.partySize), notes: values.notes.trim() };
    const fingerprint = JSON.stringify(payload); if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    try { const result = await apiRequest<ReservationRecord>('/reservations', { method: 'POST', token: await auth.getToken(), body: payload, headers: { 'Idempotency-Key': request.current.key } }); setSaved(result.data); setValues(current => ({ ...current, phone })); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to save reservation.'); } finally { setBusy(false); }
  }
  return <RoutePage title="A table for you." description="Request a moment together. Reservations remain requests until staff confirm them."><div className="dashboard-page">{settings.loading && <p role="status">Loading reservation availability…</p>}{settings.error && <p role="alert">{settings.error} <button onClick={settings.refresh}>Try again</button></p>}{!settings.loading && !settings.settings?.reservationsEnabled && <div className="dashboard-notice" role="status"><p>Reservation requests are currently unavailable.</p><ul>{settings.settings?.reservations?.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>{auth.profile?.role === "admin" && <Link to="/admin/fulfillment">Configure reservation requests</Link>}</div>}{settings.settings?.reservations && <p>Restaurant hours: {settings.settings.reservations.openingHours}. Maximum {settings.settings.reservations.maxPartySize ?? "not configured"} guests per request. Times are in Asia/Riyadh; requests require staff confirmation.</p>}{saved ? <section className="dashboard-panel"><h2>Reservation request saved.</h2><p>Status: {saved.status}. Your table is not confirmed until staff review it.</p><Link to="/account">View your reservations</Link></section> : <form className="dashboard-form" onSubmit={event => void submit(event)}>
    <CheckoutField name="reservation-name" label="Full name" value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} required autoComplete="name" />
    <CheckoutField name="reservation-email" label="Email address" value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} type="email" required autoComplete="email" />
    <CheckoutField name="reservation-phone" label="Phone number" value={values.phone} onChange={e => setValues(v => ({ ...v, phone: e.target.value }))} type="tel" required fixedPrefix="Saudi Arabia · +966" hint="Saudi mobiles only: 05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX." />
    <CheckoutField name="reservation-time" label="Date and time (Saudi Arabia)" value={values.dateTime} onChange={e => setValues(v => ({ ...v, dateTime: e.target.value }))} type="datetime-local" required />
    <CheckoutField name="reservation-size" label="Number of guests" value={values.partySize} onChange={e => setValues(v => ({ ...v, partySize: e.target.value }))} type="number" min="1" max={settings.settings?.reservations?.maxPartySize ?? undefined} step="1" required />
    <label>Notes (optional)<textarea value={values.notes} onChange={e => setValues(v => ({ ...v, notes: e.target.value }))} maxLength={1500} /></label>
    <button className="dashboard-primary" type="submit" disabled={busy || !settings.settings?.reservationsEnabled}>{busy ? 'Saving request…' : 'Request a table'}</button><p role="alert">{error}</p>
  </form>}</div></RoutePage>;
}
