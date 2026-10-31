import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { finishCheckoutRequest } from '../../lib/checkoutRequest';
import { useState } from 'react';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { openStripeCheckout } from '../../lib/payments';
export default function PayOrderButton({ orderId }: { orderId: string }) {
  const auth = useBackendAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function pay() { setBusy(true); setError(''); try { await openStripeCheckout(orderId, await auth.getToken()); } catch (error) { if (error instanceof ApiError && auth.userId && ['ORDER_EXPIRED', 'PAYMENT_SESSION_CLOSED'].includes(error.code)) finishCheckoutRequest(auth.userId, orderId); setError(error instanceof Error ? error.message : 'Unable to open secure payment.'); setBusy(false); } }
  return <div><button type="button" disabled={busy} onClick={() => void pay()}>{busy ? 'Opening Stripe…' : 'Continue to secure payment'}</button><p role="alert">{error}</p>{error && <Link to="/cart">Review your bag or start a fresh checkout</Link>}</div>;
}
