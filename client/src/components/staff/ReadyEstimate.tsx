import { useRef, useState, type FormEvent } from 'react';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { apiRequest, ApiError } from '../../lib/api';
import type { StaffOrder } from '../../lib/api-types';
import ActionDialog from '../common/ActionDialog';
function EstimateEditor({ order, disabled, onSaved, close }: { order: StaffOrder; disabled: boolean; onSaved: () => void; close: () => void }) {
  const remaining = (value: string | undefined, fallback: number) => value ? Math.max(1, Math.min(240, Math.ceil((Date.parse(value) - Date.now()) / 60000))) : fallback;
  const auth = useBackendAuth();
  const [min, setMin] = useState(() => String(remaining(order.readyEstimateMinAt, 25)));
  const [max, setMax] = useState(() => String(remaining(order.readyEstimateMaxAt, 35)));
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [stale, setStale] = useState(false);
  const snapshot = useRef(order.updatedAt);
  const request = useRef({ fingerprint: '', actionId: '' });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (disabled || busy || stale) return;
    if (!Number.isInteger(Number(min)) || !Number.isInteger(Number(max)) || Number(min) < 1 || Number(max) < Number(min) || Number(max) > 240 || !reason.trim()) { setError('Enter a valid 1–240 minute range and a reason.'); return; }
    const fingerprint = JSON.stringify({ min, max, reason });
    if (request.current.fingerprint !== fingerprint) request.current = { fingerprint, actionId: crypto.randomUUID() };
    setBusy(true); setError('');
    try { await apiRequest(`/staff/orders/${order._id}/ready-estimate`, { method: 'POST', token: await auth.getToken(), body: { expectedUpdatedAt: snapshot.current, actionId: request.current.actionId, minMinutes: Number(min), maxMinutes: Number(max), reason: reason.trim() } }); close(); onSaved(); }
    catch (error) { if (error instanceof ApiError && error.code === 'STALE_ORDER') setStale(true); setError(error instanceof Error ? error.message : 'Unable to update the ready estimate.'); }
    finally { setBusy(false); }
  }
  return <ActionDialog title="Update ready time" description={`Adjust the approximate ready window for ${order.orderNumber}. Times are measured from this update. The change is recorded, but no customer notification is sent.`} onClose={close} busy={busy}><form onSubmit={event => void save(event)}><fieldset disabled={disabled || busy || stale}><div className="action-dialog__fields"><label>Minimum minutes<input type="number" min="1" max="240" required value={min} onChange={event => setMin(event.target.value)} /></label><label>Maximum minutes<input type="number" min={min || 1} max="240" required value={max} onChange={event => setMax(event.target.value)} /></label></div><label>Reason for the change<textarea required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain the updated preparation time" /></label></fieldset>{error && <p className="staff-error" role="alert">{error}{stale && ' Close this window and refresh the order before trying again.'}</p>}<div className="action-dialog__actions"><button type="button" disabled={busy} onClick={close}>Keep current time</button><button className="action-dialog__primary" type="submit" disabled={disabled || busy || stale}>{busy ? 'Saving…' : 'Confirm ready time'}</button></div></form></ActionDialog>;
}
export default function ReadyEstimate(props: { order: StaffOrder; disabled: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return <><button className="staff-ready-estimate" type="button" disabled={props.disabled} onClick={() => setOpen(true)}>Adjust ready time</button>{open && <EstimateEditor {...props} close={() => setOpen(false)} />}</>;
}
