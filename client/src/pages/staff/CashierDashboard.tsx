import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import RoutePage from '../RoutePage';
import { useStaffQueue } from '../../hooks/useStaffQueue';
import type { StaffOrder } from '../../lib/api-types';
import StaffNav from '../../components/staff/StaffNav';
import QueueConnection from '../../components/staff/QueueConnection';
import StaffOrderCard from '../../components/staff/StaffOrderCard';
import '../../styles/Staff.css';
const statuses = ['pending_payment', 'pending_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery', 'out_for_delivery', 'completed', 'rejected', 'cancelled'];
const blank = { orderNumber: '', date: '', fulfillment: '', paymentStatus: '', status: '' };
export default function CashierDashboard({ admin = false }: { admin?: boolean }) {
  const [draft, setDraft] = useState(blank); const [filters, setFilters] = useState(blank); const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: '20' }); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  const queue = useStaffQueue<StaffOrder[]>(`${admin ? '/admin/orders' : '/staff/orders'}?${params}`);
  const operations = queue.result?.operations;
  function apply(event: FormEvent) { event.preventDefault(); setFilters(draft); setPage(1); }
  return <RoutePage title={admin ? 'Order oversight.' : 'At the front of house.'} description="A web order desk for staff. This is not connected to POS hardware, receipt printers, cash drawers, or payment terminals."><div className="staff-page"><StaffNav />
    <QueueConnection {...queue} onRefresh={queue.refresh} />
    {operations && <div className="staff-notice"><p>Acceptance: {operations.cashierEnabled && operations.kitchenEnabled ? 'workflow enabled; payment and fulfillment checks still apply' : 'paused until cashier/kitchen workflows are configured and enabled'}.</p><p>Pickup handoff: {operations.pickupHandoffEnabled ? 'enabled subject to real restaurant setup' : 'not configured/enabled'}. Delivery dispatch/completion: {operations.deliveryDispatchEnabled && operations.deliveryCompletionEnabled ? 'enabled subject to real delivery setup' : 'not fully configured/enabled'}.</p>{operations.pickupHandoffInstructions && <p>Staff pickup handoff: {operations.pickupHandoffInstructions}</p>}{operations.deliveryProcessNotes && <p>Delivery process: {operations.deliveryProcessNotes}</p>}</div>}
    <form className="staff-filters" onSubmit={apply} aria-label="Filter orders"><label>Order number<input type="search" value={draft.orderNumber} maxLength={60} onChange={e => setDraft(v => ({ ...v, orderNumber: e.target.value }))} /></label><label>Saved date (Saudi time)<input type="date" value={draft.date} onChange={e => setDraft(v => ({ ...v, date: e.target.value }))} /></label><label>Fulfillment<select value={draft.fulfillment} onChange={e => setDraft(v => ({ ...v, fulfillment: e.target.value }))}><option value="">All</option><option value="pickup">Pickup</option><option value="delivery">Delivery</option></select></label><label>Payment state<select value={draft.paymentStatus} onChange={e => setDraft(v => ({ ...v, paymentStatus: e.target.value }))}><option value="">All</option>{['unpaid', 'paid', 'failed', 'refunded'].map(value => <option key={value}>{value}</option>)}</select></label><label>Order status<select value={draft.status} onChange={e => setDraft(v => ({ ...v, status: e.target.value }))}><option value="">All</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><div><button type="submit">Apply filters</button><button type="button" onClick={() => { setDraft(blank); setFilters(blank); setPage(1); }}>Clear filters</button></div></form>
    {queue.initialLoading ? <p role="status">Loading orders…</p> : !queue.result ? <p>No current queue data. Restore the connection and refresh.</p> : queue.result.data.length ? <div className="staff-order-list">{queue.result.data.map(order => <StaffOrderCard key={order._id} order={order} disabled={queue.stale || queue.refreshing} onSaved={queue.refresh} admin={admin} />)}</div> : <p className="staff-empty">No matching orders on this page.</p>}
    <div className="staff-pagination"><button disabled={page <= 1 || queue.refreshing} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · {queue.result?.pagination?.total ?? '—'} matching orders</span><button disabled={queue.refreshing || !queue.result?.pagination || page >= queue.result.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button></div>
  </div></RoutePage>;
}
export function CashierOrderDetail({ admin = false }: { admin?: boolean }) {
  const { id = '' } = useParams(); const queue = useStaffQueue<StaffOrder>(`${admin ? '/admin/orders' : '/staff/orders'}/${encodeURIComponent(id)}`);
  return <RoutePage title="Review this order." description="Only recorded, authorized transitions change the restaurant workflow."><div className="staff-page"><StaffNav /><Link to={admin ? '/admin/orders' : '/cashier'}>Back to the order queue</Link><QueueConnection {...queue} onRefresh={queue.refresh} />{queue.initialLoading ? <p role="status">Loading order…</p> : queue.result ? <StaffOrderCard order={queue.result.data} disabled={queue.stale || queue.refreshing} onSaved={queue.refresh} detail admin={admin} /> : <p>Order details are unavailable. Refresh once the connection is restored.</p>}</div></RoutePage>;
}
