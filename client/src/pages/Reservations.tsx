import SmsConsent from '../components/notifications/SmsConsent';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useBackendAuth } from '../hooks/useBackendAuth';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { apiRequest, ApiError } from '../lib/api';
import type { ReservationRecord } from '../lib/api-types';
import { reservationDate, reservationReference, reservationRequestKey } from '../lib/reservations';
import { normalizeSaudiMobile, SAUDI_MOBILE_ERROR } from '../utils/saudiPhone';
import CheckoutField from '../components/checkout/CheckoutField';
import RoutePage from './RoutePage';
import '../styles/Checkout.css';
import '../styles/Reservations.css';
const initial = { name: '', email: '', phone: '', dateTime: '', partySize: '', notes: '' };
type Values = typeof initial;
export default function Reservations() {
  const auth = useBackendAuth(); const settings = usePublicSettings();
  const draftKey = 'thetable.reservation-draft:' + auth.userId;
  const [values, setValues] = useState<Values>(() => { try { const draft = JSON.parse(sessionStorage.getItem(draftKey) || '{}'); return Object.fromEntries(Object.keys(initial).map(key => [key, typeof draft[key] === 'string' ? draft[key] : ''])) as Values; } catch { return initial; } });
  const [smsConsent, setSmsConsent] = useState(() => { try { return JSON.parse(sessionStorage.getItem(draftKey) || '{}').smsConsent === true; } catch { return false; } });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState<ReservationRecord | null>(null);
  const lock = useRef(false); const form = useRef<HTMLFormElement>(null);
  const request = useRef({ fingerprint: '', key: '' });
  const config = settings.settings?.reservations;
  function update(name: keyof Values, value: string) {
    const next = { ...values, [name]: value }; setValues(next); setErrors(current => ({ ...current, [name]: undefined }));
    try { sessionStorage.setItem(draftKey, JSON.stringify({ ...next, smsConsent })); } catch { /* The controlled form works without storage. */ }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || saved) return;
    setError(''); const phone = normalizeSaudiMobile(values.phone); const next: typeof errors = {};
    if (!values.name.trim()) next.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (!phone) next.phone = SAUDI_MOBILE_ERROR;
    const date = new Date(values.dateTime + ':00+03:00');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.dateTime) || !Number.isFinite(date.getTime()) || new Date(date.getTime() + 3 * 3600000).toISOString().slice(0,16) !== values.dateTime || date.getTime() <= Date.now()) next.dateTime = 'Choose a future date and time in Saudi Arabia.';
    const count = Number(values.partySize);
    if (!Number.isInteger(count) || count < 1 || (config?.maxPartySize && count > config.maxPartySize)) next.partySize = 'Choose between 1 and ' + (config?.maxPartySize ?? 'the configured maximum') + ' guests.';
    setErrors(next);
    if (Object.keys(next).length) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    if (!settings.settings?.reservationsEnabled || !auth.userId) { setError('Reservation requests are unavailable. Refresh restaurant settings and try again.'); return; }
    const payload = { smsConsent, customer: { name: values.name.trim(), email: values.email.trim(), phone }, dateTime: date.toISOString(), partySize: count, notes: values.notes.trim() };
    lock.current = true; setBusy(true);
    try {
      const fingerprint = JSON.stringify(payload);
      if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, key: await reservationRequestKey(auth.userId, fingerprint) };
      const result = await apiRequest<ReservationRecord>('/reservations', { method: 'POST', token: await auth.getToken(), body: payload, headers: { 'Idempotency-Key': request.current.key } });
      setSaved(result.data); setValues(current => ({ ...current, phone: phone! }));
      try { sessionStorage.removeItem(draftKey); } catch { /* Optional form recovery. */ }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save reservation. Retry with the same details.');
      if (caught instanceof ApiError) { const fields: typeof errors = {}; for (const field of caught.fields) { const name = field.path.replace(/^customer\./, ''); if (name in initial) fields[name as keyof Values] = field.message; } if (['OUTSIDE_HOURS', 'INVALID_TIME'].includes(caught.code)) fields.dateTime = caught.message; if (caught.code === 'PARTY_SIZE') fields.partySize = caught.message; setErrors(fields); }
    } finally { lock.current = false; setBusy(false); }
  }
  return <RoutePage title="A table for you." description="Bring your people. Tell us when, and we’ll help make room for a good time together."><div className="reservation-page">
    <nav className="reservation-toplinks"><Link to="/account#account-reservations">Your reservations</Link><Link to="/locations">Plan your visit</Link></nav>
    {settings.loading && <p role="status">Loading reservation settings…</p>}{settings.error && <p role="alert">{settings.error} <button onClick={settings.refresh}>Try again</button></p>}
    {!settings.loading && !settings.error && !settings.settings?.reservationsEnabled && <section className="reservation-notice" role="status"><h2>Reservations are currently paused.</h2><ul>{config?.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>{auth.profile?.role === 'admin' && <Link to="/admin/fulfillment">Configure reservation requests</Link>}</section>}
    {saved ? <section className="reservation-card reservation-success" role="status"><p className="reservation-eyebrow">{reservationReference(saved)}</p><h2>Your request is with us.</h2><p>{reservationDate(saved.dateTime)} · {saved.partySize} guests</p><p>Status: <strong>{saved.status}</strong>. {saved.status === 'requested' ? 'Staff will review seating; check your account for confirmation.' : 'Check the saved reservation for the latest restaurant response.'}</p><Link className="reservation-primary" to={'/account/reservations/' + saved._id}>View reservation & status</Link></section> : <div className="reservation-layout"><aside className="reservation-intro"><p className="reservation-eyebrow">MAKE TIME FOR EACH OTHER</p><h2>Good company.<br/><em>A place to gather.</em></h2><p>A quick catch-up or a little occasion. Start with the details, and let our team review your request.</p><dl><div><dt>Restaurant hours</dt><dd>{config?.openingHours || 'Loading confirmed hours…'}</dd></div><div><dt>Your gathering</dt><dd>{config?.maxPartySize ? '1–' + config.maxPartySize + ' guests per request' : 'Group limit requires setup'}</dd></div><div><dt>Time zone</dt><dd>Saudi Arabia · Asia/Riyadh</dd></div></dl><ol><li>Send your preferred date and group size.</li><li>Staff review the actual seating.</li><li>Check your account for confirmation.</li></ol><p>SMS status updates are optional when available; check your account for all updates. Table QR food ordering is a separate service.</p></aside>
    <form className="reservation-form" ref={form} noValidate onSubmit={event => void submit(event)}><h2>Let’s make a plan.</h2><p>Choose a future visit during the restaurant’s confirmed opening days and hours.</p><fieldset disabled={busy}><legend className="reservation-sr-only">Reservation details</legend><div className="reservation-fields">
      <CheckoutField name="reservation-name" label="Full name" value={values.name} onChange={e => update('name', e.target.value)} error={errors.name} required autoComplete="name" maxLength={120}/>
      <CheckoutField name="reservation-email" label="Email address" value={values.email} onChange={e => update('email', e.target.value)} error={errors.email} type="email" required autoComplete="email" maxLength={254}/>
      <CheckoutField name="reservation-phone" label="Phone number" value={values.phone} onChange={e => update('phone', e.target.value)} error={errors.phone} type="tel" required fixedPrefix="Saudi Arabia · +966" hint="05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX." autoComplete="tel"/>
      <CheckoutField name="reservation-size" label="Number of guests" value={values.partySize} onChange={e => update('partySize', e.target.value)} error={errors.partySize} type="number" min="1" max={config?.maxPartySize ?? undefined} step="1" required/>
      <CheckoutField name="reservation-time" label="Date and time (Saudi Arabia)" value={values.dateTime} onChange={e => update('dateTime', e.target.value)} error={errors.dateTime} type="datetime-local" required wide hint="Choose the time in Saudi Arabia, regardless of your device’s time zone."/>
      <div className="checkout-page__field checkout-page__field--wide"><label htmlFor="reservation-notes">Notes (optional)</label><textarea id="reservation-notes" value={values.notes} onChange={e => update('notes', e.target.value)} maxLength={1500} rows={4} placeholder="Anything you would like the team to know. Special requests need staff confirmation."/></div>
    </div></fieldset><SmsConsent checked={smsConsent} onChange={checked => { setSmsConsent(checked); try { sessionStorage.setItem(draftKey, JSON.stringify({ ...values, smsConsent: checked })); } catch { /* Optional draft. */ } }}/><button className="reservation-primary" type="submit" disabled={busy || settings.loading || !!settings.error || !settings.settings?.reservationsEnabled}>{busy ? 'Saving request…' : 'Request a table'}</button><p className="reservation-form-note">Your table is confirmed only when the restaurant changes your request to confirmed.</p>{error && <p role="alert">{error}</p>}</form></div>}
  </div></RoutePage>;
}
