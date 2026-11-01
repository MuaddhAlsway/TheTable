import SmsConsent from '../components/notifications/SmsConsent';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTableSession } from '../context/table-session';
import { useCart } from '../hooks/useCart';
import { useBackendAuth } from '../hooks/useBackendAuth';
import { usePublicSettings } from '../hooks/usePublicSettings';
import { useApiResource } from '../hooks/useApiResource';
import { apiRequest } from '../lib/api';
import { money, type OrderRecord } from '../lib/api-types';
import { checkoutRequestKey, bindCheckoutOrder } from '../lib/checkoutRequest';
import { openStripeCheckout } from '../lib/payments';
import { normalizeSaudiMobile, SAUDI_MOBILE_ERROR } from '../utils/saudiPhone';
import CheckoutField from '../components/checkout/CheckoutField';
import PayOrderButton from '../components/checkout/PayOrderButton';
import RoutePage from './RoutePage';
import type { TableInfo } from './TableLanding';
import '../styles/Checkout.css';
import '../styles/Tables.css';
export default function TableCheckout() {
  const { table } = useTableSession();
  const { cartItems, subtotal } = useCart();
  const auth = useBackendAuth();
  const navigate = useNavigate();
  const settings = usePublicSettings();
  const info = useApiResource<TableInfo>(table ? `/tables/${table.token}` : null, { pollIntervalMs: 30000 });
  const [values, setValues] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem('thetable.table-checkout') || '{}'); return { name: typeof saved.name === 'string' ? saved.name : '', email: typeof saved.email === 'string' ? saved.email : '', phone: typeof saved.phone === 'string' ? saved.phone : '', preparationNotes: typeof saved.preparationNotes === 'string' ? saved.preparationNotes : '' }; }
    catch { return { name: '', email: '', phone: '', preparationNotes: '' }; }
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({});
  const [error, setError] = useState('');
  const [smsConsent, setSmsConsent] = useState(() => { try { return JSON.parse(sessionStorage.getItem('thetable.table-checkout') || '{}').smsConsent === true; } catch { return false; } });
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const lock = useRef(false);
  const rate = settings.settings?.taxBasisPoints ?? null;
  const subtotalHalalas = Math.round(subtotal * 100);
  const tax = rate === null ? 0 : Math.round(subtotalHalalas * rate / 10000);
  function update(name: keyof typeof values, value: string) { setValues(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: undefined })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || order || !table) return;
    const phone = normalizeSaudiMobile(values.phone);
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email.';
    if (!phone) next.phone = SAUDI_MOBILE_ERROR;
    setErrors(next); setError('');
    if (Object.keys(next).length) return;
    if (!auth.signedIn) {
      try { sessionStorage.setItem('thetable.table-checkout', JSON.stringify({ ...values, smsConsent })); } catch { /* Optional form recovery. */ }
      navigate('/login?redirect=%2Fcheckout'); return;
    }
    if (!info.result?.data.availability.available || !auth.userId) { setError('Table ordering is unavailable. Refresh availability and try again.'); return; }
    const payload = { smsConsent, fulfillment: 'dine_in', tableToken: table.token, customer: { name: values.name.trim(), email: values.email.trim(), phone }, preparationNotes: values.preparationNotes.trim(), items: cartItems.map(line => ({ menuItemId: line.item.id, quantity: line.quantity, selectedOptions: [] })) };
    try { sessionStorage.setItem('thetable.table-checkout', JSON.stringify({ ...values, smsConsent })); } catch { /* Optional form recovery. */ }
    lock.current = true; setBusy(true);
    try {
      const token = await auth.getToken();
      const key = await checkoutRequestKey(auth.userId, JSON.stringify(payload));
      const result = await apiRequest<OrderRecord>('/orders', { method: 'POST', token, body: payload, headers: { 'Idempotency-Key': key } });
      bindCheckoutOrder(auth.userId, key, result.data._id); setOrder(result.data);
      try { sessionStorage.removeItem('thetable.table-checkout'); } catch { /* Optional storage. */ }
      if (result.data.status === 'pending_payment' && result.data.paymentStatus === 'unpaid') await openStripeCheckout(result.data._id, token);
      else navigate(`/account/orders/${result.data._id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not continue to payment.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <RoutePage title="Good food, right here." description="Order for your dining table. Staff will serve the prepared dishes at your table."><div className="checkout-page">
    {!auth.loaded ? <p role="status">Restoring your bag…</p> : !cartItems.length ? <p>Your bag is empty. <Link to="/menu">Explore the menu</Link></p> : <form className="checkout-page__layout" noValidate onSubmit={event => void submit(event)}>
      <div className="checkout-page__forms"><fieldset className="checkout-page__section"><legend>Your table</legend><h2>{info.result?.data.label || table?.label}</h2><p>Check this label before paying. Ask staff if you are sitting at a different table.</p>{info.loading && <p role="status">Checking table availability…</p>}{info.error && <p role="alert">{info.error}</p>}{info.result && !info.result.data.availability.available && <p role="status">{info.result.data.availability.reasons.join(' ')}</p>}<button type="button" onClick={info.reload}>Refresh table availability</button></fieldset>
      <fieldset className="checkout-page__section"><legend>Your details</legend><div className="checkout-page__fields">{(['name', 'email', 'phone'] as const).map(name => <CheckoutField key={name} name={`table-${name}`} label={name === 'name' ? 'Your name' : name === 'email' ? 'Email' : 'Saudi mobile number'} type={name === 'name' ? 'text' : name === 'email' ? 'email' : 'tel'} value={values[name]} onChange={event => update(name, event.target.value)} error={errors[name]} required autoComplete={name === 'phone' ? 'tel' : name} fixedPrefix={name === 'phone' ? 'Saudi Arabia · +966' : undefined}/>)}<div className="checkout-page__field checkout-page__field--wide"><label htmlFor="table-notes">Kitchen notes (optional)</label><textarea id="table-notes" value={values.preparationNotes} maxLength={1000} onChange={event => update('preparationNotes', event.target.value)}/></div></div></fieldset></div>
      <aside className="checkout-page__summary"><h2>Your table order.</h2><ul className="table-order-items">{cartItems.map(line => <li key={line.item.id}><span>{line.quantity} × {line.item.name}</span><strong>{money(Math.round(line.item.price * 100) * line.quantity)}</strong></li>)}</ul><dl className="checkout-page__totals"><div><dt>Subtotal</dt><dd>{money(subtotalHalalas)}</dd></div><div><dt>Delivery fee</dt><dd>Not applicable · dine-in</dd></div><div><dt>Tax {rate === null ? '(not configured)' : ''}</dt><dd>{money(tax)}</dd></div><div><dt>Estimated total</dt><dd>{money(subtotalHalalas + tax)}</dd></div></dl><Link to="/cart">Edit your bag</Link><p>Payment is verified by Stripe. The cashier must accept the order before the kitchen prepares it. No delivery address is needed.</p><SmsConsent checked={smsConsent} onChange={setSmsConsent}/><button className="checkout-page__primary" disabled={busy || !!order || info.loading || !!info.error || !info.result?.data.availability.available || settings.loading || !!settings.error} type="submit">{busy ? 'Opening secure payment…' : auth.signedIn ? 'Continue to secure payment' : 'Sign in to continue'}</button>{settings.error && <p role="alert">{settings.error} <button type="button" onClick={settings.refresh}>Retry settings</button></p>}{error && <p role="alert">{error}</p>}{order && <div role="status"><p>{order.orderNumber} · {order.paymentStatus}</p><Link to={`/account/orders/${order._id}`}>View saved order</Link>{order.status === 'pending_payment' && order.paymentStatus === 'unpaid' && <PayOrderButton orderId={order._id}/>}</div>}</aside>
    </form>}
  </div></RoutePage>;
}
