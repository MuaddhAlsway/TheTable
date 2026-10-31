import { useEffect, useRef, useState } from 'react';
import RoutePage from '../RoutePage';
import { useStaffQueue } from '../../hooks/useStaffQueue';
import type { KitchenOrder } from '../../lib/api-types';
import StaffNav from '../../components/staff/StaffNav';
import QueueConnection from '../../components/staff/QueueConnection';
import OrderActions from '../../components/staff/OrderActions';
import '../../styles/Staff.css';
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
    const timer = setTimeout(() => setNotice(`${added} newly visible accepted ${added === 1 ? 'order' : 'orders'} in this queue. Refreshed at ${new Date().toLocaleTimeString()}.`), 0);
    return () => clearTimeout(timer);
  }, [queue.result, path, alerts]);
  const operations = queue.result?.operations;
  const warning = operations?.urgencyWarningMinutes; const critical = operations?.urgencyCriticalMinutes;
  const columns = [{ name: 'Queued', statuses: ['confirmed'] }, { name: 'Preparing', statuses: ['preparing'] }, { name: 'Ready for handoff', statuses: ['ready_for_pickup', 'ready_for_delivery'] }];
  return <RoutePage title="On the pass." description="Accepted orders only. Preparation actions stay in the kitchen; collection and delivery handoff stay with front-of-house staff."><div className="staff-page staff-page--kitchen"><StaffNav /><QueueConnection {...queue} onRefresh={queue.refresh} />
    <div className="staff-toolbar"><label>Kitchen filter<select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="">All accepted stages</option><option value="confirmed">Queued</option><option value="preparing">Preparing</option><option value="ready_for_pickup">Ready for pickup handoff</option><option value="ready_for_delivery">Ready for delivery handoff</option></select></label><label className="staff-toggle"><input type="checkbox" checked={alerts} onChange={e => { setAlerts(e.target.checked); setNotice(''); }} /> Visual new-order alerts</label></div>
    <div className="staff-new-alert" role="status" aria-live="polite">{notice}{notice && <button type="button" onClick={() => setNotice('')}>Dismiss alert</button>}</div>
    {operations && !operations.kitchenEnabled && <p className="staff-notice">Kitchen actions are paused until an admin enables this operational workflow. Existing records can still be reviewed.</p>}
    <p className="staff-time">{warning != null && critical != null ? `Visual attention thresholds: ${warning} / ${critical} elapsed minutes.` : 'Visual urgency thresholds are not configured.'} These are visual cues, not preparation-time promises. Columns show this page only.</p>
    {queue.initialLoading ? <p role="status">Loading the kitchen queue…</p> : !queue.result ? <p>Kitchen data is unavailable. Restore the connection and refresh.</p> : !queue.result.data.length ? <p className="staff-empty">No accepted orders match this page/filter.</p> : <div className="kitchen-columns">{columns.map(column => <section className="kitchen-column" key={column.name} aria-label={column.name}><h2>{column.name} <span>{queue.result!.data.filter(order => column.statuses.includes(order.status)).length}</span></h2>{queue.result!.data.filter(order => column.statuses.includes(order.status)).map(order => {
      const elapsed = order.acceptedAt ? Math.max(0, queue.now - Date.parse(order.acceptedAt)) : null;
      const minutes = elapsed === null ? null : elapsed / 60000;
      const urgency = minutes !== null && critical != null && minutes >= critical ? ' is-critical' : minutes !== null && warning != null && minutes >= warning ? ' is-warning' : '';
      return <article className={`kitchen-ticket${urgency}`} key={order._id}><header><h3>{order.orderNumber}</h3><span>{order.fulfillment}</span></header><p className="kitchen-elapsed">{elapsed === null ? 'Accepted time not recorded (legacy order)' : `${Math.floor(elapsed / 60000)}m ${Math.floor(elapsed / 1000) % 60}s since acceptance`}{urgency && <strong>{urgency === ' is-critical' ? 'Critical visual threshold' : 'Attention visual threshold'}</strong>}</p>{order.acceptedAt && <p className="staff-time">Accepted {new Date(order.acceptedAt).toLocaleTimeString()}</p>}<ul>{order.items.map((item, index) => <li key={index}><strong>{item.quantity} × {item.name}</strong>{item.selectedOptions.map((group, g) => <small key={g}>{group.name}: {group.options.map(option => option.name).join(', ')}</small>)}</li>)}</ul>{order.readyEstimateMaxAt && <p className="staff-time">Approximate ready by {new Date(order.readyEstimateMaxAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Riyadh" })} (Saudi time); not guaranteed.</p>}<p className="kitchen-notes">Preparation notes: {order.preparationNotes || 'None supplied.'}</p><OrderActions order={order} disabled={queue.stale || queue.refreshing} onSaved={queue.refresh} /></article>;
    })}</section>)}</div>}
    <div className="staff-pagination"><button disabled={page <= 1 || queue.refreshing} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · {queue.result?.pagination?.total ?? '—'} matching accepted orders</span><button disabled={queue.refreshing || !queue.result?.pagination || page >= queue.result.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button></div>
  </div></RoutePage>;
}
