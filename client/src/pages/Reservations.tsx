import SiteText from "../components/content/SiteText";
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
  return <RoutePage title="A table for you." description="Request a moment together. Reservations remain requests until staff confirm them."><div className="dashboard-page">{settings.loading && <p role="status"><SiteText contentKey="Reservations-text-1w3qlam" fallback={"Loading reservation availability…"} /></p>}{settings.error && <p role="alert">{settings.error} <button onClick={settings.refresh}><SiteText contentKey="Reservations-text-982hh6" fallback={"Try again"} /></button></p>}{!settings.loading && !settings.settings?.reservationsEnabled && <div className="dashboard-notice" role="status"><p><SiteText contentKey="Reservations-text-1xv01bf" fallback={"Reservation requests are currently unavailable."} /></p><ul>{settings.settings?.reservations?.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>{auth.profile?.role === "admin" && <Link to="/admin/fulfillment"><SiteText contentKey="Reservations-text-1al3ty9" fallback={"Configure reservation requests"} /></Link>}</div>}{settings.settings?.reservations && <p><SiteText contentKey="Reservations-text-c0gymz" fallback={"Restaurant hours: "} />{settings.settings.reservations.openingHours}<SiteText contentKey="Reservations-text-al19ah" fallback={". Maximum "} />{settings.settings.reservations.maxPartySize ?? "not configured"} <SiteText contentKey="Reservations-text-nqgm2y" fallback={"guests per request. Times are in Asia/Riyadh; requests require staff confirmation."} /></p>}{saved ? <section className="dashboard-panel"><h2><SiteText contentKey="Reservations-text-r2z3ln" fallback={"Reservation request saved."} /></h2><p><SiteText contentKey="Reservations-text-2fq925" fallback={"Status: "} />{saved.status}<SiteText contentKey="Reservations-text-1x0jz0f" fallback={". Your table is not confirmed until staff review it."} /></p><Link to="/account"><SiteText contentKey="Reservations-text-4dagpe" fallback={"View your reservations"} /></Link></section> : <form className="dashboard-form" onSubmit={event => void submit(event)}>
    <CheckoutField name="reservation-name" label="Full name" value={values.name} onChange={e => setValues(v => ({ ...v, name: e.target.value }))} required autoComplete="name" />
    <CheckoutField name="reservation-email" label="Email address" value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} type="email" required autoComplete="email" />
    <CheckoutField name="reservation-phone" label="Phone number" value={values.phone} onChange={e => setValues(v => ({ ...v, phone: e.target.value }))} type="tel" required fixedPrefix="Saudi Arabia · +966" hint="Saudi mobiles only: 05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX." />
    <CheckoutField name="reservation-time" label="Date and time (Saudi Arabia)" value={values.dateTime} onChange={e => setValues(v => ({ ...v, dateTime: e.target.value }))} type="datetime-local" required />
    <CheckoutField name="reservation-size" label="Number of guests" value={values.partySize} onChange={e => setValues(v => ({ ...v, partySize: e.target.value }))} type="number" min="1" max={settings.settings?.reservations?.maxPartySize ?? undefined} step="1" required />
    <label><SiteText contentKey="Reservations-text-ei0gzd" fallback={"Notes (optional)"} /><textarea value={values.notes} onChange={e => setValues(v => ({ ...v, notes: e.target.value }))} maxLength={1500} /></label>
    <button className="dashboard-primary" type="submit" disabled={busy || !settings.settings?.reservationsEnabled}>{busy ? 'Saving request…' : 'Request a table'}</button><p role="alert">{error}</p>
  </form>}</div></RoutePage>;
}
