import ReadyEstimate from "./ReadyEstimate";
import { Link } from 'react-router-dom';
import type { StaffOrder } from '../../lib/api-types';
import { money, statusLabel } from '../../lib/api-types';
import OrderActions from './OrderActions';
const showTime = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' }) + ' (Saudi time)';
export default function StaffOrderCard({ order, disabled, onSaved, detail = false, admin = false }: { order: StaffOrder; disabled: boolean; onSaved: () => void; detail?: boolean; admin?: boolean }) {
  const pending = order.status === 'pending_payment' || order.status === 'pending_confirmation';
  return <article className={`staff-order${pending ? ' is-pending' : ''}`}>
    <header><div><p className="staff-eyebrow">{pending ? 'NOT ACCEPTED' : ['rejected', 'cancelled'].includes(order.status) ? 'CLOSED WITHOUT FULFILLMENT' : 'RESTAURANT WORKFLOW'}</p><h2><Link to={`${admin ? '/admin/orders' : '/cashier/orders'}/${order._id}`}>{order.orderNumber}</Link></h2></div><div className="staff-badges"><span>{statusLabel(order.status)}</span><span className={`staff-payment staff-payment--${order.paymentStatus}`}>Payment: {order.paymentStatus}</span><span>{order.fulfillment}</span></div></header>
    <p className="staff-time">Saved to API: {showTime(order.createdAt)}</p>
    {order.acceptedAt ? <p className="staff-time">Accepted: {showTime(order.acceptedAt)}</p> : !pending && !['rejected', 'cancelled'].includes(order.status) && <p className="staff-time">Accepted time not recorded for this legacy order.</p>}
    {pending && <p className="staff-notice">This record is not restaurant acceptance. Acceptance requires verified paid state and configured staff/fulfillment workflows. Staff cannot mark it paid here.</p>}
    <div className="staff-order__details"><section><h3>Customer contact</h3><p>{order.customer?.name || 'Not recorded'}</p>{order.customer?.email && <p><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></p>}{order.customer?.phone && <p><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></p>}</section>
      {order.fulfillment === 'delivery' ? <section><h3>Delivery details</h3>{order.deliveryAddress ? <><p>{order.deliveryAddress.recipientName} · <a href={`tel:${order.deliveryAddress.recipientPhone}`}>{order.deliveryAddress.recipientPhone}</a></p><address>{order.deliveryAddress.street}<br />{order.deliveryAddress.buildingUnit}<br />{order.deliveryAddress.neighborhood}, {order.deliveryAddress.city} {order.deliveryAddress.postalCode}</address><p>Instructions: {order.deliveryAddress.instructions || 'None supplied.'}</p></> : <p>Delivery details were not recorded.</p>}</section> : <section><h3>Pickup details</h3><p className="staff-time">Source: {order.pickupDetailsSource || 'not recorded'}</p><address>{order.pickupDetails?.restaurantAddress || 'Restaurant address requires setup.'}</address><p>{order.pickupDetails?.openingHours || 'Collection hours require setup.'}</p><p>{order.pickupDetails?.collectionInstructions || 'Collection instructions require setup.'}</p></section>}
    </div>
    <ul className="staff-items">{order.items.map((line, index) => <li key={`${line.menuItemId}-${index}`}><div><strong>{line.quantity} × {line.name}</strong>{line.selectedOptions.map((group, g) => <small key={g}>{group.name}: {group.options.map(option => option.name).join(', ')}</small>)}</div><span>{money(line.unitPriceHalalas * line.quantity)}</span></li>)}</ul>
    <p>Kitchen notes: {order.preparationNotes || 'None supplied.'}</p>
    <p className="staff-total">Total <strong>{money(order.totalHalalas)}</strong></p>
    {order.rejectedReason && <p className="staff-error">Rejection reason: {order.rejectedReason}</p>}
    {order.readyEstimateMinAt && order.readyEstimateMaxAt && <p className="staff-notice">Approximate ready window: {showTime(order.readyEstimateMinAt)} – {showTime(order.readyEstimateMaxAt)}. Not guaranteed.</p>}
    {order.canAdjustReadyEstimate && <ReadyEstimate order={order} disabled={disabled} onSaved={onSaved} />}
    <OrderActions order={order} disabled={disabled} onSaved={onSaved} />
    {detail && <details className="staff-audit" open><summary>Status history and audit</summary><ol>{order.statusHistory.map((entry, index) => <li key={entry.actionId || index}><strong>{entry.action === 'create' ? 'Created' : entry.previousStatus ? statusLabel(entry.previousStatus) : 'Previous status not recorded'} → {statusLabel(entry.newStatus || entry.status)}</strong><p>{showTime(entry.changedAt)} · Role: {entry.actorRole || 'not recorded (legacy)'} · {entry.actorRole === 'system' ? 'Verified payment webhook' : `Clerk actor: ${entry.changedBy || 'not recorded'}`}</p>{entry.reason && <p>Reason / note: {entry.reason}</p>}</li>)}</ol></details>}
  </article>;
}
