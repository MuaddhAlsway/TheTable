import PayOrderButton from "../components/checkout/PayOrderButton";
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import RoutePage from './RoutePage';
import { useBackendAuth } from '../hooks/useBackendAuth';
import { useApiResource } from '../hooks/useApiResource';
import type { OrderRecord, ReservationRecord, Profile } from '../lib/api-types';
import { money, statusLabel } from '../lib/api-types';
import '../styles/Dashboard.css';
import '../styles/CustomerDashboard.css';
const dateTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
function Pagination({ page, pages, loading, label, change }: { page: number; pages: number; loading: boolean; label: string; change: (page: number) => void }) {
  return <nav className="dashboard-pagination" aria-label={label}><button type="button" disabled={loading || page <= 1} onClick={() => change(page - 1)}>Previous</button><span aria-live="polite">Page {page} of {Math.max(1, pages)}</span><button type="button" disabled={loading || page >= pages} onClick={() => change(page + 1)}>Next</button></nav>;
}
export default function CustomerDashboard() {
  const auth = useBackendAuth();
  const [orderPage, setOrderPage] = useState(1);
  const [reservationPage, setReservationPage] = useState(1);
  const profile = useApiResource<Profile>('/users/me');
  const orders = useApiResource<OrderRecord[]>(`/orders?page=${orderPage}&limit=10`);
  const reservations = useApiResource<ReservationRecord[]>(`/reservations?page=${reservationPage}&limit=10`);
  return <RoutePage title="Your place at The Table." description="Your profile, orders, and moments worth gathering for."><div className="dashboard-page customer-account">
    <nav className="dashboard-nav" aria-label="Account navigation"><a href="#account-orders">Your orders</a><a href="#account-reservations">Your reservations</a><Link to="/menu">Explore the menu</Link>{auth.profile?.role === 'admin' && <Link to="/admin">Admin dashboard</Link>}{(auth.profile?.role === 'admin' || auth.profile?.role === 'cashier') && <Link to="/cashier">Cashier desk</Link>}{(auth.profile?.role === 'admin' || auth.profile?.role === 'kitchen') && <Link to="/kitchen">Kitchen display</Link>}<button type="button" onClick={() => void auth.signOut()}>Sign out</button></nav>
    <section className="dashboard-panel customer-account__profile" aria-labelledby="account-profile-title"><h2 id="account-profile-title">Your profile</h2>{profile.loading ? <p role="status">Loading your profile…</p> : profile.error ? <p role="alert">{profile.error} <button type="button" onClick={profile.reload}>Retry profile</button></p> : profile.result && <dl><div><dt>Name</dt><dd>{profile.result.data.name || 'Name not provided'}</dd></div><div><dt>Email</dt><dd>{profile.result.data.email || 'Email not provided'}</dd></div></dl>}</section>
    <section id="account-orders" className="dashboard-panel" aria-labelledby="account-orders-title" aria-busy={orders.loading}><div className="customer-account__heading"><h2 id="account-orders-title">Your orders</h2><button type="button" onClick={orders.reload} disabled={orders.loading}>Refresh orders</button></div>
      {orders.loading ? <p role="status">Loading orders…</p> : orders.error ? <p role="alert">{orders.error} <button type="button" onClick={orders.reload}>Try again</button></p> : orders.result?.data.length ? <ul className="customer-account__orders">{orders.result.data.map(order => <li key={order._id}><article aria-labelledby={`order-${order._id}`}><div className="customer-account__heading"><h3 id={`order-${order._id}`}><Link to={`/account/orders/${order._id}`}>{order.orderNumber}</Link></h3><strong>{money(order.totalHalalas)}</strong></div><time dateTime={order.createdAt}>{dateTime(order.createdAt)} · Saudi time</time><p>{order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'} · Order: <strong>{statusLabel(order.status)}</strong> · Payment: <strong>{statusLabel(order.paymentStatus)}</strong></p><ul className="customer-account__item-preview">{order.items.map((line, index) => <li key={index}>{line.quantity} × {line.name}</li>)}</ul><Link to={`/account/orders/${order._id}`}>View order details and history</Link></article></li>)}</ul> : <div className="customer-account__empty"><p>{orderPage > 1 ? 'No orders on this page.' : 'No saved orders yet. Your shopping bag becomes an order when you submit checkout.'}</p><Link to="/menu">Find your next favorite</Link></div>}
      <Pagination page={orderPage} pages={orders.result?.pagination?.pages || 0} loading={orders.loading} label="Order pages" change={setOrderPage} />
    </section>
    <section id="account-reservations" className="dashboard-panel" aria-labelledby="account-reservations-title" aria-busy={reservations.loading}><div className="customer-account__heading"><h2 id="account-reservations-title">Your reservations</h2><button type="button" onClick={reservations.reload} disabled={reservations.loading}>Refresh reservations</button></div>
      {reservations.loading ? <p role="status">Loading reservations…</p> : reservations.error ? <p role="alert">{reservations.error} <button type="button" onClick={reservations.reload}>Try again</button></p> : reservations.result?.data.length ? <ul className="dashboard-records">{reservations.result.data.map(reservation => <li key={reservation._id}><time dateTime={reservation.dateTime}>{dateTime(reservation.dateTime)} (Saudi time)</time><span>{reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}</span><strong>{statusLabel(reservation.status)}</strong>{reservation.notes && <p>{reservation.notes}</p>}</li>)}</ul> : <div className="customer-account__empty"><p>{reservationPage > 1 ? 'No reservations on this page.' : 'No reservation requests yet.'}</p><Link to="/reservations">Request a table</Link></div>}
      <Pagination page={reservationPage} pages={reservations.result?.pagination?.pages || 0} loading={reservations.loading} label="Reservation pages" change={setReservationPage} />
    </section>
  </div></RoutePage>;
}
export function CustomerOrderDetail() {
  const { id } = useParams();
  const order = useApiResource<OrderRecord>(id ? `/orders/${encodeURIComponent(id)}` : null);
  return <RoutePage title="Your order." description="The latest saved order and payment status."><div className="dashboard-page customer-account"><Link to="/account">Back to your account</Link><button type="button" onClick={order.reload} disabled={order.loading}>Refresh status</button>{order.loading ? <p role="status">Loading order…</p> : order.error ? <p role="alert">{order.error} <button type="button" onClick={order.reload}>Try again</button></p> : order.result && <OrderSummary order={order.result.data} />}</div></RoutePage>;
}
export function OrderSummary({ order }: { order: OrderRecord }) {
  return <section className="dashboard-panel"><h2>{order.orderNumber}</h2><p><time dateTime={order.createdAt}>{dateTime(order.createdAt)}</time> (Saudi time)</p><p>Status: {statusLabel(order.status)} · Payment: {statusLabel(order.paymentStatus)}</p>
    {order.status === 'pending_payment' && <p className="dashboard-notice">Saved pending payment. This is not a paid order or confirmation of restaurant fulfillment. Returning from Stripe alone does not confirm payment.</p>}
    {order.status === 'pending_confirmation' && <p className="dashboard-notice">Waiting for restaurant acceptance. This is not yet an accepted order.</p>}
    {order.status === 'ready_for_delivery' && <p className="dashboard-notice">Preparation is marked ready. This does not mean the order has been dispatched or delivered.</p>}
    {order.status === 'rejected' && <p className="dashboard-notice">The restaurant rejected this request. {order.rejectedReason || ''}</p>}
    {order.readyEstimateMinAt && order.readyEstimateMaxAt && <p>Approximate ready window: {dateTime(order.readyEstimateMinAt)}–{dateTime(order.readyEstimateMaxAt)} (Saudi time). Not guaranteed.</p>}
    {order.paymentStatus === 'unpaid' && order.status === 'pending_payment' && <PayOrderButton orderId={order._id} />}
    <h3>{order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</h3><ul className="dashboard-records">{order.items.map((line, index) => <li key={`${line.menuItemId}-${index}`}><div>{line.quantity} × {line.name}{line.selectedOptions.map(group => <small key={group.name}>{group.name}: {group.options.map(option => option.name).join(', ')}</small>)}</div><strong>{money(line.unitPriceHalalas * line.quantity)}</strong></li>)}</ul>
    <dl className="dashboard-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotalHalalas)}</dd></div>{order.fulfillment === 'delivery' && <div><dt>Delivery fee</dt><dd>{money(order.deliveryFeeHalalas)}</dd></div>}<div><dt>Tax {order.taxBasisPoints === null ? '(not configured)' : ''}</dt><dd>{money(order.taxHalalas)}</dd></div><div><dt>Total</dt><dd>{money(order.totalHalalas)}</dd></div></dl>
    {order.fulfillment === 'delivery' && order.deliveryAddress && <section className="customer-account__fulfillment"><h3>Delivery information</h3><p>{order.deliveryAddress.recipientName} · {order.deliveryAddress.recipientPhone}</p><address>{order.deliveryAddress.street}, {order.deliveryAddress.buildingUnit}, {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}{order.deliveryAddress.postalCode ? ', ' + order.deliveryAddress.postalCode : ''}</address>{order.deliveryAddress.instructions && <p>Instructions: {order.deliveryAddress.instructions}</p>}</section>}
    {order.fulfillment === 'pickup' && <section className="customer-account__fulfillment"><h3>Pickup information</h3>{order.pickupDetails ? <><address>{order.pickupDetails.restaurantAddress}</address><p>{order.pickupDetails.openingHours}</p><p>{order.pickupDetails.collectionInstructions}</p>{order.pickupDetails.preparationTimeMinutes && <p>Approximate preparation: up to {order.pickupDetails.preparationTimeMinutes} minutes after acceptance.</p>}</> : <p>No pickup instructions were saved with this order. Please contact the restaurant.</p>}</section>}
    <h3>Status history</h3>{order.statusHistory.length ? <ol className="customer-account__history">{order.statusHistory.map((entry, index) => <li key={index}><strong>{statusLabel(entry.status)}</strong> · <time dateTime={entry.changedAt}>{dateTime(entry.changedAt)}</time> (Saudi time){entry.reason && <p>{entry.reason}</p>}</li>)}</ol> : <p>No status history is available.</p>}
  </section>;
}
