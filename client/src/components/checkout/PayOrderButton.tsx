import { useState } from 'react';
import { useBackendAuth } from '../../hooks/useBackendAuth';
import { openStripeCheckout } from '../../lib/payments';
export default function PayOrderButton({ orderId }: { orderId: string }) {
  const auth = useBackendAuth(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function pay() { setBusy(true); setError(''); try { await openStripeCheckout(orderId, await auth.getToken()); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to open secure payment.'); setBusy(false); } }
  return <div><button type="button" disabled={busy} onClick={() => void pay()}>{busy ? 'Opening Stripe…' : 'Continue to secure payment'}</button><p role="alert">{error}</p></div>;
}
