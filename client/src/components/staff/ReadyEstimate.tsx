import { useRef, useState, type FormEvent } from 'react';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { apiRequest, ApiError } from '../../lib/api';
import type { StaffOrder } from '../../lib/api-types';
export default function ReadyEstimate({ order, disabled, onSaved }: { order: StaffOrder; disabled: boolean; onSaved: () => void }) {
  const auth = useBackendAuth(); const [min, setMin] = useState('25'); const [max, setMax] = useState('35'); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const request = useRef({ fingerprint: '', actionId: '', expectedUpdatedAt: '' });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (disabled || busy) return;
    if (!window.confirm('Update this approximate ready-time range? This does not send a notification.')) return;
    const fingerprint = JSON.stringify({ min, max, reason });
    if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, actionId: crypto.randomUUID(), expectedUpdatedAt: order.updatedAt };
    setBusy(true); setError('');
    try { await apiRequest(`/staff/orders/${order._id}/ready-estimate`, { method: 'POST', token: await auth.getToken(), body: { expectedUpdatedAt: request.current.expectedUpdatedAt, actionId: request.current.actionId, minMinutes: Number(min), maxMinutes: Number(max), reason } }); request.current = { fingerprint: '', actionId: '', expectedUpdatedAt: '' }; onSaved(); }
    catch (error) { if (error instanceof ApiError && error.code === 'STALE_ORDER') request.current = { fingerprint: '', actionId: '', expectedUpdatedAt: '' }; setError(error instanceof Error ? error.message : 'Unable to update the ready estimate.'); }
    finally { setBusy(false); }
  }
  return <details className="staff-audit"><summary>Adjust approximate ready time</summary><form className="staff-estimate" onSubmit={event => void save(event)}><p>Minutes from now. The server checks closing time. A reason is recorded; no automatic notification is sent.</p><fieldset disabled={disabled || busy}><div className="staff-fields"><label>Minimum minutes<input type="number" min="1" max="240" required value={min} onChange={event => setMin(event.target.value)} /></label><label>Maximum minutes<input type="number" min={min || 1} max="240" required value={max} onChange={event => setMax(event.target.value)} /></label><label>Reason<input required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label></div><button type="submit">{busy ? 'Saving…' : 'Save ready estimate'}</button></fieldset><p role="alert" className="staff-error">{error}</p></form></details>;
}
