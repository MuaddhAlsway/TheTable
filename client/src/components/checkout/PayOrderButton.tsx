import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { finishCheckoutRequest } from '../../lib/checkoutRequest';
import { useState } from 'react';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { useApiResource } from '../../hooks/useApiResource';
import type { OrderRecord } from '../../lib/api-types';
import { money, statusLabel } from '../../lib/api-types';
import { openStripeCheckout } from '../../lib/payments';
import ActionDialog from '../common/ActionDialog';
export default function PayOrderButton({ orderId }: { orderId: string }) {
  const auth = useBackendAuth(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const saved = useApiResource<OrderRecord>(open ? `/orders/${encodeURIComponent(orderId)}` : null);
  const order = saved.result?.data;
  const payable = order?.paymentStatus === 'unpaid' && order.status === 'pending_payment';
  async function pay() { if (!payable || busy) return; setBusy(true); setError(''); try { await openStripeCheckout(orderId, await auth.getToken()); } catch (error) { if (error instanceof ApiError && auth.userId && ['ORDER_EXPIRED', 'PAYMENT_SESSION_CLOSED'].includes(error.code)) finishCheckoutRequest(auth.userId, orderId); setError(error instanceof Error ? error.message : 'Unable to open secure payment.'); setBusy(false); } }
  return <><button type="button" onClick={() => { setError(''); setOpen(true); }}>Continue to secure payment</button>{open && <ActionDialog title="Review your payment" description="Review the saved order total before continuing to Stripe’s secure payment page. Payment is confirmed only after the server verifies Stripe’s signed notification." onClose={() => setOpen(false)} busy={busy}>{saved.loading ? <p role="status">Loading your saved order…</p> : saved.error ? <p role="alert">{saved.error} <button type="button" onClick={saved.reload}>Try again</button></p> : order && <><dl className="action-dialog__summary"><div><dt>Order</dt><dd>{order.orderNumber}</dd></div><div><dt>Payment status</dt><dd>{statusLabel(order.paymentStatus)}</dd></div><div><dt>Total</dt><dd><strong>{money(order.totalHalalas)}</strong></dd></div></dl>{!payable && <p role="status">This order is no longer awaiting payment. Close this window and refresh its status.</p>}</>}{error && <p className="staff-error" role="alert">{error} <Link to="/cart">Review your bag</Link></p>}<div className="action-dialog__actions"><button type="button" disabled={busy} onClick={() => setOpen(false)}>Back to order</button><button className="action-dialog__primary" type="button" disabled={busy || saved.loading || !payable} onClick={() => void pay()}>{busy ? 'Opening Stripe…' : 'Continue to Stripe'}</button></div></ActionDialog>}</>;
}
