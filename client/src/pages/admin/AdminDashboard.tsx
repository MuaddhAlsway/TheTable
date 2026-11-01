import CashierDashboard, { CashierOrderDetail } from "../staff/CashierDashboard";
import { Link } from 'react-router-dom';
import RoutePage from '../RoutePage';
import { useApiResource } from '../../hooks/useApiResource';
import type { Overview } from '../../lib/api-types';
import { money, statusLabel } from '../../lib/api-types';
import '../../styles/Dashboard.css';
function AdminNav() { return <nav className="dashboard-nav" aria-label="Admin navigation"><Link to="/admin">Overview</Link><Link to="/admin/orders">Orders</Link><Link to="/admin/reservations">Reservations</Link><Link to="/admin/menu">Menu</Link><Link to="/admin/content">Website content</Link><Link to="/admin/sms">SMS notifications</Link><Link to="/admin/tables">Tables & QR codes</Link><Link to="/admin/team">Staff & drivers</Link><Link to="/cashier">Cashier desk</Link><Link to="/kitchen">Kitchen display</Link><Link to="/admin/operations">Operations settings</Link><Link to="/admin/fulfillment">Location & fulfillment</Link><Link to="/account">My account</Link></nav>; }
export default function AdminDashboard() {
  const overview = useApiResource<Overview>('/admin/overview');
  return <RoutePage title="Behind The Table." description="Restaurant operations, from one place."><div className="dashboard-page"><AdminNav />{overview.loading ? <p role="status">Loading overview…</p> : overview.error ? <p role="alert">{overview.error} <button onClick={overview.reload}>Try again</button></p> : overview.result && <><div className="dashboard-stats"><div><span>Orders</span><strong>{overview.result.data.orders}</strong></div><div><span>Reservations</span><strong>{overview.result.data.reservations}</strong></div><div><span>Menu items</span><strong>{overview.result.data.menuItems}</strong></div></div><section className="dashboard-panel"><h2>Recent orders</h2>{overview.result.data.recentOrders.length ? <ul className="dashboard-records">{overview.result.data.recentOrders.map(order => <li key={order._id}><Link to={`/admin/orders/${order._id}`}>{order.orderNumber}</Link><span>{statusLabel(order.status)}</span><strong>{money(order.totalHalalas)}</strong></li>)}</ul> : <p>No orders yet.</p>}</section></>}</div></RoutePage>;
}
export function AdminOrders() { return <CashierDashboard admin />; }
export function AdminOrderDetail() { return <CashierOrderDetail admin />; }
