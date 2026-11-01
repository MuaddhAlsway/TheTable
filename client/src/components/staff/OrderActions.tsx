import ActionDialog from "../common/ActionDialog";
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { apiRequest } from '../../lib/api';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import type { OrderAction, OrderStatus } from '../../lib/api-types';
const labels: Record<OrderAction, string> = { accept: 'Accept order', reject: 'Reject order', cancel: 'Cancel order', start_preparation: 'Start preparation', mark_ready: 'Finish preparation', complete_pickup: 'Confirm pickup handoff', dispatch_delivery: 'Dispatch delivery', complete_delivery: 'Confirm delivery completed' };
const route: Record<OrderAction, { prefix: string; suffix: string }> = { accept: { prefix: '/staff/orders', suffix: 'accept' }, reject: { prefix: '/staff/orders', suffix: 'reject' }, cancel: { prefix: '/staff/orders', suffix: 'cancel' }, start_preparation: { prefix: '/kitchen/orders', suffix: 'start' }, mark_ready: { prefix: '/kitchen/orders', suffix: 'ready' }, complete_pickup: { prefix: '/staff/orders', suffix: 'complete-pickup' }, dispatch_delivery: { prefix: '/staff/orders', suffix: 'dispatch-delivery' }, complete_delivery: { prefix: '/staff/orders', suffix: 'complete-delivery' } };
type Selection = { action: OrderAction; expectedStatus: OrderStatus; expectedUpdatedAt: string; actionId: string };
export default function OrderActions({ order, disabled, onSaved }: { order: { _id: string; orderNumber: string; status: OrderStatus; updatedAt: string; allowedActions: OrderAction[] }; disabled: boolean; onSaved: () => void }) {
  const auth = useBackendAuth(); const [selection, setSelection] = useState<Selection | null>(null); const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null); const trigger = useRef<HTMLButtonElement | null>(null);
  const requiresReason = selection?.action === 'reject' || selection?.action === 'cancel';
  function close() { setSelection(null); setReason(''); setError(''); trigger.current?.focus(); }
  function escape(event: KeyboardEvent<HTMLFormElement>) { if (event.key === 'Escape' && !busy) { event.preventDefault(); close(); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selection || disabled || busy) return;
    if (requiresReason && !reason.trim()) { setError('Enter a reason before continuing.'); textarea.current?.focus(); return; }
    setBusy(true); setError('');
    try { const target = route[selection.action]; await apiRequest(`${target.prefix}/${order._id}/${target.suffix}`, { method: 'POST', token: await auth.getToken(), body: { expectedStatus: selection.expectedStatus, expectedUpdatedAt: selection.expectedUpdatedAt, actionId: selection.actionId, reason: reason.trim() } }); close(); onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : 'The action could not be completed. Refresh and review the order.'); }
    finally { setBusy(false); }
  }
  return <div className="staff-actions">{!selection ? <>{order.allowedActions.map(action => <button type="button" className={`staff-action staff-action--${action}`} key={action} disabled={disabled} onClick={event => { trigger.current = event.currentTarget; setReason(''); setError(''); setSelection({ action, expectedStatus: order.status, expectedUpdatedAt: order.updatedAt, actionId: crypto.randomUUID() }); requestAnimationFrame(() => textarea.current?.focus()); }}>{labels[action]}</button>)}{!order.allowedActions.length && <p>No permitted actions for this order, payment state, or workflow setup.</p>}</> : <ActionDialog title={`${labels[selection.action]}?`} description={`Order ${order.orderNumber}. Review the details before confirming this action.`} onClose={close} busy={busy}><form className="staff-confirmation" onSubmit={event => void submit(event)} onKeyDown={escape} aria-label={`${labels[selection.action]} confirmation for ${order.orderNumber}`}>
    <h3>{labels[selection.action]} — {order.orderNumber}?</h3>
    <p>Review the current order before confirming.{selection.action === 'complete_pickup' && ' Confirm only after staff have actually handed over the order.'}{selection.action === 'complete_delivery' && ' Confirm only after the real delivery process has verified completion.'}{(selection.action === 'cancel' || selection.action === 'reject') && ' This action does not issue a refund. Review any paid payment separately in Stripe.'}</p>
    <label htmlFor={`reason-${order._id}`}>{requiresReason ? 'Reason (required)' : 'Staff note (optional)'}</label><textarea ref={textarea} id={`reason-${order._id}`} value={reason} required={requiresReason} maxLength={1500} onChange={event => { setReason(event.target.value); setSelection(current => current ? { ...current, actionId: crypto.randomUUID() } : null); setError(''); }} aria-invalid={!!error} aria-describedby={error ? `action-error-${order._id}` : undefined} disabled={busy} />
    <div><button className="action-dialog__primary" type="submit" disabled={disabled || busy}>{busy ? 'Saving…' : `Confirm ${labels[selection.action].toLowerCase()}`}</button><button type="button" disabled={busy} onClick={close}>Keep order unchanged</button></div><p id={`action-error-${order._id}`} className="staff-error" role="alert">{error}</p>
  </form></ActionDialog>}</div>;
}
