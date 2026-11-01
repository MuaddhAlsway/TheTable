import { useEffect, useState, type FormEvent } from 'react';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { apiRequest } from '../../lib/api';
import type { ReservationRecord, ReservationStatus } from '../../lib/api-types';
import { reservationDate, reservationReference } from '../../lib/reservations';
import ActionDialog from '../common/ActionDialog';
const labels: Record<Exclude<ReservationStatus, 'requested'>, string> = { confirmed: 'Confirm reservation', cancelled: 'Cancel reservation', completed: 'Mark visit completed' };
export default function ReservationActions({ reservation, customer = false, onSaved, disabled = false }: { reservation: ReservationRecord; customer?: boolean; onSaved: () => void; disabled?: boolean }) {
  const auth = useBackendAuth();
  const [choice, setChoice] = useState<Exclude<ReservationStatus, 'requested'> | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const future = Date.parse(reservation.dateTime) > now;
  const options: Exclude<ReservationStatus, 'requested'>[] = customer ? (future && ['requested', 'confirmed'].includes(reservation.status) ? ['cancelled'] : []) : reservation.status === 'requested' ? [...(future ? ['confirmed' as const] : []), 'cancelled'] : reservation.status === 'confirmed' ? [...(!future ? ['completed' as const] : []), 'cancelled'] : [];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!choice || busy || disabled) return;
    if (!customer && choice === 'cancelled' && !reason.trim()) { setError('Explain the cancellation so the customer can see why.'); return; }
    setBusy(true); setError('');
    try { await apiRequest(customer ? `/reservations/${reservation._id}/cancel` : `/staff/reservations/${reservation._id}/status`, { method: customer ? 'POST' : 'PATCH', token: await auth.getToken(), body: { ...(!customer ? { status: choice } : {}), expectedStatus: reservation.status, expectedUpdatedAt: reservation.updatedAt, reason: reason.trim() } }); setChoice(null); onSaved(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update reservation.'); }
    finally { setBusy(false); }
  }
  return <div className="reservation-actions">{options.map(status => <button key={status} type="button" disabled={disabled} onClick={() => { setChoice(status); setReason(''); setError(''); }}>{labels[status]}</button>)}{choice && <ActionDialog title={`${labels[choice]}?`} description={`${reservationReference(reservation)} · ${reservation.partySize} guests · ${reservationDate(reservation.dateTime)}`} onClose={() => setChoice(null)} busy={busy}><form onSubmit={event => void submit(event)}><p>{choice === 'confirmed' ? 'Check that seating is actually available for this group before confirming. Confirmation appears in the customer’s account. SMS is queued only if enabled and the customer opted in; email is not connected.' : choice === 'completed' ? 'Record completion only after the actual visit. This does not create a food order or collect a payment.' : 'This cancels the reservation. Its history remains available in the customer’s account.'}</p><label htmlFor={`reservation-reason-${reservation._id}`}>Note visible to customer {(!customer && choice === 'cancelled') ? '(required)' : '(optional)'}</label><textarea id={`reservation-reason-${reservation._id}`} value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} required={!customer && choice === 'cancelled'} disabled={busy}/>{error && <p role="alert">{error}</p>}<div className="action-dialog__actions"><button type="submit" className="action-dialog__primary" disabled={busy || disabled}>{busy ? 'Saving…' : 'Save reservation status'}</button><button type="button" disabled={busy} onClick={() => setChoice(null)}>Go back</button></div></form></ActionDialog>}</div>;
}
