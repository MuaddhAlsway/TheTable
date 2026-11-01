import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChefHat, Clock3 } from 'lucide-react';
import RoutePage from '../RoutePage';
import { useStaffQueue } from '../../hooks/useStaffQueue';
import type { KitchenOrder } from '../../lib/api-types';
import StaffNav from '../../components/staff/StaffNav';
import QueueConnection from '../../components/staff/QueueConnection';
import OrderActions from '../../components/staff/OrderActions';
import '../../styles/Staff.css';
import '../../styles/StaffDashboard.css';
export default function KitchenDashboard() {
  const [page, setPage] = useState(1); const [filter, setFilter] = useState(''); const [alerts, setAlerts] = useState(true); const [notice, setNotice] = useState('');
  const path = `/kitchen/orders?page=${page}&limit=30${filter ? `&status=${filter}` : ''}`;
  const queue = useStaffQueue<KitchenOrder[]>(path);
  const previous = useRef<{ path: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    if (!queue.result) return;
    const ids = new Set(queue.result.data.map(order => order._id));
    const added = previous.current?.path === path ? [...ids].filter(id => !previous.current!.ids.has(id)).length : 0;
    previous.current = { path, ids };
    if (!added || !alerts) return;
    const timer = setTimeout(() => setNotice(`${added} newly visible accepted ${added === 1 ? 'order' : 'orders'} on this page.`), 0);
    return () => clearTimeout(timer);
  }, [queue.result, path, alerts]);
  const operations = queue.result?.operations;
  const warning = operations?.urgencyWarningMinutes; const critical = operations?.urgencyCriticalMinutes;
  const orders = queue.result?.data || [];
  const columns = [
    { name: 'To prepare', detail: 'Accepted & paid', step: '01', Icon: Clock3, statuses: ['confirmed'] },
    { name: 'Cooking now', detail: 'Preparation in progress', step: '02', Icon: ChefHat, statuses: ['preparing'] },
    { name: 'Ready for handoff', detail: 'Kitchen work finished', step: '03', Icon: CheckCircle2, statuses: ['ready_for_pickup', 'ready_for_table', 'ready_for_delivery'] },
  ];
  return <RoutePage workspace title="Kitchen display." description="Accepted, paid orders. Start cooking, finish preparation, then pass the order to front of house."><div className="staff-page staff-dashboard staff-page--kitchen"><StaffNav /><QueueConnection {...queue} onRefresh={queue.refresh} />
    <div className="staff-workflow-guide"><div><ChefHat size={24} aria-hidden="true" /><strong>Your kitchen workflow</strong></div><ol><li><span>1</span> Start preparation</li><li><span>2</span> Finish preparation</li><li><span>3</span> Cashier completes handoff</li></ol><p>Use <strong>Finish preparation</strong> when the food is ready. The ticket moves to Ready for handoff. Pickup or delivery completion is recorded by cashier staff.</p></div>
    <div className="staff-overview" aria-label="Kitchen counts on the current page">{columns.map(({ name, Icon, statuses }) => <div key={name}><Icon size={22} strokeWidth={1.5} aria-hidden="true" /><span>{name}</span><strong>{queue.result ? orders.filter(order => statuses.includes(order.status)).length : '—'}</strong><small>Current page</small></div>)}</div>
    <div className="staff-toolbar"><label>Show stage<select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="">All accepted stages</option><option value="confirmed">To prepare</option><option value="preparing">Cooking now</option><option value="ready_for_table">Ready to serve at table</option><option value="ready_for_pickup">Ready for pickup handoff</option><option value="ready_for_delivery">Ready for delivery handoff</option></select></label><label className="staff-toggle"><input type="checkbox" checked={alerts} onChange={e => { setAlerts(e.target.checked); setNotice(''); }} /> Visual new-order alerts</label><span className="staff-page-count">{queue.result?.pagination?.total ?? '—'} matching orders · page {page}</span></div>
    <div className="staff-new-alert" role="status" aria-live="polite">{notice}{notice && <button type="button" onClick={() => setNotice('')}>Dismiss</button>}</div>
    {operations && !operations.kitchenEnabled && <p className="staff-notice">Kitchen actions are paused. Ask an administrator to enable the kitchen workflow.</p>}
    {queue.initialLoading ? <p className="staff-empty" role="status">Loading kitchen tickets…</p> : !queue.result ? <p className="staff-empty">Kitchen data is unavailable. Restore the connection and refresh.</p> : <div className="kitchen-columns">{columns.map(({ name, detail, step, Icon, statuses }) => <section className="kitchen-column" key={name} data-stage={step} aria-label={name}><header className="kitchen-column__heading"><div><span>{step} / {detail}</span><h2><Icon size={18} aria-hidden="true" />{name}</h2></div><strong>{orders.filter(order => statuses.includes(order.status)).length}</strong></header>{!orders.some(order => statuses.includes(order.status)) && <div className="kitchen-column__empty"><Icon size={26} strokeWidth={1.1} aria-hidden="true" /><p>{step === '01' ? 'No orders waiting to start.' : step === '02' ? 'Nothing cooking in this view.' : 'Finished orders appear here.'}</p></div>}{orders.filter(order => statuses.includes(order.status)).map(order => {
      const elapsed = order.acceptedAt ? Math.max(0, queue.now - Date.parse(order.acceptedAt)) : null;
      const minutes = elapsed === null ? null : elapsed / 60000;
      const urgency = minutes !== null && critical != null && minutes >= critical ? ' is-critical' : minutes !== null && warning != null && minutes >= warning ? ' is-warning' : '';
      const ready = order.status === 'ready_for_table' || order.status === 'ready_for_pickup' || order.status === 'ready_for_delivery';
      return <article className={`kitchen-ticket${urgency}${ready ? ' is-ready' : ''}`} key={order._id}><header><h3>{order.orderNumber}</h3><span>{order.fulfillment === 'dine_in' ? `Dine-in · ${order.table?.label || 'table'}` : order.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</span></header><p className="kitchen-elapsed"><Clock3 size={14} aria-hidden="true" />{elapsed === null ? 'Acceptance time unavailable' : `${Math.floor(elapsed / 60000)}m ${Math.floor(elapsed / 1000) % 60}s since acceptance`}{urgency && !ready && <strong>{urgency === ' is-critical' ? 'Needs attention' : 'Waiting longer than the configured threshold'}</strong>}</p><ul>{order.items.map((item, index) => <li key={index}><strong><span className="kitchen-ticket__quantity">{item.quantity}</span>{item.name}</strong>{item.selectedOptions.map((group, g) => <small key={g}>{group.name}: {group.options.map(option => option.name).join(', ')}</small>)}</li>)}</ul>{order.readyEstimateMaxAt && <p className="staff-time">Approximate ready by {new Date(order.readyEstimateMaxAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Riyadh' })} · Saudi time</p>}{order.preparationNotes?.trim() && <p className="kitchen-notes"><strong>Kitchen notes</strong><br />{order.preparationNotes}</p>}{ready ? <div className="kitchen-ticket__finished"><CheckCircle2 size={18} aria-hidden="true" /><div><strong>Preparation finished</strong><p>{order.fulfillment === 'dine_in' ? `Serve at ${order.table?.label || 'the recorded table'}. Cashier confirms when served.` : order.fulfillment === 'pickup' ? 'Cashier will confirm customer collection.' : 'Cashier will arrange dispatch and delivery handoff.'}</p></div></div> : <OrderActions order={order} disabled={queue.stale || queue.refreshing} onSaved={queue.refresh} />}</article>;
    })}</section>)}</div>}
    <div className="staff-pagination"><button disabled={page <= 1 || queue.refreshing} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · counts and columns show this page only</span><button disabled={queue.refreshing || !queue.result?.pagination || page >= queue.result.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button></div>
    <p className="staff-time">{warning != null && critical != null ? `Attention thresholds: ${warning} / ${critical} elapsed minutes.` : 'Attention thresholds have not been configured.'} Estimates are approximate. New tickets appear when the queue refreshes.</p>
  </div></RoutePage>;
}
